import Redis from "ioredis";
import { logger } from "@/lib/logger";

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | null | undefined;
}

function createClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  client.on("error", (err) => logger.warn("redis.error", { err: String(err) }));
  client.on("connect", () => logger.info("redis.connected"));
  return client;
}

export function getRedis(): Redis | null {
  if (typeof globalThis.__redis !== "undefined") return globalThis.__redis;
  globalThis.__redis = createClient();
  return globalThis.__redis;
}

/** Returns a duplicate connection (needed for BullMQ which requires exclusive connections). */
export function createRedisConnection(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  return new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
}
