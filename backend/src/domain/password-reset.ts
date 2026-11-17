import { createHash, randomBytes } from "node:crypto";

/** Reset links are short-lived and single use. */
export const PASSWORD_RESET_TTL_MINUTES = 30;
const TOKEN_BYTES = 32;

/** URL-safe random token shown only in the reset link. */
export const createResetToken = (): string => randomBytes(TOKEN_BYTES).toString("base64url");

/** Only the SHA-256 hash is stored, so a database leak cannot be replayed. */
export const hashResetToken = (token: string): string => createHash("sha256").update(token).digest("hex");

export const resetExpiry = (now = new Date()): Date => new Date(now.getTime() + PASSWORD_RESET_TTL_MINUTES * 60_000);
