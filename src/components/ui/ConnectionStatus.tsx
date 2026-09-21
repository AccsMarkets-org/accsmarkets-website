"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";

type ConnectionState = "connected" | "connecting" | "disconnected";

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const socket = useSocket();
  const [state, setState] = useState<ConnectionState>("connecting");
  const [showReconnect, setShowReconnect] = useState(false);

  useEffect(() => {
    if (!socket) {
      setState("connecting");
      return;
    }

    function onConnect() {
      setState("connected");
      setShowReconnect(false);
    }
    function onDisconnect() {
      setState("disconnected");
    }
    function onReconnectAttempt() {
      setState("connecting");
    }
    function onConnectError() {
      setState("disconnected");
    }
    function onReconnectFailed() {
      // All reconnection attempts exhausted — show the manual Reconnect button.
      setState("disconnected");
      setShowReconnect(true);
    }

    // Sync immediately with the current socket state.
    setState(socket.connected ? "connected" : "connecting");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("reconnect_attempt", onReconnectAttempt);
    socket.on("connect_error", onConnectError);
    socket.on("reconnect_failed", onReconnectFailed);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("reconnect_attempt", onReconnectAttempt);
      socket.off("connect_error", onConnectError);
      socket.off("reconnect_failed", onReconnectFailed);
    };
  }, [socket]);

  const dotClass =
    state === "connected"
      ? "bg-green-500"
      : state === "connecting"
        ? "bg-amber-400 animate-pulse"
        : "bg-red-500";

  const label =
    state === "connected"
      ? "Real-time updates active"
      : state === "connecting"
        ? "Connecting…"
        : "Disconnected from real-time updates";

  function handleDotClick() {
    if (state === "disconnected") setShowReconnect((v) => !v);
  }

  function handleReconnect() {
    if (!socket) return;
    socket.connect();
    setState("connecting");
    setShowReconnect(false);
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={handleDotClick}
        title={label}
        aria-label={label}
        className="flex items-center justify-center rounded-full p-1 transition-colors hover:bg-surface"
      >
        <span className={cn("h-2 w-2 rounded-full", dotClass)} />
      </button>

      {showReconnect && state === "disconnected" && (
        <button
          type="button"
          onClick={handleReconnect}
          className="rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-foreground ring-1 ring-surface-border transition-colors hover:bg-surface-border"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
