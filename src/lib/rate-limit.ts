import { prisma } from "@/lib/db";
import { getRedis } from "@/lib/redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Sliding-window rate limiter.
 * Uses Redis (ZADD / ZCOUNT) when REDIS_URL is set — O(log N) per check,
 * zero DB writes. Falls back to the original DB-backed implementation when
 * Redis is unavailable so the app degrades gracefully.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (redis) {
    return checkRateLimitRedis(redis, key, limit, windowSeconds);
  }
  return checkRateLimitDb(key, limit, windowSeconds);
}

async function checkRateLimitRedis(
  redis: import("ioredis").Redis,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const pipeline = redis.pipeline();
  // Remove expired members, add current timestamp, count remaining, set TTL
  pipeline.zremrangebyscore(redisKey, "-inf", windowStart);
  pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
  pipeline.zcount(redisKey, windowStart, "+inf");
  pipeline.expire(redisKey, windowSeconds + 1);
  const results = await pipeline.exec();

  const count = (results?.[2]?.[1] as number) ?? limit + 1;
  if (count > limit) {
    // Remove the entry we just added since it's over limit
    await redis.zremrangebyscore(redisKey, now, now).catch(() => {});
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: Math.max(0, limit - count) };
}

async function checkRateLimitDb(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000);

  const count = await prisma.rateLimitEvent.count({
    where: { key, createdAt: { gte: windowStart } },
  });

  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await prisma.rateLimitEvent.create({ data: { key } });

  prisma.rateLimitEvent
    .deleteMany({ where: { key, createdAt: { lt: windowStart } } })
    .catch(() => {});

  return { allowed: true, remaining: Math.max(0, limit - count - 1) };
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
