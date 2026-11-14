export default function BackButton({ isFocused, onBack }) {
  if (!isFocused) return null;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-10">
      <button
        type="button"
        onClick={onBack}
        className="cursor-pointer rounded-full border border-zinc-300 bg-white/95 px-6 py-2.5 text-sm font-medium text-zinc-800 shadow-md backdrop-blur-sm transition-all hover:bg-zinc-100 hover:shadow-lg active:scale-95"
      >
        Back
      </button>
    </div>
  );
}

