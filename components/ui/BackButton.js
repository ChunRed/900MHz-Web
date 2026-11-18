export default function BackButton({
  isFocused,
  isDatasheetButtonBack = false,
  isDatasheetView = false,
  isTransitioning = false,
  isDarkMode,
  onBack,
  onSend,
}) {
  const showBack = isFocused || isDatasheetButtonBack;
  const handleClick = () => {
    if (isTransitioning) return;
    if (showBack) {
      onBack?.();
    } else {
      onSend?.();
    }
  };

  const useLightButton = isDarkMode || isDatasheetView;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-30">
      <button
        type="button"
        onClick={handleClick}
        disabled={isTransitioning}
        aria-label={showBack ? "返回主畫面 (Back)" : "傳送七段顯示器內容 (Send)"}
        className={`group flex items-stretch overflow-hidden border shadow-md backdrop-blur-sm transition-all duration-200 ${
          isTransitioning
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95"
        } ${
          useLightButton
            ? "border-[#dddddd] bg-[#dddddd] text-zinc-900"
            : "border-zinc-900 bg-zinc-900 text-white"
        }`}
      >
        {/* 左側科技代碼反相格 */}
        <span
          className={`flex items-center justify-center gap-1.5 border-r px-2.5 font-mono text-[10px] font-bold tracking-tighter transition-all duration-200 ${
            useLightButton
              ? "border-zinc-400 bg-zinc-900 text-[#dddddd]"
              : "border-zinc-700 bg-[#dddddd] text-zinc-900"
          }`}
        >
          {showBack ? (
            "◄"
          ) : (
            <>
              <span>▲03</span>
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </>
          )}
        </span>

        {/* 右側按鈕主文字 */}
        <span className="flex items-center justify-center whitespace-nowrap px-5 py-2 font-mono text-xs font-semibold tracking-wider">
          {showBack ? "Back 返回" : "Send 傳送"}
        </span>
      </button>
    </div>
  );
}
