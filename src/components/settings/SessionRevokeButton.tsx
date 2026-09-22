"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/hooks/useConfirm";

interface Props {
  sessionId?: string;
  revokeAll?: boolean;
}

/**
 * Sessions are stateless JWTs, so a single device can't be revoked on its own.
 * - `revokeAll`: "Sign out everywhere else" — bumps the account's tokenVersion
 *   (every other device is signed out within about a minute) and re-mints this
 *   device's cookie so it stays logged in.
 * - per-session: only removes the row from the list. The label says so.
 */
export function SessionRevokeButton({ sessionId, revokeAll }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  async function revoke() {
    if (revokeAll) {
      const ok = await confirm({
        title: "Sign out everywhere else?",
        description:
          "Every other device will be signed out within about a minute. You will stay logged in on this device.",
        confirmLabel: "Sign out everywhere else",
        destructive: true,
      });
      if (!ok) return;
    }
    setLoading(true);
    try {
      if (revokeAll) {
        const res = await fetch("/api/auth/sessions/revoke-all", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        if (data.selfSignedOut) {
          toast.success("All sessions signed out. Please log in again.");
          await signOut({ callbackUrl: "/login" });
          return;
        }
        toast.success("Other devices will be signed out within a minute");
      } else {
        const res = await fetch(`/api/auth/sessions/${sessionId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        toast.success("Removed from the list. To sign that device out, use \"Sign out everywhere else\".");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {ConfirmDialog}
      <Button size="sm" variant={revokeAll ? "danger" : "outline"} isLoading={loading} onClick={revoke}>
        {revokeAll ? "Sign out everywhere else" : "Remove from list"}
      </Button>
    </>
  );
}
