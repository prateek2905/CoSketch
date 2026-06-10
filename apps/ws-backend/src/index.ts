import "dotenv/config";
import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";
import { WsMessageSchema } from "@repo/common/types";

const wss = new WebSocketServer({ port: 8080 });

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

        if (parsedData.type === "chat") {
            const { roomId, message } = parsedData;

            await prismaClient.chat.create({
                data: {
                    roomId: Number(roomId),
                    message,
                    userId,
                },
            });

            users.forEach((user) => {
                if (user.rooms.includes(roomId)) {
                    user.ws.send(
                        JSON.stringify({
                            type: "chat",
                            message,
                            roomId,
                        })
                    );
                }
            });
        }
    });

    ws.on("close", () => {
        const index = users.findIndex((user) => user.ws === ws);
        if (index !== -1) {
            users.splice(index, 1);
        }
    });
});
