const crypto = require('crypto');
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const MAX_HISTORY = 20;
const DEFAULT_CLIENT_MSG_SPEED = 100;

// ============================================================================
// Security Config (Set these in AWS Elastic Beanstalk Environment Properties!)
// ============================================================================
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const TOKEN_SIGNING_KEY =
  process.env.ADMIN_TOKEN_SECRET ||
  crypto
    .createHash('sha256')
    .update(`${INTERNAL_API_SECRET}:${ADMIN_PASSWORD || 'dev-only-fallback'}`)
    .digest('hex');

const ADMIN_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const LOGIN_WINDOW_MS = 5 * 60 * 1000;          // 5 minutes
const LOGIN_MAX_FAILS = 5;

if (!INTERNAL_API_SECRET) {
  console.warn('[SECURITY WARNING] INTERNAL_API_SECRET is not set! /internal/client-msg will reject requests until configured.');
}
if (!ADMIN_PASSWORD) {
  console.warn('[SECURITY WARNING] ADMIN_PASSWORD is not set! /esp32 admin login will reject requests until configured.');
}

// Track failed admin login attempts per IP (brute-force protection)
const loginAttempts = new Map();

function getClientIp(req) {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createAdminToken() {
  const exp = Date.now() + ADMIN_TOKEN_TTL_MS;
  const payload = String(exp);
  const sig = crypto
    .createHmac('sha256', TOKEN_SIGNING_KEY)
    .update(payload)
    .digest('hex');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token) {
  if (!ADMIN_PASSWORD || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SIGNING_KEY)
    .update(expStr)
    .digest('hex');
  return timingSafeEqualStr(sig, expectedSig);
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

function normalizeMatrix(raw) {
  if (!Array.isArray(raw) || raw.length !== 8) {
    return null;
  }
  const matrix = [];
  for (let d = 0; d < 8; d += 1) {
    const row = raw[d];
    if (!Array.isArray(row) || row.length !== 7) {
      return null;
    }
    const parsedRow = [];
    for (let s = 0; s < 7; s += 1) {
      const val = Number.parseInt(row[s], 10);
      if (val !== 0 && val !== 1) {
        return null;
      }
      parsedRow.push(val);
    }
    matrix.push(parsedRow);
  }
  return matrix;
}

function isMatrixEmpty(matrix) {
  return matrix.every((row) => row.every((v) => v === 0));
}

let seqCounter = 0;
const history = [];
let currentEsp32State = null; // Format: [mode (0..3), value (8x7 matrix), speed (0..255)]

function dispatchAudienceMatrix(matrix, sourceLabel) {
  const timestamp = new Date().toISOString();
  seqCounter += 1;

  console.log(`[client_msg] #${seqCounter} (${timestamp}) via ${sourceLabel}:`);
  console.log(JSON.stringify(matrix));

  const record = {
    seq: seqCounter,
    timestamp,
    data: matrix
  };

  history.unshift(record);
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }

  // 1. Broadcast original 8x7 matrix to read-only viewers & other phones
  io.emit('client_msg', record.data);

  // 2. Transform into [mode=0, 8x7 matrix, speed=100] and emit on 'esp32-msg' for ESP32
  const esp32Payload = [0, record.data, DEFAULT_CLIENT_MSG_SPEED];
  currentEsp32State = esp32Payload;
  console.log(`[esp32-msg] (from client_msg #${seqCounter}) mode=0, speed=${DEFAULT_CLIENT_MSG_SPEED}`);
  io.emit('esp32-msg', esp32Payload);

  return record;
}

// Express middleware (small JSON limit + CORS for admin console endpoint switcher)
app.use(express.json({ limit: '16kb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-internal-secret');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/esp32', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'esp32.html'));
});

// ============================================================================
// Admin Auth API (Protects /esp32 Console & Socket.IO Admin Writes)
// ============================================================================
app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) {
    res.status(503).json({ ok: false, error: 'Server ADMIN_PASSWORD is not configured.' });
    return;
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (entry && now - entry.firstFailAt < LOGIN_WINDOW_MS && entry.count >= LOGIN_MAX_FAILS) {
    const retrySec = Math.ceil((LOGIN_WINDOW_MS - (now - entry.firstFailAt)) / 1000);
    res.status(429).json({
      ok: false,
      error: `嘗試次數過多，請於 ${retrySec} 秒後再試`
    });
    return;
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!timingSafeEqualStr(password, ADMIN_PASSWORD)) {
    if (!entry || now - entry.firstFailAt >= LOGIN_WINDOW_MS) {
      loginAttempts.set(ip, { count: 1, firstFailAt: now });
    } else {
      entry.count += 1;
    }
    res.status(401).json({ ok: false, error: '管理員密碼錯誤' });
    return;
  }

  loginAttempts.delete(ip);
  const token = createAdminToken();
  res.json({ ok: true, token, expiresInMs: ADMIN_TOKEN_TTL_MS });
});

