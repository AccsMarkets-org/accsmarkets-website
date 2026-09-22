"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

interface Props {
  escrowId: string;
  existingStatement?: string;
}

export function DisputeEvidenceForm({ escrowId, existingStatement }: Props) {
  const router = useRouter();
  const [statement, setStatement] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (existingStatement) {
    return (
      <Card>
        <h2 className="mb-2 font-semibold">Your evidence</h2>
        <p className="text-sm text-muted">Your statement has been submitted and cannot be changed.</p>
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-surface-border/40 p-3 text-sm">{existingStatement}</p>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="border-success/30 bg-success/5">
        <p className="text-sm font-medium text-success">Evidence submitted. The admin will review both parties&apos; statements.</p>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/escrows/${escrowId}/dispute/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to submit."); return; }
      setDone(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 font-semibold">Submit your evidence</h2>
      <p className="mb-3 text-sm text-muted">
        Describe your side of the dispute. You may only submit once. Be clear and factual — an admin will review both statements.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          className="min-h-[140px] w-full rounded-xl border border-surface-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Describe what happened, what you did, and any relevant details…"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          maxLength={3000}
          required
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">{statement.length}/3000</span>
          {error && <span className="text-xs text-danger">{error}</span>}
          <button
            type="submit"
            disabled={loading || statement.trim().length < 10}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit evidence"}
          </button>
        </div>
      </form>
    </Card>
  );
}
