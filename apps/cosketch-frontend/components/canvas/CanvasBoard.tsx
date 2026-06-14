"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Point, Shape, StyleOptions, Tool } from "@/lib/canvas/types";
import { useRoomSocket } from "@/lib/ws-client";
import { drawShape, drawSelectionOutline } from "@/lib/canvas/draw";
import { createShape } from "@/lib/canvas/shape-factory";
import { getShapeBounds, hitTestShape, normalizeShape } from "@/lib/canvas/geometry";
import { Toolbar } from "./Toolbar";
import { StylePanel } from "./StylePanel";
import { FitViewIcon } from "./icons";

interface CanvasBoardProps {
  roomId: number;
  slug: string;
  token: string;
  initialShapes: Shape[];
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
  lastSentAt: number;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const MIN_SHAPE_SIZE = 3;
const CURSOR_THROTTLE_MS = 50;
const UPDATE_THROTTLE_MS = 50;
const TEXT_FONT_SIZE = 20;
const TEXT_FONT_FAMILY = "sans-serif";
const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const FIT_PADDING = 80;

/** Converts a point in canvas/world space to on-screen CSS pixels for the given camera. */
function canvasToScreen(point: Point, camera: Camera): Point {
  return { x: (point.x - camera.x) * camera.zoom, y: (point.y - camera.y) * camera.zoom };
}

function cursorColor(userId: number): string {
  const hue = (userId * 47) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export function CanvasBoard({ roomId, slug, token, initialShapes }: CanvasBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const shapesRef = useRef<Map<string, Shape>>(new Map(initialShapes.map((shape) => [shape.id, shape])));
  const draftRef = useRef<Shape | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const lastCursorSentAtRef = useRef(0);

  const [tool, setTool] = useState<Tool>("select");
  const [style, setStyle] = useState<StyleOptions>({ strokeColor: "#1e1e1e", strokeWidth: 2 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textEditor, setTextEditor] = useState<Point | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Map<number, Point>>(new Map());
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);
  const cameraRef = useRef(camera);

  const toolRef = useRef(tool);
  const styleRef = useRef(style);
  const selectedIdRef = useRef(selectedId);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    styleRef.current = style;
  }, [style]);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cam = cameraRef.current;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.translate(-cam.x * cam.zoom, -cam.y * cam.zoom);
    ctx.scale(cam.zoom, cam.zoom);

    for (const shape of shapesRef.current.values()) {
      drawShape(ctx, shape);
      if (shape.id === selectedIdRef.current) {
        drawSelectionOutline(ctx, shape);
      }
    }

    if (draftRef.current) {
      drawShape(ctx, draftRef.current);
    }

