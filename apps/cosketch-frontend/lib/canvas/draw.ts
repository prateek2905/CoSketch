import type { Shape } from "./types";
import { getShapeBounds } from "./geometry";

const SELECTION_COLOR = "#6366f1"; // indigo-500
const SELECTION_PADDING = 6;

export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
  ctx.save();
  ctx.globalAlpha = shape.opacity / 100;
  ctx.strokeStyle = shape.strokeColor;
  ctx.fillStyle = shape.backgroundColor;
  ctx.lineWidth = shape.strokeWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash(shape.strokeStyle === "dashed" ? [8, 6] : shape.strokeStyle === "dotted" ? [2, 4] : []);

  switch (shape.type) {
    case "rectangle":
      drawRectangle(ctx, shape);
      break;
    case "ellipse":
      drawEllipse(ctx, shape);
      break;
    case "line":
      drawLine(ctx, shape);
      break;
    case "arrow":
      drawArrow(ctx, shape);
      break;
    case "freedraw":
      drawFreedraw(ctx, shape);
      break;
    case "text":
      drawText(ctx, shape);
      break;
  }

  ctx.restore();
}

function withRotation(ctx: CanvasRenderingContext2D, shape: Shape, draw: () => void) {
  if (!shape.angle) {
    draw();
    return;
  }
  const bounds = getShapeBounds(shape);
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(shape.angle);
  ctx.translate(-cx, -cy);
  draw();
}

function drawRectangle(ctx: CanvasRenderingContext2D, shape: Shape) {
  withRotation(ctx, shape, () => {
    const { x, y, width, height } = getShapeBounds(shape);
    if (shape.backgroundColor !== "transparent") {
      ctx.fillRect(x, y, width, height);
    }
    ctx.strokeRect(x, y, width, height);
  });
}

function drawEllipse(ctx: CanvasRenderingContext2D, shape: Shape) {
  withRotation(ctx, shape, () => {
    const { x, y, width, height } = getShapeBounds(shape);
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, width / 2, height / 2, 0, 0, Math.PI * 2);
    if (shape.backgroundColor !== "transparent") {
      ctx.fill();
    }
    ctx.stroke();
  });
}

function drawLine(ctx: CanvasRenderingContext2D, shape: Shape) {
  const points = shape.points ?? [];
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(shape.x + points[0]!.x, shape.y + points[0]!.y);
  ctx.lineTo(shape.x + points[1]!.x, shape.y + points[1]!.y);
  ctx.stroke();
}

function drawArrow(ctx: CanvasRenderingContext2D, shape: Shape) {
  const points = shape.points ?? [];
  if (points.length < 2) return;
  const start = { x: shape.x + points[0]!.x, y: shape.y + points[0]!.y };
  const end = { x: shape.x + points[1]!.x, y: shape.y + points[1]!.y };

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = Math.max(10, shape.strokeWidth * 4);

  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function drawFreedraw(ctx: CanvasRenderingContext2D, shape: Shape) {
  const points = shape.points ?? [];
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(shape.x + points[0]!.x, shape.y + points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(shape.x + points[i]!.x, shape.y + points[i]!.y);
  }
  ctx.stroke();
}

function drawText(ctx: CanvasRenderingContext2D, shape: Shape) {
  const fontSize = shape.fontSize ?? 20;
  const fontFamily = shape.fontFamily ?? "sans-serif";
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = shape.strokeColor;
  ctx.textBaseline = "top";

  const lines = (shape.text ?? "").split("\n");
  lines.forEach((line, i) => {
    ctx.fillText(line, shape.x, shape.y + i * fontSize * 1.2);
  });
}

export function drawSelectionOutline(ctx: CanvasRenderingContext2D, shape: Shape) {
  const bounds = getShapeBounds(shape);
  ctx.save();
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(
    bounds.x - SELECTION_PADDING,
    bounds.y - SELECTION_PADDING,
    bounds.width + SELECTION_PADDING * 2,
    bounds.height + SELECTION_PADDING * 2
  );
  ctx.restore();
}
