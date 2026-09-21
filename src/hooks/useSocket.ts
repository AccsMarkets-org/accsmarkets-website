"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";

let sharedSocket: Socket | null = null;

function getOrCreateSocket(): Socket | null {
  // SSR guard: socket.io-client must only run in the browser.
  if (typeof window === "undefined") return null;

  // Reuse if already connected or reconnecting, create fresh otherwise.
  if (sharedSocket && !sharedSocket.disconnected) {
    return sharedSocket;
  }
  // If a stale disconnected socket exists, clean it up first.
  if (sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.close();
    sharedSocket = null;
  }
  const s = io({
    path: "/socket.io",
    withCredentials: true,
    reconnection: true,
    // After 5 failed attempts the client stops retrying automatically; the
    // ConnectionStatus component exposes a manual "Reconnect" button at that
    // point so the user can trigger a fresh attempt without a page reload.
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });
  // When the server disconnects us (e.g. server restart), clear the ref so
  // the next call to getOrCreateSocket() creates a fresh connection.
  s.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
      sharedSocket = null;
    }
  });
  sharedSocket = s;
  return s;
}

/**
 * Returns a shared Socket.IO client connection, authenticated implicitly via the
 * next-auth session cookie. Returns null until authenticated.
 */
export function useSocket(): Socket | null {
  const { status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    const s = getOrCreateSocket();
    if (!s) return; // SSR or socket.io-client unavailable
    setSocket(s);

    // If this component mounts after a server-forced disconnect, the socket
    // may be in the middle of reconnecting — update state when it reconnects.
    function onReconnect() { setSocket(sharedSocket); }
    s.on("connect", onReconnect);
    return () => {
      s.off("connect", onReconnect);
      // Intentionally not disconnecting the shared socket on unmount.
    };
  }, [status]);

  return socket;
}
