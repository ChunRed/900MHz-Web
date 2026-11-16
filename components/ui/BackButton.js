export default function BackButton({ isFocused, isDarkMode, onBack }) {
  if (!isFocused) return null;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-10">
      <button
        type="button"
        onClick={onBack}
        className={`cursor-pointer rounded-full border px-6 py-2.5 text-sm font-medium shadow-md backdrop-blur-sm transition-all hover:shadow-lg active:scale-95 ${
          isDarkMode
            ? "border-zinc-200 bg-zinc-100 text-zinc-900 hover:bg-white"
            : "border-zinc-300 bg-white/95 text-zinc-800 hover:bg-zinc-100"
        }`}
      >
        Back
      </button>
    </div>
  );
}
