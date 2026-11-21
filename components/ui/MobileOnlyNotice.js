export default function MobileOnlyNotice() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-6 text-zinc-100 select-none"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mobile-only-title"
    >
      {/* 頂部作品名稱 */}
      <div className="mb-8 font-sans text-3xl font-extralight tracking-[0.25em] text-zinc-200">
        900MHz
      </div>

      {/* 工程遙測風格通知卡片 */}
      <div className="relative w-full max-w-md border border-zinc-700 bg-zinc-950/95 p-6 shadow-2xl">
        {/* 四角粗線 L 型科技轉角裝飾 */}
        <span className="pointer-events-none absolute -top-0.5 -left-0.5 h-3 w-3 border-t-2 border-l-2 border-[#dddddd]" />
        <span className="pointer-events-none absolute -top-0.5 -right-0.5 h-3 w-3 border-t-2 border-r-2 border-[#dddddd]" />
        <span className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-3 w-3 border-b-2 border-l-2 border-[#dddddd]" />
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-3 w-3 border-b-2 border-r-2 border-[#dddddd]" />

        {/* 標題列 */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="border border-[#ffe196] bg-[#ffe196] px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-900">
              SYS // 00
            </span>
            <h1
              id="mobile-only-title"
              className="font-mono text-sm font-semibold tracking-wider text-white"
            >
              裝置限制通知
            </h1>
          </div>
          <span className="font-mono text-[10px] tracking-widest text-zinc-500">
            MOBILE ONLY
          </span>
        </div>

        {/* 內容區 */}
        <div className="mt-4 flex flex-col items-center border border-dashed border-zinc-700 bg-black/80 px-5 py-7 text-center">
          {/* 手機圖示 */}
          <div className="mb-4 flex h-12 w-12 items-center justify-center border border-zinc-700 bg-zinc-900/80 text-[#ffe196]">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>

          <p className="font-mono text-sm font-semibold tracking-wider text-[#ffe196]">
            請改以手機開啟此網頁
          </p>
          <p className="mt-2 font-mono text-xs leading-relaxed text-zinc-400">
            此互動介面僅支援手機載體瀏覽，請使用行動電話開啟以進行操作。
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            PLEASE OPEN THIS PAGE ON A MOBILE PHONE
          </p>
        </div>
      </div>

      {/* 底部署名 */}
      <p className="mt-8 font-sans text-xs font-light tracking-wider text-zinc-500">
        @No Side Here
      </p>
    </div>
  );
}
