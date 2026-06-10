import { z } from "zod";

export const SignupSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
    name: z.string().min(1),
});

export const SigninSchema = z.object({
    email: z.email(),
    password: z.string(),
});

export const CreateRoomSchema = z.object({
    slug: z.string().min(1).max(50),
});

export const JoinRoomSchema = z.object({
    type: z.literal("join_room"),
    roomId: z.string(),
});

export const LeaveRoomSchema = z.object({
    type: z.literal("leave_room"),
    roomId: z.string(),
});

export const ChatMessageSchema = z.object({
    type: z.literal("chat"),
    roomId: z.string(),
    message: z.string().min(1),
});

export const WsMessageSchema = z.discriminatedUnion("type", [
    JoinRoomSchema,
    LeaveRoomSchema,
    ChatMessageSchema,
]);
