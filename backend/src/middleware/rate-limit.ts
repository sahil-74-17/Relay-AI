import type { Request } from "express";
import rateLimit, { type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env";
import { redis } from "../lib/redis";

const store = (prefix: string) =>
  env.NODE_ENV === "test"
    ? undefined
    : new RedisStore({
        prefix: `rl:${prefix}:`,
        // ioredis returns `unknown`; rate-limit-redis expects its RedisReply type.
        sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as never,
      });

const limiter = (prefix: string, opts: Partial<Options>) =>
  rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: store(prefix),
    skip: () => env.NODE_ENV === "test",
    handler: (_req, res) =>
      res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests. Slow down and try again." } }),
    ...opts,
  });

const byUserOrIp = (req: Request) => req.user?.id ?? req.ip ?? "anonymous";

export const apiLimiter = limiter("api", { windowMs: 60_000, limit: 600 });
export const authLimiter = limiter("auth", { windowMs: 15 * 60_000, limit: 30 });
/** LLM-backed endpoints are expensive: limit per user. */
export const chatLimiter = limiter("chat", { windowMs: 60_000, limit: 20, keyGenerator: byUserOrIp });
export const uploadLimiter = limiter("upload", { windowMs: 60_000, limit: 10, keyGenerator: byUserOrIp });
