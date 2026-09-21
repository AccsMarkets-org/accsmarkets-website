// CommonJS module required directly by server.js (runs before Next/TS transpilation).
const { Server } = require("socket.io");
const { getToken } = require("next-auth/jwt");

// Per-sender typing auto-clear: key is `${userId}:${conversationId}`, value is
// { tid: TimeoutId, recipientId: string }.  When typing_stop never fires (e.g.
// the tab is closed mid-compose), the server automatically emits
// user_stopped_typing to the recipient after TYPING_TIMEOUT_MS.
const typingTimers = new Map();
const TYPING_TIMEOUT_MS = 8_000;

function maybeAttachRedisAdapter(io) {
  if (!process.env.REDIS_URL) return;
  try {
    const { createAdapter } = require("@socket.io/redis-adapter");
    const Redis = require("ioredis");
    const pub = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    const sub = pub.duplicate();
    io.adapter(createAdapter(pub, sub));
    console.log(JSON.stringify({ level: "info", msg: "socket.redis_adapter_attached" }));
  } catch (err) {
    console.error(JSON.stringify({ level: "warn", msg: "socket.redis_adapter_skipped", err: String(err) }));
  }
}

let prismaClient = null;
function getPrisma() {
  if (!prismaClient) {
    const { PrismaClient } = require("@prisma/client");
    prismaClient = global.prisma ?? new PrismaClient();
  }
  return prismaClient;
}

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: process.env.NEXTAUTH_URL || "http://localhost:3000", credentials: true },
    // Explicit heartbeat: server pings every 25 s and waits 20 s for a pong
    // before declaring the connection dead.  These match the client-side
    // reconnectionDelay / reconnectionDelayMax window so stale connections are
    // detected before the client gives up retrying.
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // Attach the Redis adapter BEFORE the connection handler so every accepted
  // connection is handled consistently, regardless of startup timing.
  maybeAttachRedisAdapter(io);

  io.use(async (socket, next) => {
    try {
      const token = await getToken({
        req: socket.request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (!token?.id && !token?.sub) return next(new Error("unauthorized"));
      socket.data.userId = token.id || token.sub;
      // Store role so the connection handler can join admin-only rooms.
      socket.data.role = token.role ?? "USER";
      next();
    } catch (err) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    // Admins join a shared room so API routes can broadcast to all online admins
    // via io.to("room:admins").emit(...) without knowing individual socket IDs.
    if (socket.data.role === "ADMIN") {
      socket.join("room:admins");
    }

    socket.on("join_conversation", (conversationId) => {
      if (typeof conversationId !== "string") return;
      const parts = conversationId.split("_");
      if (parts.length === 2 && (parts[0] === userId || parts[1] === userId)) {
        socket.join(`conv:${conversationId}`);
      }
    });

    socket.on("join_escrow", async (escrowId) => {
      if (typeof escrowId !== "string") return;
      try {
        const escrow = await getPrisma().escrow.findFirst({
          where: { id: escrowId, OR: [{ buyerId: userId }, { sellerId: userId }] },
          select: { id: true },
        });
        if (escrow) socket.join(`escrow:${escrowId}`);
      } catch {
        // Non-fatal: if DB is unavailable, just deny the join silently
      }
    });

    socket.on("typing_start", ({ conversationId, recipientId }) => {
      if (typeof recipientId !== "string" || typeof conversationId !== "string") return;
      socket.to(`user:${recipientId}`).emit("user_typing", { userId, conversationId });

      // Reset (or set) the auto-clear timer so a sustained typing session keeps
      // refreshing the indicator without leaking timers.
      const key = `${userId}:${conversationId}`;
      const existing = typingTimers.get(key);
      if (existing) clearTimeout(existing.tid);
      const tid = setTimeout(() => {
        typingTimers.delete(key);
        io.to(`user:${recipientId}`).emit("user_stopped_typing", { userId, conversationId });
      }, TYPING_TIMEOUT_MS);
      typingTimers.set(key, { tid, recipientId });
    });

    socket.on("typing_stop", ({ conversationId, recipientId }) => {
      if (typeof recipientId !== "string" || typeof conversationId !== "string") return;
      const key = `${userId}:${conversationId}`;
      const entry = typingTimers.get(key);
      if (entry) {
        clearTimeout(entry.tid);
        typingTimers.delete(key);
      }
      socket.to(`user:${recipientId}`).emit("user_stopped_typing", { userId, conversationId });
    });

    socket.on("disconnect", () => {
      // Clear any pending typing timers so recipients don't see a stale indicator
      // after this user disconnects mid-compose.
      for (const [key, entry] of typingTimers.entries()) {
        if (key.startsWith(`${userId}:`)) {
          clearTimeout(entry.tid);
          typingTimers.delete(key);
          const conversationId = key.slice(userId.length + 1);
          io.to(`user:${entry.recipientId}`).emit("user_stopped_typing", { userId, conversationId });
        }
      }

      // Online-status tracking: best-effort, never crashes the socket server.
      getPrisma()
        .user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
        .catch(() => {});
    });
  });

  global.__io = io;
  return io;
}

module.exports = { initSocketServer };
