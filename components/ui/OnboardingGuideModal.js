import { useEffect, useRef, useState } from "react";

export default function OnboardingGuideModal({
  visible,
  isDarkMode,
  onClose,
}) {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  const handleConfirm = () => {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm transition-opacity duration-600 ease-out ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-guide-title"
    >
      <div
        style={{
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`relative w-full max-w-md origin-center border p-6 shadow-2xl transition-all duration-600 ${
          isDarkMode
            ? "border-zinc-700 bg-zinc-950/95 text-zinc-100"
            : "border-zinc-900 bg-zinc-950 text-zinc-100"
        } ${
          isClosing
            ? "scale-x-105 scale-y-[0.02] opacity-0"
            : "scale-x-100 scale-y-100 opacity-100"
        }`}
      >
        {/* 四角粗線 L 型科技轉角裝飾 */}
        <span className="pointer-events-none absolute -top-0.5 -left-0.5 h-3 w-3 border-t-2 border-l-2 border-[#dddddd]" />
        <span className="pointer-events-none absolute -top-0.5 -right-0.5 h-3 w-3 border-t-2 border-r-2 border-[#dddddd]" />
        <span className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-3 w-3 border-b-2 border-l-2 border-[#dddddd]" />
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-3 w-3 border-b-2 border-r-2 border-[#dddddd]" />

        {/* 頂部工程遙測標題列 */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="border border-[#dddddd] bg-[#dddddd] px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-900">
              GUIDE // 00
            </span>
            <h2
              id="onboarding-guide-title"
              className="font-mono text-sm font-semibold tracking-wider text-white"
            >
              操作說明
            </h2>
          </div>
          <span className="font-mono text-[10px] tracking-widest text-zinc-500">
            INIT-SEQ
          </span>
        </div>

        {/* 說明主區域（先保持留白結構，僅置入核心流程提示） */}
        <div className="mt-4 flex min-h-32 flex-col items-center justify-center border border-dashed border-zinc-700 bg-black/80 px-4 py-8 text-center">
          <p className="font-mono text-sm font-semibold tracking-wider text-[#dddddd]">
            點擊數字→輸入內容→按下送出
          </p>
        </div>

        {/* 底部確認關閉按鈕 */}
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex cursor-pointer items-stretch overflow-hidden border border-[#dddddd] bg-[#dddddd] text-zinc-900 transition-transform hover:bg-white active:scale-95"
          >
            <span className="flex items-center justify-center border-r border-zinc-400 bg-zinc-900 px-2.5 font-mono text-[10px] font-bold text-[#dddddd]">
              OK
            </span>
            <span className="px-6 py-1.5 font-mono text-xs font-semibold tracking-wider">
              確認
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
