"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  disputeId: string;
  status: string;
}

export function AdminDisputeActions({ disputeId, status }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function dispatch(body: Record<string, string>) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Action failed."); return; }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-background p-4 flex flex-col gap-4">
      <h2 className="font-semibold">Admin actions</h2>

      {status === "OPEN" && (
        <button
          onClick={() => dispatch({ action: "mark_review" })}
          disabled={loading}
          className="w-fit rounded-xl bg-warning/10 px-4 py-2 text-sm font-medium text-warning hover:bg-warning/20 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Mark under review"}
        </button>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Admin notes (required for resolve / close)</label>
        <textarea
          className="min-h-[90px] w-full rounded-xl border border-surface-border bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm"
          placeholder="Explain your reasoning…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
        />
        <span className="text-xs text-muted text-right">{notes.length}/2000</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => dispatch({ action: "resolve", winner: "BUYER", adminNotes: notes })}
          disabled={loading || notes.trim().length < 5}
          className="rounded-xl bg-success/10 px-4 py-2 text-sm font-medium text-success hover:bg-success/20 disabled:opacity-50"
        >
          Resolve — buyer wins
        </button>
        <button
          onClick={() => dispatch({ action: "resolve", winner: "SELLER", adminNotes: notes })}
          disabled={loading || notes.trim().length < 5}
          className="rounded-xl bg-brand-100 dark:bg-brand-900/50 px-4 py-2 text-sm font-medium text-brand-700 dark:text-brand-400 hover:bg-brand-200 disabled:opacity-50"
        >
          Resolve — seller wins
        </button>
        <button
          onClick={() => dispatch({ action: "close", adminNotes: notes })}
          disabled={loading || notes.trim().length < 5}
          className="rounded-xl bg-muted/10 px-4 py-2 text-sm font-medium text-muted hover:bg-muted/20 disabled:opacity-50"
        >
          Close without action
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
