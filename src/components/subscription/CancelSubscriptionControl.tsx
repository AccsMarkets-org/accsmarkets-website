"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";

interface Props {
  cancelAtPeriodEnd: boolean;
  effectiveDate: string; // ISO date string, formatted for display by the caller
}

export function CancelSubscriptionControl({ cancelAtPeriodEnd, effectiveDate }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function cancel() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/cancel-subscription", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel");
      toast.success(`Your plan will move to Free on ${effectiveDate}.`);
      setConfirming(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setLoading(false);
    }
  }

  async function resume() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/resume-subscription", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to resume");
      toast.success("Subscription resumed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resume");
    } finally {
      setLoading(false);
    }
  }

  if (cancelAtPeriodEnd) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-bold text-warning-foreground">
          Cancels {effectiveDate}
        </span>
        <Button variant="outline" size="sm" isLoading={loading} onClick={resume}>
          Resume subscription
        </Button>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3">
        <p className="max-w-[220px] text-right text-xs text-muted">
          You&apos;ll keep your current plan&apos;s benefits until <strong>{effectiveDate}</strong>, then move to Free.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
            Never mind
          </Button>
          <Button variant="danger" size="sm" isLoading={loading} onClick={cancel}>
            Confirm cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
      Cancel subscription
    </Button>
  );
}
