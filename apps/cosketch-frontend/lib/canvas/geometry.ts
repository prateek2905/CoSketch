import type { Point, Shape } from "./types";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getRectBounds(shape: Shape): Bounds {
  const x = shape.width < 0 ? shape.x + shape.width : shape.x;
  const y = shape.height < 0 ? shape.y + shape.height : shape.y;
  return { x, y, width: Math.abs(shape.width), height: Math.abs(shape.height) };
}

/** Bounding box for a shape, in canvas coordinates. */
export function getShapeBounds(shape: Shape): Bounds {
  if (shape.type === "line" || shape.type === "arrow" || shape.type === "freedraw") {
    const points = shape.points ?? [];
    if (points.length === 0) {
      return { x: shape.x, y: shape.y, width: 0, height: 0 };
    }

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return { x: shape.x + minX, y: shape.y + minY, width: maxX - minX, height: maxY - minY };
  }

  return getRectBounds(shape);
}

/** Returns a copy of a rectangle/ellipse/text shape with non-negative width/height. */
export function normalizeShape(shape: Shape): Shape {
  if (shape.type !== "rectangle" && shape.type !== "ellipse" && shape.type !== "text") {
    return shape;
  }
  return { ...shape, ...getRectBounds(shape) };
}

const HIT_PADDING = 4;
const LINE_HIT_THRESHOLD = 6;

/** Returns true if (px, py) is close enough to `shape` to count as a click on it. */
export function hitTestShape(shape: Shape, px: number, py: number): boolean {
  if (shape.type === "rectangle" || shape.type === "ellipse" || shape.type === "text") {
    const bounds = getRectBounds(shape);
    return (
      px >= bounds.x - HIT_PADDING &&
      px <= bounds.x + bounds.width + HIT_PADDING &&
      py >= bounds.y - HIT_PADDING &&
      py <= bounds.y + bounds.height + HIT_PADDING
    );
  }

  const points = (shape.points ?? []).map((p) => ({ x: shape.x + p.x, y: shape.y + p.y }));
  for (let i = 0; i < points.length - 1; i++) {
    if (distanceToSegment(px, py, points[i]!, points[i + 1]!) <= LINE_HIT_THRESHOLD) {
      return true;
    }
  }
  return false;
}

function distanceToSegment(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - a.x, py - a.y);

  let t = ((px - a.x) * dx + (py - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}
