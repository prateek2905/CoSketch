export function CanvasPreview() {
  return (
    <div className="relative h-72 w-full overflow-hidden bg-[radial-gradient(var(--color-zinc-300)_1px,transparent_1px)] [background-size:22px_22px] sm:h-[26rem] dark:bg-[radial-gradient(var(--color-zinc-800)_1px,transparent_1px)]">
      {/* sticky note */}
      <div className="absolute top-[16%] left-[8%] w-36 -rotate-6 rounded-lg border-2 border-amber-300 bg-amber-100 p-3 shadow-md dark:border-amber-500/40 dark:bg-amber-500/10">
        <p className="font-mono text-xs text-amber-900 dark:text-amber-200">brainstorm ideas</p>
      </div>

      {/* rectangle frame */}
      <div className="absolute top-[12%] right-[10%] h-28 w-44 rotate-2 rounded-md border-2 border-indigo-400 dark:border-indigo-500" />

      {/* circle */}
      <div className="absolute bottom-[20%] left-[22%] h-24 w-24 -rotate-3 rounded-full border-2 border-emerald-400 dark:border-emerald-500" />

      {/* connecting lines */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 300"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M150 90 C 220 60, 260 120, 300 100"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinecap="round"
          markerEnd="url(#arrowhead)"
        />
        <path
          d="M70 220 C 120 200, 160 250, 220 215 S 300 190, 340 230"
          stroke="#a1a1aa"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="1 6"
        />
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill="#6366f1" />
          </marker>
        </defs>
      </svg>

      {/* collaborator cursors */}
      <div className="absolute right-[18%] bottom-[28%] flex items-center gap-1.5 rounded-full bg-pink-500 px-2 py-1 text-xs font-medium text-white shadow">
        <span className="h-2 w-2 rounded-full bg-white" />
        Aditi
      </div>
      <div className="absolute top-[58%] left-[42%] flex items-center gap-1.5 rounded-full bg-sky-500 px-2 py-1 text-xs font-medium text-white shadow">
        <span className="h-2 w-2 rounded-full bg-white" />
        Rahul
      </div>
    </div>
  );
}
