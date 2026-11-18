export default function AuthorInfoButton({
  isDarkMode,
  onClick,
  disabled = false,
  hudOpacity = 1,
}) {
  const isHidden = hudOpacity <= 0.01;

  return (
    <div
      style={{ opacity: hudOpacity }}
      className={`fixed right-4 bottom-32 z-20 ${
        isHidden ? "pointer-events-none" : ""
      }`}
      aria-hidden={isHidden}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isHidden}
        aria-label="資訊 | information"
        title="資訊 | information"
        className={`flex h-9 w-9 items-center justify-center border border-black bg-white text-black shadow-md transition-all duration-200 ${
          disabled || isHidden
            ? "cursor-default"
            : "cursor-pointer hover:scale-105 hover:bg-zinc-100 active:scale-95"
        }`}
      >
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
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
    </div>
  );
}
