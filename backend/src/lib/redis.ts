import { Redis } from "ioredis";
import { env } from "../config/env";
import { logger } from "../config/logger";

/** Shared connection for cache + rate limiting. BullMQ needs maxRetriesPerRequest=null. */
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
redis.on("error", (err) => logger.error({ err }, "Redis error"));

export const createRedisConnection = () => new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
