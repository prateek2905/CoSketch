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

export const ForgotPasswordSchema = z.object({
    email: z.email(),
});

export const ResetPasswordSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(6),
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

export const ShapeTypeSchema = z.enum(["rectangle", "ellipse", "line", "arrow", "freedraw", "text"]);

export const PointSchema = z.object({
    x: z.number(),
    y: z.number(),
});

export const ShapeSchema = z
    .object({
        id: z.string().min(1),
        type: ShapeTypeSchema,
        x: z.number(),
        y: z.number(),
        width: z.number().default(0),
        height: z.number().default(0),
        angle: z.number().default(0),
        strokeColor: z.string().default("#1e1e1e"),
        backgroundColor: z.string().default("transparent"),
        strokeWidth: z.number().default(1),
        strokeStyle: z.enum(["solid", "dashed", "dotted"]).default("solid"),
        fillStyle: z.enum(["hachure", "cross-hatch", "solid"]).default("hachure"),
        opacity: z.number().min(0).max(100).default(100),
        points: z.array(PointSchema).optional(),
        text: z.string().optional(),
        fontSize: z.number().optional(),
        fontFamily: z.string().optional(),
    })
    .refine(
        (shape) => {
            if (shape.type === "line" || shape.type === "arrow" || shape.type === "freedraw") {
                return Array.isArray(shape.points) && shape.points.length >= 2;
            }
            if (shape.type === "text") {
                return typeof shape.text === "string" && shape.text.length > 0;
            }
            return true;
        },
        { message: "Shape is missing required fields for its type" }
    );

export const ShapeCreateSchema = z.object({
    type: z.literal("shape:create"),
    roomId: z.string(),
    shape: ShapeSchema,
});

export const ShapeUpdateSchema = z.object({
    type: z.literal("shape:update"),
    roomId: z.string(),
    shape: ShapeSchema,
});

export const ShapeDeleteSchema = z.object({
    type: z.literal("shape:delete"),
    roomId: z.string(),
    shapeId: z.string().min(1),
});

export const CursorMoveSchema = z.object({
    type: z.literal("cursor:move"),
    roomId: z.string(),
    x: z.number(),
    y: z.number(),
});

export const WsMessageSchema = z.discriminatedUnion("type", [
    JoinRoomSchema,
    LeaveRoomSchema,
    ShapeCreateSchema,
    ShapeUpdateSchema,
    ShapeDeleteSchema,
    CursorMoveSchema,
]);
