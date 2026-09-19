import type { Server as IOServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __io: IOServer | undefined;
}

/**
 * Reads the Socket.IO server instance attached to `global.__io` by socket-server.js
 * at boot. API routes run in the same Node process as server.js, so no cross-process
 * messaging is needed. No-ops safely if the socket layer isn't running (e.g. `next dev`
 * without the custom server).
 */
function getIO(): IOServer | undefined {
  return global.__io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  getIO()?.to(`user:${userId}`).emit(event, payload);
}

export function emitToRoom(room: string, event: string, payload: unknown): void {
  getIO()?.to(room).emit(event, payload);
}

export function conversationRoom(userIdA: string, userIdB: string): string {
  return `conv:${[userIdA, userIdB].sort().join("_")}`;
}

export function conversationId(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join("_");
}

export function escrowRoom(escrowId: string): string {
  return `escrow:${escrowId}`;
}
