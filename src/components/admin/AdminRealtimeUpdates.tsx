"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";

const ADMIN_EVENTS = [
  "admin_queue_update",
  "new_deposit",
  "new_withdrawal",
  "new_kyc",
  "new_dispute",
] as const;

type AdminEvent = (typeof ADMIN_EVENTS)[number];

const EVENT_LABELS: Record<AdminEvent, string> = {
  admin_queue_update: "Queue updated",
  new_deposit: "New deposit pending review",
  new_withdrawal: "New withdrawal requested",
  new_kyc: "New KYC submission",
  new_dispute: "New dispute opened",
};

/**
 * Invisible component that listens for admin queue events over Socket.IO and
 * surfaces a toast notification prompting an in-place page refresh.
 *
 * Place once at the bottom of the admin layout's <main> section — it renders
 * nothing until an event fires, then shows a fixed toast in the bottom-right
 * corner until dismissed or the user refreshes.
 */
export function AdminRealtimeUpdates() {
  const socket = useSocket();
  const router = useRouter();
  const [notification, setNotification] = useState<{ event: AdminEvent; label: string } | null>(null);

  const handleEvent = useCallback(
    (event: AdminEvent) => () => {
      setNotification({ event, label: EVENT_LABELS[event] });
    },
    [],
  );

  useEffect(() => {
    if (!socket) return;

    const handlers = ADMIN_EVENTS.map((ev) => {
      const h = handleEvent(ev);
      socket.on(ev, h);
      return { ev, h };
    });

    return () => {
      handlers.forEach(({ ev, h }) => socket.off(ev, h));
    };
  }, [socket, handleEvent]);

  if (!notification) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-surface-border bg-background px-4 py-3 shadow-lg ring-1 ring-black/5 dark:ring-white/5"
    >
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand-500" />
      <p className="text-sm text-foreground">
        {notification.label}
        {" — "}
        <button
          type="button"
          className="pointer-events-auto font-semibold text-brand-600 hover:underline"
          onClick={() => {
            setNotification(null);
            router.refresh();
          }}
        >
          click to refresh
        </button>
      </p>
      <button
        type="button"
        aria-label="Dismiss notification"
        className="pointer-events-auto ml-1 shrink-0 text-lg leading-none text-muted transition-colors hover:text-foreground"
        onClick={() => setNotification(null)}
      >
        ×
      </button>
    </div>
  );
}
