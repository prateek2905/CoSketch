"use client";

import type { ComponentType, SVGProps } from "react";
import type { Tool } from "@/lib/canvas/types";
import {
  ArrowIcon,
  EllipseIcon,
  EraserIcon,
  FreedrawIcon,
  LineIcon,
  RectangleIcon,
  SelectIcon,
  TextIcon,
} from "./icons";

const TOOLS: { tool: Tool; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { tool: "select", label: "Select", icon: SelectIcon },
  { tool: "rectangle", label: "Rectangle", icon: RectangleIcon },
  { tool: "ellipse", label: "Ellipse", icon: EllipseIcon },
  { tool: "line", label: "Line", icon: LineIcon },
  { tool: "arrow", label: "Arrow", icon: ArrowIcon },
  { tool: "freedraw", label: "Draw", icon: FreedrawIcon },
  { tool: "text", label: "Text", icon: TextIcon },
  { tool: "eraser", label: "Eraser", icon: EraserIcon },
];

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
}

export function Toolbar({ tool, onToolChange }: ToolbarProps) {
  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95">
      {TOOLS.map(({ tool: t, label, icon: Icon }) => (
        <button
          key={t}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={tool === t}
          onClick={() => onToolChange(t)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
            tool === t
              ? "bg-indigo-600 text-white"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}
