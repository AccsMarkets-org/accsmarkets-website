"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";

export function EscrowDurationControl({
  escrowId,
  currentDeadline,
}: {
  escrowId: string;
  currentDeadline: string | null;
}) {
  const router = useRouter();
  const [days, setDays] = useState("");
  const [loading, setLoading] = useState(false);

  const deadlineDate = currentDeadline ? new Date(currentDeadline) : null;
  const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(days);
    if (!Number.isInteger(n) || n < 1 || n > 90) {
      toast.error("Enter a whole number of days (1–90).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/escrows/${escrowId}/duration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: n }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      toast.success(`Order deadline set to ${n} day${n === 1 ? "" : "s"} from now.`);
      setDays("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-sm">
        <span className="text-muted">Current deadline: </span>
        {deadlineDate ? (
          <span className="font-medium text-foreground">
            {deadlineDate.toLocaleString()}{" "}
            <span className={daysLeft !== null && daysLeft < 0 ? "text-danger" : "text-muted"}>
              ({daysLeft !== null && daysLeft >= 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "overdue"})
            </span>
          </span>
        ) : (
          <span className="font-medium text-muted">Not set</span>
        )}
      </div>
      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted">Days from now</label>
          <input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="e.g. 7"
            className="h-10 w-28 rounded-xl border border-surface-border bg-background px-3 text-base focus:border-brand-400 focus:outline-none sm:text-sm"
          />
        </div>
        <Button type="submit" isLoading={loading} disabled={!days} className="h-10">
          Set deadline
        </Button>
      </form>
      <p className="text-xs text-muted">Sets the order countdown to the chosen number of days from now, notifying both parties.</p>
    </div>
  );
}
