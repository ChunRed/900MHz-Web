export default function ThemeToggleButton({ isDarkMode, onToggle }) {
  return (
    <div className="fixed top-4 left-4 z-20">
      <button
        type="button"
        onClick={onToggle}
        aria-label={isDarkMode ? "切換至日間模式" : "切換至夜間模式"}
        title={isDarkMode ? "切換至日間模式" : "切換至夜間模式"}
        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-all active:scale-95 ${
          isDarkMode
            ? "border-zinc-700/80 bg-zinc-900/85 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            : "border-zinc-800 bg-zinc-900 text-white hover:bg-black"
        }`}
      >
        {isDarkMode ? (
          /* 太陽圖示（點擊切回日間模式） */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        ) : (
          /* 月亮圖示（點擊切換夜間模式） */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
