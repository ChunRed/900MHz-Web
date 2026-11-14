export default function HeaderTitle({ activeSegment }) {
  return (
    <header className="pointer-events-none fixed top-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 select-none">
      <h1 className="font-sans text-3xl font-extralight tracking-[0.25em] text-zinc-800">
        900MHz
      </h1>

      {activeSegment && (
        <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white/95 px-4 py-1.5 font-mono text-xs text-zinc-700 shadow-sm backdrop-blur-sm">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white">
            {activeSegment.id}
          </span>
          <span>
            段位:{" "}
            <strong className="text-zinc-900">
              {activeSegment.code} 段 — {activeSegment.label}
            </strong>
          </span>
          <span className="text-zinc-400">({activeSegment.meshName})</span>
        </div>
      )}
    </header>
  );
}

