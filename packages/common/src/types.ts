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
