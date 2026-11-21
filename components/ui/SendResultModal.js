import { useEffect } from "react";
import SevenSegmentRow2D from "@/components/ui/SevenSegmentRow2D";

export default function SendResultModal({
  visible,
  segmentMatrix,
  noticeType = "empty",
  cooldownSec = 0,
  isDarkMode,
  onClose,
}) {
  useEffect(() => {
    if (!visible) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  const isEmpty = segmentMatrix.every((digit) =>
    digit.every((seg) => seg === 0)
  );
  const showWarning =
    noticeType === "duplicate" || noticeType === "cooldown" || isEmpty;

  const warningMeta =
    noticeType === "duplicate"
      ? {
          badge: "DUP // 00",
          tag: "DUPLICATE",
          message: "請勿短時間內重複傳送相同內容",
          sub: "PLEASE MODIFY INPUT BEFORE RESENDING",
        }
      : noticeType === "cooldown"
      ? {
          badge: `WAIT // ${String(cooldownSec).padStart(2, "0")}s`,
          tag: "COOLDOWN",
          message: `傳送冷卻中，請於 ${cooldownSec} 秒後再試`,
          sub: "TRANSMISSION COOLDOWN IN PROGRESS",
        }
      : {
          badge: "ERR // 00",
          tag: "EMPTY-BUF",
          message: "請輸入內容再按傳送",
          sub: "PLEASE INPUT DATA BEFORE SENDING",
        };

  return (
    <div
      style={{
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 px-4 animate-[modalFadeIn_240ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-result-title"
      onClick={onClose}
    >
      <style jsx>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes modalCardIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      <div
        className={`relative w-full max-w-md border p-6 shadow-2xl transition-colors animate-[modalCardIn_260ms_cubic-bezier(0.22,1,0.36,1)] ${
          isDarkMode
            ? "border-zinc-700 bg-zinc-950/95 text-zinc-100"
            : "border-zinc-900 bg-zinc-950 text-zinc-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 四角粗線 L 型科技轉角裝飾 */}
        <span className="pointer-events-none absolute -top-0.5 -left-0.5 h-3 w-3 border-t-2 border-l-2 border-[#dddddd]" />
        <span className="pointer-events-none absolute -top-0.5 -right-0.5 h-3 w-3 border-t-2 border-r-2 border-[#dddddd]" />
        <span className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-3 w-3 border-b-2 border-l-2 border-[#dddddd]" />
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-3 w-3 border-b-2 border-r-2 border-[#dddddd]" />

        {showWarning ? (
          <>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="border border-[#ffe196] bg-[#ffe196] px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-900">
                  {warningMeta.badge}
                </span>
                <h2
                  id="send-result-title"
                  className="font-mono text-sm font-semibold tracking-wider text-white"
                >
                  傳送通知
                </h2>
              </div>
              <span className="font-mono text-[10px] tracking-widest text-zinc-500">
                {warningMeta.tag}
              </span>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center border border-dashed border-zinc-700 bg-black/80 px-4 py-6 text-center">
              <p className="font-mono text-sm font-semibold tracking-wider text-[#ffe196]">
                {warningMeta.message}
              </p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                {warningMeta.sub}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* 頂部遙測狀態分格標題列 */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="border border-[#dddddd] bg-[#dddddd] px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-900">
                  TX // 08
                </span>
                <h2
                  id="send-result-title"
                  className="font-mono text-sm font-semibold tracking-wider text-white"
                >
                  已傳送內容
                </h2>
              </div>
              <span className="font-mono text-[10px] tracking-widest text-zinc-500">
                900.0 MHz
              </span>
            </div>

            {/* 八個 2D 小七段顯示器圖示，一字排開（0=0x666666 熄滅，1=#ffe196 點亮） */}
            <div className="mt-4 flex flex-col items-center border border-dashed border-zinc-700 bg-black/90 px-3 py-6">
              <SevenSegmentRow2D
                segmentMatrix={segmentMatrix}
                digitClassName="h-16 w-8 sm:h-20 sm:w-10"
                gapClassName="gap-2 sm:gap-2.5"
              />
            </div>
          </>
        )}

        {/* 底部科技分格關閉按鈕 */}
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="flex cursor-pointer items-stretch overflow-hidden border border-[#dddddd] bg-[#dddddd] text-zinc-900 transition-transform hover:bg-white active:scale-95"
          >
            <span className="flex items-center justify-center border-r border-zinc-400 bg-zinc-900 px-2.5 font-mono text-[10px] font-bold text-[#dddddd]">
              ESC
            </span>
            <span className="px-6 py-1.5 font-mono text-xs font-semibold tracking-wider">
              關閉
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
