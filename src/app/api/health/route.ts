import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEmailQueue, getSweepQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

async function getQueueStats(name: string, queue: import("bullmq").Queue | null) {
  if (!queue) return null;
  try {
    const [waiting, active, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getFailedCount(),
    ]);
    return { name, waiting, active, failed };
  } catch {
    return { name, error: "unavailable" };
  }
}

export async function GET(req: Request) {
  // Detailed health data is restricted to internal calls with the sweep secret
  const authHeader = req.headers.get("x-health-secret");
  const expectedSecret = process.env.SWEEP_SECRET;
  const isAuthorized = expectedSecret && authHeader === expectedSecret;

  const start = Date.now();
  let dbOk = false;
  let dbLatencyMs = -1;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    dbOk = true;
  } catch {
    dbLatencyMs = Date.now() - start;
  }

  // Real-time layer: true only if server.js actually initialized Socket.IO
  // (see src/lib/socket.ts) — this is a genuine check of whether that
  // subsystem started, not a guess.
  const io = (global as { __io?: { engine?: { clientsCount?: number } } }).__io;
  const realtimeOk = Boolean(io);

  // Escrow-critical path: a real query against the Escrow table specifically,
  // not just a generic SELECT 1 — catches a scenario where the DB connection
  // itself is fine but this particular table/migration state isn't (e.g. a
  // bad deploy). Kept cheap (count, not a full scan) and time-boxed.
  let escrowOk = false;
  try {
    await Promise.race([
      prisma.escrow.count(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    escrowOk = true;
  } catch {
    escrowOk = false;
  }

  const allOk = dbOk && realtimeOk && escrowOk;
  const status = allOk ? 200 : 503;

  // Public response — real per-component booleans, no secrets or infra
  // details (no queue names, no uptime, no socket counts). Previously this
  // returned one aggregate ok/degraded value that the status page then
  // displayed as if it were 4 independently-monitored services — a real
  // outage in only the realtime or escrow path would have shown "All systems
  // operational" as long as the DB alone was reachable.
  if (!isAuthorized) {
    return NextResponse.json(
      {
        status: allOk ? "ok" : "degraded",
        checks: { api: true, database: dbOk, realtime: realtimeOk, escrow: escrowOk },
      },
      { status },
    );
  }

  // Detailed response for internal/monitoring use
  const socketConnections = io?.engine?.clientsCount ?? 0;
  const uptimeSeconds = Math.floor(process.uptime());

  const [emailQueueStats, sweepQueueStats] = await Promise.all([
    getQueueStats("email", getEmailQueue()),
    getQueueStats("sweep", getSweepQueue()),
  ]);

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      checks: { api: true, database: dbOk, realtime: realtimeOk, escrow: escrowOk },
      db: { ok: dbOk, latencyMs: dbLatencyMs },
      sockets: { connections: socketConnections },
      process: { uptimeSeconds },
      queues: [emailQueueStats, sweepQueueStats].filter(Boolean),
      ts: new Date().toISOString(),
    },
    { status },
  );
}
