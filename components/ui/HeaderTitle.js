export default function HeaderTitle({ isDarkMode, hudOpacity = 1 }) {
  return (
    <header
      style={{ opacity: hudOpacity }}
      className="pointer-events-none fixed top-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center select-none"
      aria-hidden={hudOpacity <= 0.01}
    >
      <h1
        className={`font-sans text-3xl font-extralight tracking-[0.25em] transition-colors duration-300 ${
          isDarkMode ? "text-zinc-200" : "text-zinc-800"
        }`}
      >
        900MHz
      </h1>
    </header>
  );
}
