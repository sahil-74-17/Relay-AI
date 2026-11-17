import { z } from "zod";
import { trimmed } from "./common";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  name: trimmed(2, 80),
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200)
    .regex(/[A-Za-z]/, "Include a letter")
    .regex(/\d/, "Include a number"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200)
    .regex(/[A-Za-z]/, "Include a letter")
    .regex(/\d/, "Include a number"),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
