// ============================================================================
// POST /api/send — Vercel 伺服器端安全代理
//   1. 驗證 HTTP Method、Origin 與 8×7 非全零矩陣格式
//   2. 伺服器端 IP 節流防禦（10 秒冷卻 + 每小時上限，配合 Cloudflare WAF 扛 DDoS）
//   3. 向 Cloudflare Turnstile 驗證一次性隱形人機驗證 Token
//   4. 附帶不暴露於瀏覽器的 INTERNAL_API_SECRET 轉發至 AWS EB /internal/client-msg
// ============================================================================

const IP_COOLDOWN_MS = 10 * 1000;
const IP_HOURLY_WINDOW_MS = 60 * 60 * 1000;
const IP_HOURLY_MAX = 30;

const ipBuckets = new Map();

function getClientIp(req) {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) return cfIp.trim();
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function normalizeMatrix(raw) {
  if (!Array.isArray(raw) || raw.length !== 8) return null;
  const matrix = [];
  for (let d = 0; d < 8; d += 1) {
    const row = raw[d];
    if (!Array.isArray(row) || row.length !== 7) return null;
    const parsedRow = [];
    for (let s = 0; s < 7; s += 1) {
      const val = Number.parseInt(row[s], 10);
      if (val !== 0 && val !== 1) return null;
      parsedRow.push(val);
    }
    matrix.push(parsedRow);
  }
  return matrix;
}

function isOriginAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // 同源或伺服器端呼叫

  const host = req.headers.host;
  try {
    const parsedOrigin = new URL(origin);
    if (host && parsedOrigin.host === host) return true;
  } catch {
    return false;
  }

  const allowedList = (process.env.ALLOWED_WEB_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowedList.includes(origin);
}

function checkRateLimit(ip) {
  const now = Date.now();
  let bucket = ipBuckets.get(ip);
  if (!bucket) {
    bucket = { lastSentAt: 0, timestamps: [] };
    ipBuckets.set(ip, bucket);
  }

  // 清除 1 小時前的紀錄
  bucket.timestamps = bucket.timestamps.filter(
    (ts) => now - ts < IP_HOURLY_WINDOW_MS
  );

  if (bucket.lastSentAt > 0 && now - bucket.lastSentAt < IP_COOLDOWN_MS) {
    const waitSec = Math.ceil((IP_COOLDOWN_MS - (now - bucket.lastSentAt)) / 1000);
    return { ok: false, retrySec: waitSec, reason: `請求過於頻繁，請於 ${waitSec} 秒後再試` };
  }

  if (bucket.timestamps.length >= IP_HOURLY_MAX) {
    return { ok: false, retrySec: 60, reason: "此網路位置本小時傳送次數已達上限，請稍後再試" };
  }

  return { ok: true, bucket, now };
}

async function verifyTurnstile(token, ip) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || "";

  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "伺服器尚未設定 Cloudflare Turnstile 密鑰" };
    }
    console.warn("[/api/send] TURNSTILE_SECRET_KEY 未設定（開發模式略過驗證）");
    return { ok: true };
  }

  if (!token || typeof token !== "string") {
    return { ok: false, error: "人機驗證失敗，請重新整理頁面後再試" };
  }

  const body = new URLSearchParams();
  body.append("secret", secretKey);
  body.append("response", token);
  if (ip && ip !== "unknown") {
    body.append("remoteip", ip);
  }

  const verifyRes = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  const result = await verifyRes.json().catch(() => ({}));
  if (!verifyRes.ok || !result.success) {
    console.warn("[/api/send] Turnstile verification failed:", result["error-codes"]);
    return { ok: false, error: "安全驗證未通過，請稍候再試" };
  }

  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  if (!isOriginAllowed(req)) {
    return res.status(403).json({ ok: false, error: "Forbidden origin" });
  }

  const matrix = normalizeMatrix(req.body?.matrix);
  if (!matrix || matrix.every((row) => row.every((v) => v === 0))) {
    return res.status(400).json({ ok: false, error: "請輸入有效的七段顯示器內容" });
  }

  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.ok) {
    res.setHeader("Retry-After", String(rateCheck.retrySec));
    return res.status(429).json({ ok: false, error: rateCheck.reason });
  }

  // 1. Cloudflare Turnstile 隱形人機驗證
  const turnstileCheck = await verifyTurnstile(req.body?.turnstileToken, ip);
  if (!turnstileCheck.ok) {
    return res.status(403).json({ ok: false, error: turnstileCheck.error });
  }

  // 2. 帶著僅存在於 Vercel 伺服器端的密鑰轉發給 AWS EB Server
  const serverBaseUrl = (
    process.env.SERVER_API_URL ||
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    "https://900mhz-server.nosidehere.space"
  ).replace(/\/+$/, "");

  const internalSecret = process.env.INTERNAL_API_SECRET || "";
  if (!internalSecret) {
    return res.status(503).json({
      ok: false,
      error: "伺服器尚未設定 INTERNAL_API_SECRET，無法轉發訊息",
    });
  }

  try {
    const upstreamRes = await fetch(`${serverBaseUrl}/internal/client-msg`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ matrix }),
    });

    const upstreamData = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status >= 500 ? 502 : upstreamRes.status).json({
        ok: false,
        error: upstreamData.error || "後端伺服器拒絕請求",
      });
    }

    // 成功才寫入此 IP 的節流紀錄
    rateCheck.bucket.lastSentAt = rateCheck.now;
    rateCheck.bucket.timestamps.push(rateCheck.now);

    return res.status(200).json({
      ok: true,
      seq: upstreamData.seq,
      timestamp: upstreamData.timestamp,
    });
  } catch (err) {
    console.error("[/api/send] Failed to forward to AWS Server:", err);
    return res.status(502).json({
      ok: false,
      error: "無法連線至訊號伺服器，請稍後再試",
    });
  }
}
