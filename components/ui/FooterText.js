export default function FooterText({ isDarkMode }) {
  return (
    <footer className="pointer-events-none fixed bottom-2.5 left-1/2 -translate-x-1/2 z-10 select-none">
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
