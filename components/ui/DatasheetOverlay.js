export default function DatasheetOverlay({
  opacity = 0,
  box,
  isDarkMode = true,
  onOpenGuide,
}) {
  if (opacity <= 0.01 || !box || box.width < 20 || box.height < 20) return null;

  return (
    <section
      style={{
        opacity,
        left: `${box.x}px`,
        top: `${box.y}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
      }}
      className={`fixed z-25 overflow-y-auto px-5 py-4 pointer-events-auto transition-colors duration-300 ${
        isDarkMode ? "text-zinc-100" : "text-zinc-900"
      }`}
      aria-label="資訊 | information"
    >
      {/* 標題列 */}
      <div
        className={`flex items-center justify-between border-b pb-3 mb-4 ${
          isDarkMode ? "border-zinc-800" : "border-zinc-300"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold tracking-wider ${
              isDarkMode ? "bg-white text-black" : "bg-black text-white"
            }`}
          >
            INFO
          </span>
          <h2 className="text-sm sm:text-base font-mono tracking-[0.2em] uppercase">
            資訊 | information
          </h2>
        </div>
        <span className="text-[10px] font-mono tracking-widest text-zinc-500">
          900MHz
        </span>
      </div>

      {/* 內容區塊 */}
      <div className="space-y-3.5 font-mono text-xs leading-relaxed">
        {/* 創作團隊 + 預留 Logo 空間 */}
        <div
          className={`border p-3.5 flex items-center justify-between gap-4 ${
            isDarkMode
              ? "border-zinc-800/80 bg-zinc-950/60"
              : "border-zinc-300 bg-zinc-50/80"
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            {/* No Side Here Logo */}
            <div
              className={`w-12 h-12 shrink-0 border p-1.5 flex items-center justify-center ${
                isDarkMode
                  ? "border-zinc-700 bg-black/60"
                  : "border-zinc-400 bg-white"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/no-side-here-logo.png"
                alt="No Side Here Logo"
                className={`w-full h-full object-contain ${
                  isDarkMode ? "" : "invert"
                }`}
              />
            </div>
            <div className="min-w-0">
              <div
                className={`text-[10px] tracking-[0.2em] uppercase ${
                  isDarkMode ? "text-zinc-400" : "text-zinc-500"
                }`}
              >
                創作團隊 // CREATOR
              </div>
              <div className="mt-1 text-sm font-semibold tracking-wider truncate">
                No Side Here
              </div>
            </div>
          </div>

          {/* IG 超連結 Icon */}
          <a
            href="https://www.instagram.com/no.side.here?avpt=MWtjank1NTFuZ2Fu"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="No Side Here Instagram"
            title="Instagram @no.side.here"
            className={`w-9 h-9 shrink-0 border flex items-center justify-center transition-colors ${
              isDarkMode
                ? "border-zinc-700 text-zinc-200 hover:bg-white hover:text-black hover:border-white"
                : "border-zinc-400 text-zinc-800 hover:bg-black hover:text-white hover:border-black"
            }`}
          >
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
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>
        </div>

        {/* 操作說明：按鈕開啟一開始進入網頁的操作說明 */}
        <div
          className={`border p-3.5 flex items-center justify-between gap-3 ${
            isDarkMode
              ? "border-zinc-800/80 bg-zinc-950/40"
              : "border-zinc-300 bg-zinc-50/60"
          }`}
        >
          <div>
            <div
              className={`text-[10px] tracking-[0.2em] uppercase ${
                isDarkMode ? "text-zinc-400" : "text-zinc-500"
              }`}
            >
              操作說明 // MANUAL
            </div>
            <div
              className={`mt-1 text-[11px] ${
                isDarkMode ? "text-zinc-300" : "text-zinc-700"
              }`}
            >
              重新檢視網頁操作導引視窗
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenGuide?.()}
            className={`px-3 py-1.5 border text-[11px] tracking-[0.15em] uppercase transition-colors cursor-pointer shrink-0 ${
              isDarkMode
                ? "border-zinc-600 bg-zinc-900 text-zinc-100 hover:bg-white hover:text-black hover:border-white"
                : "border-zinc-500 bg-white text-zinc-900 hover:bg-black hover:text-white hover:border-black"
            }`}
          >
            開啟說明
          </button>
        </div>
      </div>
    </section>
  );
}