app.get('/api/admin/verify', (req, res) => {
  const token = extractBearerToken(req);
  if (!verifyAdminToken(token)) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }
  res.json({ ok: true });
});

// ============================================================================
// Internal API: Exclusively called by Vercel Next.js POST /api/send
// ============================================================================
app.post('/internal/client-msg', (req, res) => {
  if (!INTERNAL_API_SECRET) {
    res.status(503).json({ ok: false, error: 'Server INTERNAL_API_SECRET is not configured.' });
    return;
  }

  const providedSecret = req.headers['x-internal-secret'];
  if (!timingSafeEqualStr(String(providedSecret || ''), INTERNAL_API_SECRET)) {
    console.warn(`[SECURITY] Rejected unauthorized /internal/client-msg from ${getClientIp(req)}`);
    res.status(403).json({ ok: false, error: 'Forbidden' });
    return;
  }

  const matrix = normalizeMatrix(req.body?.matrix);
  if (!matrix || isMatrixEmpty(matrix)) {
    res.status(400).json({ ok: false, error: 'Invalid or empty 8x7 matrix' });
    return;
  }

  const record = dispatchAudienceMatrix(matrix, 'vercel-internal-api');
  res.json({ ok: true, seq: record.seq, timestamp: record.timestamp });
});

// ============================================================================
// Socket.IO: Read-Only for Public/ESP32; Writes Strictly Require Admin Token
// ============================================================================
io.on('connection', (socket) => {
  const isAdmin = verifyAdminToken(socket.handshake.auth?.adminToken);
  console.log(`[Socket.IO] Client connected: ${socket.id} (${isAdmin ? 'ADMIN' : 'READ-ONLY'})`);

  socket.emit('history_init', history);

  if (currentEsp32State !== null) {
    socket.emit('esp32_state_init', currentEsp32State);
  }

  // External direct client_msg writes are CLOSED (must go through Vercel /api/send or Admin auth)
  const handleDirectClientMsg = (data) => {
    if (!isAdmin) {
      console.warn(`[SECURITY] Blocked unauthenticated direct Socket.IO client_msg from ${socket.id}`);
      socket.emit('auth_error', { error: 'Direct Socket.IO writes are disabled.' });
      return;
    }
    const matrix = normalizeMatrix(data);
    if (!matrix || isMatrixEmpty(matrix)) return;
    dispatchAudienceMatrix(matrix, `admin-socket:${socket.id}`);
  };

  socket.on('client_msg', handleDirectClientMsg);
  socket.on('client-msg', handleDirectClientMsg);

  // Admin-only 'esp32-msg' control: [mode (0..3), value (8x7 array), speed (0..255)]
  socket.on('esp32-msg', (payload) => {
    if (!isAdmin) {
      console.warn(`[SECURITY] Blocked unauthenticated esp32-msg from ${socket.id}`);
      socket.emit('auth_error', { error: 'Admin authentication required for esp32-msg.' });
      return;
    }

    if (!Array.isArray(payload) || payload.length !== 3) {
      console.warn(`[esp32-msg] Invalid payload format from ${socket.id}:`, payload);
      return;
    }

    const mode = Number.parseInt(payload[0], 10);
    const matrix = normalizeMatrix(payload[1]);
    const speed = Number.parseInt(payload[2], 10);

    if (!Number.isInteger(mode) || mode < 0 || mode > 3) {
      console.warn(`[esp32-msg] Invalid mode from ${socket.id}:`, payload[0]);
      return;
    }
    if (!matrix) {
      console.warn(`[esp32-msg] Invalid 8x7 matrix from ${socket.id}`);
      return;
    }
    if (!Number.isInteger(speed) || speed < 0 || speed > 255) {
      console.warn(`[esp32-msg] Invalid speed from ${socket.id}:`, payload[2]);
      return;
    }

    const timestamp = new Date().toISOString();
    const normalizedPayload = [mode, matrix, speed];
    currentEsp32State = normalizedPayload;

    console.log(`[esp32-msg] (${timestamp}) from ADMIN ${socket.id}: mode=${mode}, speed=${speed}`);
    io.emit('esp32-msg', normalizedPayload);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`900MHz Server listening on http://localhost:${PORT}`);
});
