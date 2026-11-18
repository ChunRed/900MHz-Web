export default function FooterText({ isDarkMode, hudOpacity = 1 }) {
  return (
    <footer
      style={{ opacity: hudOpacity }}
      className="pointer-events-none fixed bottom-2.5 left-1/2 -translate-x-1/2 z-10 select-none"
      aria-hidden={hudOpacity <= 0.01}
    >
      <p
        className={`font-sans text-xs font-light tracking-wider transition-colors duration-300 ${
          isDarkMode ? "text-zinc-500" : "text-zinc-400"
        }`}
      >
        @No Side Here
      </p>
    </footer>
  );
}
