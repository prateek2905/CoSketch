"use client";

import type { StyleOptions } from "@/lib/canvas/types";

const STROKE_COLORS = ["#1e1e1e", "#ffffff", "#e03131", "#2f9e44", "#1971c2", "#f08c00"];
const STROKE_WIDTHS = [1, 2, 4];

interface StylePanelProps {
  style: StyleOptions;
  onStyleChange: (style: StyleOptions) => void;
  hasSelection: boolean;
  onDeleteSelected: () => void;
}

export function StylePanel({ style, onStyleChange, hasSelection, onDeleteSelected }: StylePanelProps) {
  return (
    <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95">
      <div>
        <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">Stroke</p>
        <div className="flex items-center gap-1.5">
          {STROKE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Stroke color ${color}`}
              aria-pressed={style.strokeColor === color}
              onClick={() => onStyleChange({ ...style, strokeColor: color })}
              className={`h-6 w-6 rounded-full border transition-transform ${
                style.strokeColor === color
                  ? "scale-110 border-indigo-500 ring-2 ring-indigo-500/30"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">Stroke width</p>
        <div className="flex items-center gap-1.5">
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width}
              type="button"
              aria-label={`Stroke width ${width}`}
              aria-pressed={style.strokeWidth === width}
              onClick={() => onStyleChange({ ...style, strokeWidth: width })}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                style.strokeWidth === width
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="block w-4 rounded-full bg-current" style={{ height: width }} />
            </button>
          ))}
        </div>
      </div>

      {hasSelection && (
        <button
          type="button"
          onClick={onDeleteSelected}
          className="rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          Delete selected
        </button>
      )}
    </div>
  );
}
