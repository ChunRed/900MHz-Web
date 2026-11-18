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
      setIsClosing(false);
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

        {/* 說明主區域：三步驟導引與右側圖示 */}
        <div className="mt-4 space-y-2.5 border border-dashed border-zinc-700 bg-black/80 px-4 py-4">
          {/* 步驟 1 */}
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-[#dddddd]">
              <span className="border border-zinc-600 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                ▲ 1
              </span>
              <span>點擊播報器進入輸入頁面</span>
            </div>
            {/* 播放器聽筒造型圖示 */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-zinc-700 bg-zinc-900/80 text-[#ffe196]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
          </div>

          {/* 步驟 2 */}
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-[#dddddd]">
              <span className="border border-zinc-600 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                ▲ 2
              </span>
              <span>按壓七段顯示器輸入訊息</span>
            </div>
            {/* 七段顯示器圖示 */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-zinc-700 bg-zinc-900/80 text-[#ffe196]">
              <svg
                width="14"
                height="18"
                viewBox="0 0 14 22"
                fill="currentColor"
                aria-hidden="true"
              >
                <polygon points="3,1 11,1 10,3 4,3" />
                <polygon points="1,2 3,3 3,10 1,11" />
                <polygon points="13,2 13,11 11,10 11,3" />
                <polygon points="3,10.5 11,10.5 10,12 4,12" opacity="0.3" />
                <polygon points="1,11.5 3,12.5 3,19 1,20" />
                <polygon points="13,11.5 13,20 11,19 11,12.5" />
                <polygon points="3,21 11,21 10,19 4,19" />
              </svg>
            </div>
          </div>

          {/* 步驟 3 */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-[#dddddd]">
              <span className="border border-zinc-600 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                ▲ 3
              </span>
              <span>按壓傳送鈕送出訊息</span>
            </div>
            {/* 傳送按鈕圖示 */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-zinc-700 bg-zinc-900/80 text-[#ffe196]">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </div>
          </div>
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
