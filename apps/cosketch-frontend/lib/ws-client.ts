"use client";

import { useEffect, useRef } from "react";
import { WsMessageSchema } from "@repo/common/types";
import type { Shape } from "./canvas/types";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BACKEND_URL ?? "ws://localhost:8080";

export interface RoomSocketHandlers {
  onShapeCreate?: (shape: Shape) => void;
  onShapeUpdate?: (shape: Shape) => void;
  onShapeDelete?: (shapeId: string) => void;
  onCursorMove?: (userId: number, x: number, y: number) => void;
}

export interface RoomSocket {
  sendShapeCreate: (shape: Shape) => void;
  sendShapeUpdate: (shape: Shape) => void;
  sendShapeDelete: (shapeId: string) => void;
  sendCursorMove: (x: number, y: number) => void;
}

/**
 * Connects to the WS backend for a room, joining on open and leaving on
 * unmount. `handlers` are read via a ref so the socket isn't recreated when
 * they change identity across renders.
 */
export function useRoomSocket(roomId: number | null, token: string | undefined, handlers: RoomSocketHandlers): RoomSocket {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (roomId === null || !token) return;

    const roomIdStr = String(roomId);
    const ws = new WebSocket(`${WS_BASE_URL}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "join_room", roomId: roomIdStr }));
    });

    ws.addEventListener("message", (event) => {
      let json: unknown;
      try {
        json = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!json || typeof json !== "object") return;
      const type = (json as { type?: unknown }).type;

      // cursor:move broadcasts include a `userId` not present in WsMessageSchema
      // (which only describes client -> server messages), so handle it separately.
      if (type === "cursor:move") {
        const msg = json as { userId?: unknown; x?: unknown; y?: unknown };
        if (typeof msg.userId === "number" && typeof msg.x === "number" && typeof msg.y === "number") {
          handlersRef.current.onCursorMove?.(msg.userId, msg.x, msg.y);
        }
        return;
      }

      const parsed = WsMessageSchema.safeParse(json);
      if (!parsed.success) return;
      const data = parsed.data;

      if (data.type === "shape:create") {
        handlersRef.current.onShapeCreate?.(data.shape);
      } else if (data.type === "shape:update") {
        handlersRef.current.onShapeUpdate?.(data.shape);
      } else if (data.type === "shape:delete") {
        handlersRef.current.onShapeDelete?.(data.shapeId);
      }
    });

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "leave_room", roomId: roomIdStr }));
      }
      ws.close();
      wsRef.current = null;
    };
  }, [roomId, token]);

  function send(payload: object) {
    const ws = wsRef.current;
    if (roomId === null || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(payload));
  }

  return {
    sendShapeCreate: (shape) => send({ type: "shape:create", roomId: String(roomId), shape }),
    sendShapeUpdate: (shape) => send({ type: "shape:update", roomId: String(roomId), shape }),
    sendShapeDelete: (shapeId) => send({ type: "shape:delete", roomId: String(roomId), shapeId }),
    sendCursorMove: (x, y) => send({ type: "cursor:move", roomId: String(roomId), x, y }),
  };
}
