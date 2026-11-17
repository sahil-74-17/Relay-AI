import { logger } from "../config/logger";
import { redis } from "./redis";

/**
 * Read-through cache. Cache failures never break the request: we log and fall
 * back to the source of truth.
 */
export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch (err) {
    logger.warn({ err, key }, "Cache read failed");
  }
  const value = await load();
  redis.set(key, JSON.stringify(value), "EX", ttlSeconds).catch((err) => logger.warn({ err, key }, "Cache write failed"));
  return value;
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length) await redis.del(...keys).catch((err) => logger.warn({ err }, "Cache invalidation failed"));
}

export const CacheKeys = {
  analyticsOverview: "analytics:overview",
  settings: "settings:all",
} as const;

/** The analytics endpoint caches one entry per selectable range; writes clear them all. */
export const ANALYTICS_RANGE_KEYS = [7, 30, 90].map((days) => `${CacheKeys.analyticsOverview}:${days}`);
