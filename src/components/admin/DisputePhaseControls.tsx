"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getAllowedTransitions, PHASE_LABELS, PHASE_COLORS } from "@/lib/dispute-phases";
import { DisputePhase } from "@prisma/client";

interface Props {
  disputeId: string;
  currentPhase: DisputePhase;
  mediationOffer?: number | null;
}

export function DisputePhaseControls({ disputeId, currentPhase, mediationOffer }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [offerAmount, setOfferAmount] = useState(mediationOffer?.toString() ?? "");

  const transitions = getAllowedTransitions(currentPhase, true);

  async function advancePhase(toPhase: DisputePhase) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toPhase, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Advanced to ${PHASE_LABELS[toPhase]}`);
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitMediationOffer() {
    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount < 0) { toast.error("Enter a valid offer amount"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/mediate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediationOffer: amount, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Mediation offer submitted");
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (currentPhase === "FINAL") {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
        This dispute is finalized. No further phase changes possible.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current phase indicator */}
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${PHASE_COLORS[currentPhase]}`}>
        Current phase: {PHASE_LABELS[currentPhase]}
      </div>

      {/* Mediation offer input */}
      {currentPhase === "MEDIATION" && (
        <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-4 space-y-3">
          <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">Settlement Offer</p>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-purple-700 dark:text-purple-400">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="0.00"
              className="w-32 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-background px-3 py-1.5 text-base focus:border-purple-400 focus:outline-none sm:text-sm"
            />
            <button
              onClick={submitMediationOffer}
              disabled={busy}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {busy ? "Submitting..." : mediationOffer ? "Update Offer" : "Submit Offer"}
            </button>
          </div>
          {mediationOffer && (
            <p className="text-xs text-purple-600">Current offer: ${mediationOffer.toFixed(2)}</p>
          )}
        </div>
      )}

      {/* Optional note */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note about this action..."
          className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-base focus:border-brand-500 focus:outline-none sm:text-sm"
        />
      </div>

      {/* Phase transitions */}
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <button
            key={`${t.from}-${t.to}`}
            onClick={() => advancePhase(t.to)}
            disabled={busy}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50
              ${t.to === "FINAL" ? "bg-green-600 text-white hover:bg-green-700"
              : t.to === "RULING" ? "bg-orange-500 text-white hover:bg-orange-600"
              : t.to === "APPEAL" ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-brand-500 text-white hover:bg-brand-600"}`}
          >
            {t.label}
          </button>
        ))}
        {transitions.length === 0 && (
          <p className="text-sm text-muted">No transitions available from this phase.</p>
        )}
      </div>
    </div>
  );
}
