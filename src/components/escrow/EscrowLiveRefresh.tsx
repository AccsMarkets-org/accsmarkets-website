"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";

const REFRESH_EVENTS = [
  "escrow_verified",
  "escrow_transferring",
  "escrow_countdown_updated",
  "escrow_manager_verified",
];

/**
 * Mounted (invisible) on escrow detail pages so an open tab picks up
 * server-side changes — like an admin adjusting the transfer countdown —
 * without the viewer having to manually reload.
 */
export function EscrowLiveRefresh({ escrowId }: { escrowId: string }) {
  const socket = useSocket();
  const router = useRouter();

  useEffect(() => {
    if (!socket) return;
    function onUpdate(payload: { escrowId?: string }) {
      if (payload?.escrowId === escrowId) router.refresh();
    }
    for (const event of REFRESH_EVENTS) socket.on(event, onUpdate);
    return () => {
      for (const event of REFRESH_EVENTS) socket.off(event, onUpdate);
    };
  }, [socket, escrowId, router]);

  return null;
}
