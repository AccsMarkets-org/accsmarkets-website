"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/hooks/useConfirm";
import type { SupportTicketStatus } from "@prisma/client";

interface Props {
  ticketId: string;
  status: SupportTicketStatus;
  canReopen: boolean;
}

export function TicketStatusActions({ ticketId, status, canReopen }: Props) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [loading, setLoading] = useState(false);

  async function patch(action: "resolve" | "reopen") {
    setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      toast.success(action === "resolve" ? "Ticket marked as resolved" : "Ticket reopened");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isOpen = status === "OPEN" || status === "AWAITING_STAFF" || status === "AWAITING_USER";

  return (
    <>
      {ConfirmDialog}
      {isOpen && (
        <Button
          variant="outline"
          size="sm"
          isLoading={loading}
          onClick={async () => {
            const ok = await confirm({
              title: "Mark this ticket as resolved?",
              description: "Let us know the issue is sorted. You can reopen it within 7 days if it comes back.",
              confirmLabel: "Mark resolved",
            });
            if (ok) patch("resolve");
          }}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />
          Mark as resolved
        </Button>
      )}
      {status === "RESOLVED" && canReopen && (
        <Button variant="outline" size="sm" isLoading={loading} onClick={() => patch("reopen")}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reopen ticket
        </Button>
      )}
    </>
  );
}
