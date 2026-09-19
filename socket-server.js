// CommonJS module required directly by server.js (runs before Next/TS transpilation).
const { Server } = require("socket.io");
const { getToken } = require("next-auth/jwt");

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
  });

  io.use(async (socket, next) => {
    try {
      const token = await getToken({
        req: socket.request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (!token?.id && !token?.sub) return next(new Error("unauthorized"));
      socket.data.userId = token.id || token.sub;
      next();
    } catch (err) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    socket.on("join_conversation", (conversationId) => {
      if (typeof conversationId === "string" && conversationId.includes(userId)) {
        socket.join(`conv:${conversationId}`);
      }
    });

    socket.on("join_escrow", (escrowId) => {
      if (typeof escrowId === "string") socket.join(`escrow:${escrowId}`);
    });

    socket.on("typing_start", ({ conversationId, recipientId }) => {
      if (typeof recipientId === "string") {
        socket.to(`user:${recipientId}`).emit("user_typing", { userId, conversationId });
      }
    });

    socket.on("typing_stop", ({ conversationId, recipientId }) => {
      if (typeof recipientId === "string") {
        socket.to(`user:${recipientId}`).emit("user_stopped_typing", { userId, conversationId });
      }
    });

    socket.on("disconnect", () => {
      // Online-status tracking: best-effort, never crashes the socket server.
      getPrisma()
        .user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
        .catch(() => {});
    });
  });

  maybeAttachRedisAdapter(io);
  global.__io = io;
  return io;
}

module.exports = { initSocketServer };
