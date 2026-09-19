"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/hooks/useConfirm";

interface Props {
  sessionId?: string;
  revokeAll?: boolean;
}

export function SessionRevokeButton({ sessionId, revokeAll }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  async function revoke() {
    if (revokeAll) {
      const ok = await confirm({ title: "Revoke all other sessions?", description: "You will stay logged in on this device.", confirmLabel: "Revoke all", destructive: true });
      if (!ok) return;
    }
    setLoading(true);
    try {
      if (revokeAll) {
        const list = await (await fetch("/api/auth/sessions")).json();
        const others = (list.sessions as Array<{ id: string }>).slice(1);
        const results = await Promise.allSettled(
          others.map((s) => fetch(`/api/auth/sessions/${s.id}`, { method: "DELETE" })),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) toast.error(`${failed} session(s) could not be revoked`);
        else toast.success("All other sessions revoked");
      } else {
        const res = await fetch(`/api/auth/sessions/${sessionId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        toast.success("Session revoked");
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
      <Button size="sm" variant={revokeAll ? "outline" : "danger"} isLoading={loading} onClick={revoke}>
        {revokeAll ? "Revoke all others" : "Revoke"}
      </Button>
    </>
  );
}
