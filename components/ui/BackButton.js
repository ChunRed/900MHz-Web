export default function BackButton({
  isFocused,
  isDarkMode,
  onBack,
  onSend,
}) {
  const handleClick = isFocused ? onBack : onSend;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-20">
      <button
        type="button"
        onClick={handleClick}
        aria-label={isFocused ? "返回初始視角 (Back)" : "傳送七段顯示器內容 (Send)"}
        className={`group flex items-stretch overflow-hidden border shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer ${
          isDarkMode
            ? "border-[#dddddd] bg-[#dddddd] text-zinc-900"
            : "border-zinc-900 bg-zinc-900 text-white"
        }`}
      >
        {/* 左側科技代碼反相格 */}
        <span
          className={`flex items-center justify-center border-r px-2.5 font-mono text-[10px] font-bold tracking-tighter ${
            isDarkMode
              ? "border-zinc-400 bg-zinc-900 text-[#dddddd]"
              : "border-zinc-700 bg-[#dddddd] text-zinc-900"
          }`}
        >
          {isFocused ? "◄RTN" : "►TX"}
        </span>

        {/* 右側按鈕主文字 */}
        <span className="flex items-center justify-center px-5 py-2 font-mono text-xs font-semibold tracking-wider">
          {isFocused ? "Back 返回" : "Send 傳送"}
        </span>
      </button>
    </div>
  );
}
