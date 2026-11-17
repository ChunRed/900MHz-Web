export default function ActiveDigitPointer({
  visible,
  positions,
  activeDigitIndex,
  isDarkMode = true,
}) {
  if (!visible || !positions || !positions[activeDigitIndex]) return null;

  const pos = positions[activeDigitIndex];

  return (
    <div
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      className="pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-full transition-all duration-150 ease-out"
      aria-hidden="true"
    >
      <div className="animate-float-arrow flex flex-col items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`h-8 w-8 transition-colors duration-200 ${
            isDarkMode
              ? "text-white filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)] drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]"
              : "text-zinc-900 filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.3)]"
          }`}
        >
          <path d="M12 21.5a1.2 1.2 0 0 1-.89-.39l-7.2-8A1.2 1.2 0 0 1 4.8 11.2h4.7V3.5a1.2 1.2 0 0 1 1.2-1.2h2.6a1.2 1.2 0 0 1 1.2 1.2v7.7h4.7a1.2 1.2 0 0 1 .89 1.91l-7.2 8a1.2 1.2 0 0 1-.89.39Z" />
        </svg>
      </div>
    </div>
  );
}
