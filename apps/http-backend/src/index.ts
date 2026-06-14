import "dotenv/config";
import crypto from "crypto";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Resend } from "resend";
import { middleware } from "./middleware";
import { JWT_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, FRONTEND_URL } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";
import { CreateRoomSchema, ForgotPasswordSchema, ResetPasswordSchema, SigninSchema, SignupSchema } from "@repo/common/types";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const app = express();

app.use(cors());
app.use(express.json());

app.post("/signup", async (req, res) => {
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", errors: parsed.error.issues });
        return;
    }

    const { email, password, name } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prismaClient.user.create({
            data: { email, password: hashedPassword, name },
        });
        res.json({ userId: user.id });
    } catch {
        res.status(400).json({ message: "User already exists" });
    }
});

app.post("/signin", async (req, res) => {
    const parsed = SigninSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input" });
        return;
    }

    const { email, password } = parsed.data;
    const user = await prismaClient.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        res.status(403).json({ message: "Invalid credentials" });
        return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token });
});

app.post("/forgot-password", async (req, res) => {
    const parsed = ForgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input" });
        return;
    }

    const genericResponse = { message: "If an account exists for that email, a reset link has been sent." };

    const user = await prismaClient.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
        res.json(genericResponse);
        return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    await prismaClient.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });

    const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;
    if (resend) {
        await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to: user.email,
            subject: "Reset your CoSketch password",
            html: `<p>Click the link below to reset your CoSketch password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
        });
    } else {
        console.warn(`RESEND_API_KEY not set — password reset link for ${user.email}: ${resetUrl}`);
    }

    res.json(genericResponse);
});

app.post("/reset-password", async (req, res) => {
    const parsed = ResetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input" });
        return;
    }

    const { token, password } = parsed.data;
    const user = await prismaClient.user.findUnique({ where: { resetToken: token } });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        res.status(400).json({ message: "Invalid or expired reset link" });
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prismaClient.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    res.json({ message: "Password updated" });
});

app.post("/room", middleware, async (req, res) => {
    const parsed = CreateRoomSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input" });
        return;
    }

    // @ts-ignore
    const userId: number = req.userId;

    try {
        const room = await prismaClient.room.create({
            data: { slug: parsed.data.slug, adminId: userId },
        });
        res.json({ roomId: room.id });
    } catch {
        res.status(400).json({ message: "Room already exists" });
    }
});

app.get("/shapes", middleware, async (req, res) => {
    const roomId = Number(req.query.roomId);
    if (!roomId) {
        res.status(400).json({ message: "Invalid roomId" });
        return;
    }

    try {
        const shapes = await prismaClient.shape.findMany({
            where: { roomId, isDeleted: false },
            orderBy: { createdAt: "asc" },
        });
        res.json({ shapes });
    } catch {
        res.status(400).json({ message: "Something went wrong" });
    }
});

app.get("/room/:slug", middleware, async (req, res) => {
    const slug = req.params.slug as string;
    const room = await prismaClient.room.findFirst({ where: { slug } });
    if (!room) {
        res.status(404).json({ message: "Room not found" });
        return;
    }

    // @ts-ignore
    const userId: number = req.userId;
    if (room.adminId !== userId) {
        await prismaClient.roomMember.upsert({
            where: { userId_roomId: { userId, roomId: room.id } },
            update: { joinedAt: new Date() },
            create: { userId, roomId: room.id },
        });
    }

    res.json({ room });
});

app.get("/rooms", middleware, async (req, res) => {
    // @ts-ignore
    const userId: number = req.userId;
    const rooms = await prismaClient.room.findMany({ where: { adminId: userId } });

    const memberships = await prismaClient.roomMember.findMany({
        where: { userId, room: { adminId: { not: userId } } },
        include: { room: true },
        orderBy: { joinedAt: "desc" },
        take: 10,
    });
    const joinedRooms = memberships.map(({ room, joinedAt }) => ({ ...room, joinedAt }));

    res.json({ rooms, joinedRooms });
});

app.listen(3002, () => {
    console.log("Server is running on port 3002");
});
