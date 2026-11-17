export default function AuthorInfoButton({ isDarkMode }) {
  return (
    <div className="fixed right-4 bottom-32 z-20">
      <button
        type="button"
        onClick={() => {}}
        aria-label="作者資訊"
        title="作者資訊"
        className={`flex h-9 w-9 cursor-pointer items-center justify-center border shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95 ${
          isDarkMode
            ? "border-[#dddddd] bg-zinc-950/90 text-[#dddddd] hover:bg-zinc-900"
            : "border-zinc-900 bg-zinc-900 text-white hover:bg-black"
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
