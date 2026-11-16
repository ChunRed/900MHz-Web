export default function HeaderTitle({ isDarkMode }) {
  return (
    <header className="pointer-events-none fixed top-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center select-none">
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
