import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { middleware } from "./middleware";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";
import { CreateRoomSchema, SigninSchema, SignupSchema } from "@repo/common/types";

const app = express();

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

app.listen(3001, () => {
    console.log("Server is running on port 3001");
});
