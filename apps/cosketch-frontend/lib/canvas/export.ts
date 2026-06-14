import type { Shape } from "./types";
import { drawShape } from "./draw";
import { getShapeBounds, type Bounds } from "./geometry";

const EXPORT_PADDING = 24;

function getContentBounds(shapes: Shape[]): Bounds {
  if (shapes.length === 0) return { x: 0, y: 0, width: 1, height: 1 };

  const boxes = shapes.map(getShapeBounds);
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Renders all shapes onto an off-screen canvas (white background) and downloads it as a PNG. */
export function exportToPng(shapes: Shape[], filename: string) {
  const bounds = getContentBounds(shapes);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(bounds.width) + EXPORT_PADDING * 2;
  canvas.height = Math.ceil(bounds.height) + EXPORT_PADDING * 2;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(-bounds.x + EXPORT_PADDING, -bounds.y + EXPORT_PADDING);
  for (const shape of shapes) {
    drawShape(ctx, shape);
  }

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${filename}.png`);
  }, "image/png");
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function commonAttrs(shape: Shape, { fill = false } = {}): string {
  const dashArray =
    shape.strokeStyle === "dashed" ? ' stroke-dasharray="8 6"' : shape.strokeStyle === "dotted" ? ' stroke-dasharray="2 4"' : "";
  const fillColor = fill ? (shape.backgroundColor === "transparent" ? "none" : shape.backgroundColor) : "none";
  return `stroke="${shape.strokeColor}" stroke-width="${shape.strokeWidth}" fill="${fillColor}" opacity="${shape.opacity / 100}" stroke-linecap="round" stroke-linejoin="round"${dashArray}`;
}

function rotationTransform(shape: Shape): string {
  if (!shape.angle) return "";
  const bounds = getShapeBounds(shape);
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  return ` transform="rotate(${(shape.angle * 180) / Math.PI} ${cx} ${cy})"`;
}

function shapeToSvg(shape: Shape): string {
  switch (shape.type) {
    case "rectangle": {
      const b = getShapeBounds(shape);
      return `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" ${commonAttrs(shape, { fill: true })}${rotationTransform(shape)} />`;
    }
    case "ellipse": {
      const b = getShapeBounds(shape);
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${b.width / 2}" ry="${b.height / 2}" ${commonAttrs(shape, { fill: true })}${rotationTransform(shape)} />`;
    }
    case "line": {
      const points = shape.points ?? [];
      if (points.length < 2) return "";
      const [p1, p2] = points;
      return `<line x1="${shape.x + p1!.x}" y1="${shape.y + p1!.y}" x2="${shape.x + p2!.x}" y2="${shape.y + p2!.y}" ${commonAttrs(shape)} />`;
    }
    case "arrow": {
      const points = shape.points ?? [];
      if (points.length < 2) return "";
      const start = { x: shape.x + points[0]!.x, y: shape.y + points[0]!.y };
      const end = { x: shape.x + points[1]!.x, y: shape.y + points[1]!.y };
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLength = Math.max(10, shape.strokeWidth * 4);
      const h1 = { x: end.x - headLength * Math.cos(angle - Math.PI / 6), y: end.y - headLength * Math.sin(angle - Math.PI / 6) };
      const h2 = { x: end.x - headLength * Math.cos(angle + Math.PI / 6), y: end.y - headLength * Math.sin(angle + Math.PI / 6) };
      const attrs = commonAttrs(shape);
      return [
        `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" ${attrs} />`,
        `<line x1="${end.x}" y1="${end.y}" x2="${h1.x}" y2="${h1.y}" ${attrs} />`,
        `<line x1="${end.x}" y1="${end.y}" x2="${h2.x}" y2="${h2.y}" ${attrs} />`,
      ].join("\n");
    }
    case "freedraw": {
      const points = shape.points ?? [];
      if (points.length === 0) return "";
      const pts = points.map((p) => `${shape.x + p.x},${shape.y + p.y}`).join(" ");
      return `<polyline points="${pts}" ${commonAttrs(shape)} />`;
    }
    case "text": {
      const fontSize = shape.fontSize ?? 20;
      const fontFamily = shape.fontFamily ?? "sans-serif";
      const lines = (shape.text ?? "").split("\n");
      const tspans = lines
        .map((line, i) => `<tspan x="${shape.x}" dy="${i === 0 ? 0 : fontSize * 1.2}">${escapeXml(line)}</tspan>`)
        .join("");
      return `<text x="${shape.x}" y="${shape.y}" font-size="${fontSize}" font-family="${escapeXml(fontFamily)}" fill="${shape.strokeColor}" opacity="${shape.opacity / 100}" dominant-baseline="hanging">${tspans}</text>`;
    }
    default:
      return "";
  }
}

/** Builds an SVG document from all shapes (white background) and downloads it. */
export function exportToSvg(shapes: Shape[], filename: string) {
  const bounds = getContentBounds(shapes);
  const width = Math.ceil(bounds.width) + EXPORT_PADDING * 2;
  const height = Math.ceil(bounds.height) + EXPORT_PADDING * 2;
  const offsetX = -bounds.x + EXPORT_PADDING;
  const offsetY = -bounds.y + EXPORT_PADDING;

  const body = shapes.map(shapeToSvg).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#ffffff" />
  <g transform="translate(${offsetX} ${offsetY})">
${body}
  </g>
</svg>`;

  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${filename}.svg`);
}
