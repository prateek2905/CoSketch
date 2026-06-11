export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white ${className}`}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="28" height="28" rx="7" className="fill-indigo-600" />
        <path
          d="M8 18.5 17.5 9c.6-.6 1.6-.6 2.2 0s.6 1.6 0 2.2L10.2 20.7l-3 .8.8-3Z"
          fill="white"
        />
      </svg>
      CoSketch
    </span>
  );
}
