"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/hooks/useConfirm";

interface Milestone {
  id: string;
  description: string;
  amount: string | number;
  status: "PENDING" | "RELEASED";
  completedAt: string | null;
}

interface MilestoneChecklistProps {
  escrowId: string;
  milestones: Milestone[];
  isBuyer: boolean;
  escrowStatus: string;
}

export function MilestoneChecklist({ escrowId, milestones, isBuyer, escrowStatus }: MilestoneChecklistProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [local, setLocal] = useState<Milestone[]>(milestones);
  const { confirm, ConfirmDialog } = useConfirm();

  async function releaseMilestone(milestoneId: string) {
    const ok = await confirm({ title: "Release milestone funds?", description: "This cannot be undone.", confirmLabel: "Release", destructive: false });
    if (!ok) return;
    setLoadingId(milestoneId);
    try {
      const res = await fetch(`/api/escrows/${escrowId}/milestones/${milestoneId}/release`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to release milestone");
      toast.success("Milestone funds released");
      setLocal((prev) => prev.map((m) => (m.id === milestoneId ? { ...m, status: "RELEASED", completedAt: new Date().toISOString() } : m)));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingId(null);
    }
  }

  const released = local.filter((m) => m.status === "RELEASED").length;
  const total = local.length;

  const pct = total > 0 ? Math.round((released / total) * 100) : 0;

  return (
    <>
    {ConfirmDialog}
    <div className="flex flex-col gap-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Milestone Payments</p>
          <p className="text-xs text-muted mt-0.5">{released} of {total} released</p>
        </div>
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-black",
          pct === 100 ? "bg-success/15 text-success" : "bg-brand-500/10 text-brand-600 dark:text-brand-400",
        )}>
          {pct}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-border">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            pct === 100 ? "bg-gradient-to-r from-success to-emerald-500" : "bg-gradient-to-r from-brand-400 to-brand-600",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Milestone list */}
      <ol className="flex flex-col gap-2">
        {local.map((m, i) => {
          const done = m.status === "RELEASED";
          const canRelease = isBuyer && !done && escrowStatus === "VERIFIED";
          return (
            <li
              key={m.id}
              className={cn(
                "flex items-start gap-3 overflow-hidden rounded-xl border px-4 py-3 text-sm transition-all",
                done ? "border-success/30 bg-success/5" : "border-surface-border bg-background",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                  done ? "bg-success text-white" : "border-2 border-surface-border text-muted",
                )}
              >
                {done ? (
                  <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3">
                    <path fillRule="evenodd" d="M10.293 2.293a1 1 0 011.414 1.414l-6 6a1 1 0 01-1.414 0l-2.5-2.5a1 1 0 111.414-1.414L5 7.586l5.293-5.293z" clipRule="evenodd"/>
                  </svg>
                ) : i + 1}
              </div>
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className={cn("font-medium truncate", done ? "text-success" : "text-foreground")}>
                  {m.description}
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-bold", done ? "text-success" : "text-brand-600")}>
                    {formatCurrency(Number(m.amount))}
                  </span>
                  {done && m.completedAt && (
                    <span className="text-xs text-muted">
                      · Released {new Date(m.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {done && (
                <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                  Released
                </span>
              )}
              {canRelease && (
                <button
                  type="button"
                  disabled={loadingId === m.id}
                  onClick={() => releaseMilestone(m.id)}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-brand-500/20 transition hover:from-brand-600 hover:to-brand-700 disabled:opacity-60"
                >
                  {loadingId === m.id ? (
                    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : null}
                  Release
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
    </>
  );
}

interface ProposeMilestonesProps {
  escrowId: string;
  escrowAmount: number;
}

export function ProposeMilestones({ escrowId, escrowAmount }: ProposeMilestonesProps) {
  const router = useRouter();
  const [milestones, setMilestones] = useState([
    { description: "", amount: "" },
    { description: "", amount: "" },
  ]);
  const [loading, setLoading] = useState(false);

  function update(i: number, field: "description" | "amount", value: string) {
    setMilestones((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  }

  function addRow() {
    if (milestones.length < 10) setMilestones((prev) => [...prev, { description: "", amount: "" }]);
  }

  function removeRow(i: number) {
    if (milestones.length > 2) setMilestones((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalEntered = milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);
  const diff = Math.abs(totalEntered - escrowAmount);
  const valid =
    milestones.every((m) => m.description.trim().length > 0 && parseFloat(m.amount) > 0) &&
    diff <= 0.01;

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/escrows/${escrowId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestones: milestones.map((m) => ({ description: m.description.trim(), amount: parseFloat(m.amount) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to propose milestones");
      toast.success("Milestones proposed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Break the total (<strong className="text-foreground">{formatCurrency(escrowAmount)}</strong>) into up to 10 milestones. The buyer releases each one separately.
      </p>

      <div className="flex flex-col gap-2">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-surface-border text-[10px] font-bold text-muted">
              {i + 1}
            </div>
            <input
              type="text"
              placeholder={`Milestone ${i + 1} description`}
              value={m.description}
              onChange={(e) => update(i, "description", e.target.value)}
              className="h-9 flex-1 rounded-xl border border-surface-border bg-background px-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            />
            <input
              type="number"
              placeholder="Amount"
              step="0.01"
              min="0.01"
              value={m.amount}
              onChange={(e) => update(i, "amount", e.target.value)}
              className="h-9 w-24 rounded-xl border border-surface-border bg-background px-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            />
            {milestones.length > 2 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          disabled={milestones.length >= 10}
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
          Add milestone
        </button>
        <div className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", diff > 0.01 ? "bg-danger/10 text-danger" : "bg-success/10 text-success")}>
          {formatCurrency(totalEntered)} / {formatCurrency(escrowAmount)}
          {diff <= 0.01 && <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 ml-0.5"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd"/></svg>}
        </div>
      </div>

      <button
        type="button"
        disabled={!valid || loading}
        onClick={submit}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition hover:from-brand-600 hover:to-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
        )}
        Propose milestones
      </button>
    </div>
  );
}
