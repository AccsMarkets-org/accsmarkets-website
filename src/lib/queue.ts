import { Queue } from "bullmq";
import { createRedisConnection } from "@/lib/redis";

export type EmailJobData = {
  to: string;
  subject: string;
  html: string;
};

export type SweepJobData = {
  task:
    | "expire_offers"
    | "expire_promotions"
    | "expire_escrow_deadlines"
    | "expire_listings"
    | "expire_subscriptions"
    | "prune_rate_limits"
    | "prune_sessions"
    | "saved_search_alerts";
};

declare global {
  // eslint-disable-next-line no-var
  var __emailQueue: Queue<EmailJobData> | undefined;
  // eslint-disable-next-line no-var
  var __sweepQueue: Queue<SweepJobData> | undefined;
}

function makeQueue<T>(name: string): Queue<T> | null {
  const conn = createRedisConnection();
  if (!conn) return null;
  return new Queue<T>(name, { connection: conn });
}

export function getEmailQueue(): Queue<EmailJobData> | null {
  if (typeof globalThis.__emailQueue !== "undefined") return globalThis.__emailQueue ?? null;
  const q = makeQueue<EmailJobData>("email");
  globalThis.__emailQueue = q ?? undefined;
  return q;
}

export function getSweepQueue(): Queue<SweepJobData> | null {
  if (typeof globalThis.__sweepQueue !== "undefined") return globalThis.__sweepQueue ?? null;
  const q = makeQueue<SweepJobData>("sweep");
  globalThis.__sweepQueue = q ?? undefined;
  return q;
}

/** Enqueues an email. Falls back to direct send when Redis is not configured. */
export async function enqueueEmail(data: EmailJobData): Promise<void> {
  const q = getEmailQueue();
  if (q) {
    await q.add("send", data, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });
  } else {
    // Synchronous fallback (no Redis)
    const { sendEmail } = await import("@/lib/email");
    await sendEmail(data);
  }
}

/** Enqueues a sweep task. Falls back to direct HTTP call when Redis is not configured. */
export async function enqueueSweep(task: SweepJobData["task"]): Promise<void> {
  const q = getSweepQueue();
  if (q) {
    await q.add(task, { task }, { attempts: 2, backoff: { type: "fixed", delay: 5000 } });
  } else {
    // Synchronous fallback — call the sweep endpoint directly
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    await fetch(`${base}/api/sweep`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SWEEP_SECRET ?? ""}`,
      },
      body: JSON.stringify({ task }),
    }).catch(() => {});
  }
}