    ctx.restore();
  }, []);

  const applyCamera = useCallback(
    (next: Camera) => {
      cameraRef.current = next;
      setCamera(next);
      redraw();
    },
    [redraw]
  );

  // Pans/zooms the camera so every shape fits within the visible canvas.
  const fitToContent = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const shapes = Array.from(shapesRef.current.values());
    if (shapes.length === 0) {
      applyCamera(DEFAULT_CAMERA);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const shape of shapes) {
      const bounds = getShapeBounds(shape);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    const contentWidth = Math.max(maxX - minX, 1);
    const contentHeight = Math.max(maxY - minY, 1);
    const { width: viewWidth, height: viewHeight } = container.getBoundingClientRect();

    const zoom = Math.min(
      (viewWidth - FIT_PADDING * 2) / contentWidth,
      (viewHeight - FIT_PADDING * 2) / contentHeight,
      1
    );
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(zoom, MAX_ZOOM));

    applyCamera({
      zoom: clampedZoom,
      x: minX + contentWidth / 2 - viewWidth / 2 / clampedZoom,
      y: minY + contentHeight / 2 - viewHeight / 2 / clampedZoom,
    });
  }, [applyCamera]);

  const socket = useRoomSocket(roomId, token, {
    onShapeCreate: (shape) => {
      shapesRef.current.set(shape.id, shape);
      redraw();
    },
    onShapeUpdate: (shape) => {
      shapesRef.current.set(shape.id, shape);
      redraw();
    },
    onShapeDelete: (shapeId) => {
      shapesRef.current.delete(shapeId);
      if (selectedIdRef.current === shapeId) {
        setSelectedId(null);
      }
      redraw();
    },
    onCursorMove: (userId, x, y) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(userId, { x, y });
        return next;
      });
    },
  });

  const socketRef = useRef(socket);
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Size the canvas to its container, accounting for devicePixelRatio.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      redraw();
    };

    resize();
    if (shapesRef.current.size > 0) {
      fitToContent();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fit on initial mount
  }, [redraw]);

  // Pan with scroll/trackpad, zoom with ctrl/cmd + scroll (pinch).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const cam = cameraRef.current;
      const rect = canvas!.getBoundingClientRect();

      if (e.ctrlKey || e.metaKey) {
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * Math.exp(-e.deltaY * 0.01)));
        applyCamera({
          zoom: newZoom,
          x: cam.x + screenX * (1 / cam.zoom - 1 / newZoom),
          y: cam.y + screenY * (1 / cam.zoom - 1 / newZoom),
        });
        return;
      }

      applyCamera({ ...cam, x: cam.x + e.deltaX / cam.zoom, y: cam.y + e.deltaY / cam.zoom });
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [applyCamera]);

  // Redraw whenever the selection changes (to show/hide the selection outline).
  useEffect(() => {
    redraw();
  }, [selectedId, redraw]);

  // Delete the selected shape with Delete/Backspace.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const id = selectedIdRef.current;
      if (!id) return;

      shapesRef.current.delete(id);
      socketRef.current.sendShapeDelete(id);
      setSelectedId(null);
      redraw();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redraw]);

  function getCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    const cam = cameraRef.current;
    return {
      x: (e.clientX - rect.left) / cam.zoom + cam.x,
      y: (e.clientY - rect.top) / cam.zoom + cam.y,
    };
  }

  function hitTestTopmost(x: number, y: number): Shape | null {
    const shapes = Array.from(shapesRef.current.values());
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i]!;
      if (hitTestShape(shape, x, y)) return shape;
    }
    return null;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (textEditor) return;

    const currentTool = toolRef.current;
    // Deferred to pointer-up: starting the text editor here would mount the
    // autoFocused textarea before the native mousedown's focus-shift default
    // action runs, which immediately blurs it back to <body>.
    if (currentTool === "text") return;

    e.currentTarget.setPointerCapture(e.pointerId);

    const { x, y } = getCanvasPoint(e);

    if (currentTool === "select") {
      const hit = hitTestTopmost(x, y);
      if (hit) {
        setSelectedId(hit.id);
        dragRef.current = { id: hit.id, offsetX: x - hit.x, offsetY: y - hit.y, lastSentAt: 0 };
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (currentTool === "eraser") {
      const hit = hitTestTopmost(x, y);
      if (hit) {
        shapesRef.current.delete(hit.id);
        socket.sendShapeDelete(hit.id);
        if (selectedIdRef.current === hit.id) setSelectedId(null);
        redraw();
      }
      return;
    }

    draftRef.current = createShape(currentTool, x, y, styleRef.current);
    redraw();
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = getCanvasPoint(e);

    const now = performance.now();
    if (now - lastCursorSentAtRef.current > CURSOR_THROTTLE_MS) {
      socket.sendCursorMove(x, y);
      lastCursorSentAtRef.current = now;
    }

    const drag = dragRef.current;
    if (drag) {
      const shape = shapesRef.current.get(drag.id);
      if (shape) {
        shape.x = x - drag.offsetX;
        shape.y = y - drag.offsetY;
        redraw();

        if (now - drag.lastSentAt > UPDATE_THROTTLE_MS) {
          socket.sendShapeUpdate(shape);
          drag.lastSentAt = now;
        }
      }
      return;
    }

    const draft = draftRef.current;
    if (!draft) return;

    if (draft.type === "rectangle" || draft.type === "ellipse") {
      draft.width = x - draft.x;
      draft.height = y - draft.y;
    } else if (draft.type === "line" || draft.type === "arrow") {
      draft.points = [draft.points![0]!, { x: x - draft.x, y: y - draft.y }];
    } else if (draft.type === "freedraw") {
      const points = draft.points!;
      const last = points[points.length - 1]!;
      const relX = x - draft.x;
      const relY = y - draft.y;
      if (Math.hypot(relX - last.x, relY - last.y) > 2) {
        points.push({ x: relX, y: relY });
      }
    }

    redraw();
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (toolRef.current === "text" && !textEditor) {
      const { x, y } = getCanvasPoint(e);
      setTextEditor({ x, y });
      return;
    }

    const drag = dragRef.current;
    if (drag) {
      const shape = shapesRef.current.get(drag.id);
      if (shape) {
        socket.sendShapeUpdate(shape);
      }
      dragRef.current = null;
      return;
    }

    const draft = draftRef.current;
    draftRef.current = null;
    if (!draft) return;

    let finalShape = draft;
    if (draft.type === "rectangle" || draft.type === "ellipse") {
      if (Math.abs(draft.width) < MIN_SHAPE_SIZE && Math.abs(draft.height) < MIN_SHAPE_SIZE) {
        redraw();
        return;
      }
      finalShape = normalizeShape(draft);
    } else if (draft.type === "line" || draft.type === "arrow") {
      const [p0, p1] = draft.points as [Point, Point];
      if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < MIN_SHAPE_SIZE) {
        redraw();
        return;
      }
    } else if (draft.type === "freedraw") {
      if ((draft.points?.length ?? 0) < 2) {
        redraw();
        return;
      }
    }

    shapesRef.current.set(finalShape.id, finalShape);
    socket.sendShapeCreate(finalShape);
    redraw();
  }

  function commitTextEditor(rawValue: string) {
    const editor = textEditor;
    setTextEditor(null);
    if (!editor) return;

    const value = rawValue.trim();
    if (!value) return;

    const shape = createShape("text", editor.x, editor.y, styleRef.current);
    shape.text = value;
    shape.fontSize = TEXT_FONT_SIZE;
    shape.fontFamily = TEXT_FONT_FAMILY;

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.save();
      ctx.font = `${TEXT_FONT_SIZE}px ${TEXT_FONT_FAMILY}`;
      const lines = value.split("\n");
      shape.width = Math.max(...lines.map((line) => ctx.measureText(line).width));
      shape.height = lines.length * TEXT_FONT_SIZE * 1.2;
      ctx.restore();
    }

    shapesRef.current.set(shape.id, shape);
    socket.sendShapeCreate(shape);
    redraw();
  }

  function deleteSelected() {
    const id = selectedIdRef.current;
    if (!id) return;
    shapesRef.current.delete(id);
    socket.sendShapeDelete(id);
    setSelectedId(null);
    redraw();
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[radial-gradient(var(--color-zinc-300)_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(var(--color-zinc-800)_1px,transparent_1px)]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {textEditor && (
        <textarea
          autoFocus
          className="pointer-events-auto absolute z-30 min-w-[120px] resize-none border border-indigo-400 bg-white/90 px-1 py-0.5 text-zinc-900 outline-none dark:bg-zinc-900/90 dark:text-zinc-100"
          style={{
            left: canvasToScreen(textEditor, camera).x,
            top: canvasToScreen(textEditor, camera).y,
            fontSize: TEXT_FONT_SIZE * camera.zoom,
            fontFamily: TEXT_FONT_FAMILY,
            lineHeight: 1.2,
          }}
          onBlur={(e) => commitTextEditor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitTextEditor(e.currentTarget.value);
            } else if (e.key === "Escape") {
              setTextEditor(null);
            }
          }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        {Array.from(remoteCursors.entries()).map(([userId, pos]) => {
          const screenPos = canvasToScreen(pos, camera);
          return (
            <div
              key={userId}
              className="absolute flex items-center gap-1"
              style={{ left: screenPos.x, top: screenPos.y }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill={cursorColor(userId)}>
                <path d="M1 1l5.5 13 2-5.5L14 6.5z" />
              </svg>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: cursorColor(userId) }}
              >
                User {userId}
              </span>
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute top-4 left-4 z-20 flex items-center gap-2">
        <Link
          href="/dashboard"
          className="pointer-events-auto rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ← {slug}
        </Link>
        <button
          type="button"
          title="Fit to content"
          aria-label="Fit to content"
          onClick={fitToContent}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <FitViewIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2">
        <Toolbar tool={tool} onToolChange={setTool} />
      </div>

      <div className="pointer-events-none absolute top-4 right-4 z-20">
        <StylePanel style={style} onStyleChange={setStyle} hasSelection={selectedId !== null} onDeleteSelected={deleteSelected} />
      </div>
    </div>
  );
}
