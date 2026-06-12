import { z } from "zod";
import { PointSchema, ShapeSchema, ShapeTypeSchema } from "@repo/common/types";

export type Shape = z.infer<typeof ShapeSchema>;
export type ShapeType = z.infer<typeof ShapeTypeSchema>;
export type Point = z.infer<typeof PointSchema>;

export type Tool = "select" | "rectangle" | "ellipse" | "line" | "arrow" | "freedraw" | "text" | "eraser";

export type StyleOptions = {
  strokeColor: string;
  strokeWidth: number;
};

/** Shape of a row as returned by `GET /shapes` (serialized Prisma `Shape`). */
export interface RawShape {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
  strokeStyle: string;
  fillStyle: string;
  opacity: number;
  points: unknown;
  text: string | null;
  fontSize: number | null;
  fontFamily: string | null;
}

/** Converts a raw API shape row into the canvas `Shape` shape used for rendering/WS sync. */
export function fromRawShape(raw: RawShape): Shape {
  return {
    id: raw.id,
    type: raw.type as ShapeType,
    x: raw.x,
    y: raw.y,
    width: raw.width,
    height: raw.height,
    angle: raw.angle,
    strokeColor: raw.strokeColor,
    backgroundColor: raw.backgroundColor,
    strokeWidth: raw.strokeWidth,
    strokeStyle: raw.strokeStyle as Shape["strokeStyle"],
    fillStyle: raw.fillStyle as Shape["fillStyle"],
    opacity: raw.opacity,
    points: (raw.points as Point[] | null) ?? undefined,
    text: raw.text ?? undefined,
    fontSize: raw.fontSize ?? undefined,
    fontFamily: raw.fontFamily ?? undefined,
  };
}
