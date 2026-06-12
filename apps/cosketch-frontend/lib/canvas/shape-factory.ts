import type { Shape, ShapeType, StyleOptions } from "./types";

/** Creates a new shape of `type` anchored at (x, y) with zero size/points to be filled in while drawing. */
export function createShape(type: ShapeType, x: number, y: number, style: StyleOptions): Shape {
  const base: Shape = {
    id: crypto.randomUUID(),
    type,
    x,
    y,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: style.strokeColor,
    backgroundColor: "transparent",
    strokeWidth: style.strokeWidth,
    strokeStyle: "solid",
    fillStyle: "hachure",
    opacity: 100,
  };

  if (type === "line" || type === "arrow") {
    base.points = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  } else if (type === "freedraw") {
    base.points = [{ x: 0, y: 0 }];
  } else if (type === "text") {
    base.text = "";
    base.fontSize = 20;
    base.fontFamily = "sans-serif";
  }

  return base;
}
