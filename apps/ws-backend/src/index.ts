import "dotenv/config";
import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";
import { WsMessageSchema } from "@repo/common/types";

const PORT = Number(process.env.PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });

interface User {
    ws: WebSocket;
    userId: number;
    rooms: string[];
}

const users: User[] = [];

function checkUser(token: string): number | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (typeof decoded === "string" || !decoded.userId) {
            return null;
        }

        return decoded.userId;
    } catch {
        return null;
    }
}

function broadcastToRoom(roomId: string, payload: object, options?: { exclude?: WebSocket }) {
    const message = JSON.stringify(payload);
    users.forEach((user) => {
        if (!user.rooms.includes(roomId)) return;
        if (options?.exclude && user.ws === options.exclude) return;
        user.ws.send(message);
    });
}

wss.on("connection", function connection(ws, request) {
    const url = request.url;
    if (!url) {
        ws.close();
        return;
    }

    const queryParams = new URLSearchParams(url.split("?")[1]);
    const token = queryParams.get("token") || "";
    const userId = checkUser(token);

    if (!userId) {
        ws.close();
        return;
    }

    users.push({ ws, userId, rooms: [] });

    ws.on("message", async function message(data) {
        let json;
        try {
            json = JSON.parse(data.toString());
        } catch {
            return;
        }

        const parsed = WsMessageSchema.safeParse(json);
        if (!parsed.success) {
            return;
        }
        const parsedData = parsed.data;

        if (parsedData.type === "join_room") {
            const user = users.find((user) => user.ws === ws);
            user?.rooms.push(parsedData.roomId);
        }

        if (parsedData.type === "leave_room") {
            const user = users.find((user) => user.ws === ws);
            if (!user) {
                return;
            }
            user.rooms = user.rooms.filter((roomId) => roomId !== parsedData.roomId);
        }

        if (parsedData.type === "shape:create") {
            const { roomId, shape } = parsedData;

            try {
                await prismaClient.shape.create({
                    data: {
                        id: shape.id,
                        roomId: Number(roomId),
                        userId,
                        type: shape.type,
                        x: shape.x,
                        y: shape.y,
                        width: shape.width,
                        height: shape.height,
                        angle: shape.angle,
                        strokeColor: shape.strokeColor,
                        backgroundColor: shape.backgroundColor,
                        strokeWidth: shape.strokeWidth,
                        strokeStyle: shape.strokeStyle,
                        fillStyle: shape.fillStyle,
                        opacity: shape.opacity,
                        points: shape.points,
                        text: shape.text,
                        fontSize: shape.fontSize,
                        fontFamily: shape.fontFamily,
                    },
                });
            } catch {
                return;
            }

            broadcastToRoom(roomId, {
                type: "shape:create",
                roomId,
                shape,
            });
        }

        if (parsedData.type === "shape:update") {
            const { roomId, shape } = parsedData;

            try {
                await prismaClient.shape.update({
                    where: { id: shape.id },
                    data: {
                        x: shape.x,
                        y: shape.y,
                        width: shape.width,
                        height: shape.height,
                        angle: shape.angle,
                        strokeColor: shape.strokeColor,
                        backgroundColor: shape.backgroundColor,
                        strokeWidth: shape.strokeWidth,
                        strokeStyle: shape.strokeStyle,
                        fillStyle: shape.fillStyle,
                        opacity: shape.opacity,
                        points: shape.points,
                        text: shape.text,
                        fontSize: shape.fontSize,
                        fontFamily: shape.fontFamily,
                        version: { increment: 1 },
                    },
                });
            } catch {
                return;
            }

            broadcastToRoom(roomId, {
                type: "shape:update",
                roomId,
                shape,
            });
        }

        if (parsedData.type === "shape:delete") {
            const { roomId, shapeId } = parsedData;

            try {
                await prismaClient.shape.update({
                    where: { id: shapeId },
                    data: { isDeleted: true },
                });
            } catch {
                return;
            }

            broadcastToRoom(roomId, {
                type: "shape:delete",
                roomId,
                shapeId,
            });
        }

        if (parsedData.type === "cursor:move") {
            const { roomId, x, y } = parsedData;

            broadcastToRoom(
                roomId,
                {
                    type: "cursor:move",
                    roomId,
                    userId,
                    x,
                    y,
                },
                { exclude: ws }
            );
        }
    });

    ws.on("close", () => {
        const index = users.findIndex((user) => user.ws === ws);
        if (index !== -1) {
            users.splice(index, 1);
        }
    });
});
