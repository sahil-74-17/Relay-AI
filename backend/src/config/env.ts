import "dotenv/config";
import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  COOKIE_SECURE: bool,
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  ML_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  ML_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  LLM_PROVIDER: z.enum(["anthropic", "openai", "none"]).default("none"),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_BASE_URL: z.string().url().optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  // Google OAuth is optional: without these the email/password flow is unaffected.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  // SMTP for transactional email (password reset). Without SMTP_HOST the reset
  // flow uses a development-only fallback instead of pretending an email was sent.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: bool,
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Relay <no-reply@localhost>"),
  // Only trust X-Forwarded-For when the API sits behind a proxy you control.
  TRUST_PROXY: bool,
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  RUN_WORKERS: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast at boot with a readable message instead of failing later at runtime.
  console.error("Invalid environment configuration:\n", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
export const isProd = env.NODE_ENV === "production";
