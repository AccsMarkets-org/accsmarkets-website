"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RiskSeverity } from "@prisma/client";

interface RiskFactor {
  key: string;
  label: string;
  weight: number;
  detail?: string;
}

interface UserSnippet {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  createdAt: Date | string;
}

interface RiskScoreRow {
  id: string;
  userId: string;
  score: number;
  severity: RiskSeverity;
  factors: unknown;
  computedAt: Date | string;
  user: UserSnippet;
}

const SEVERITY_STYLE: Record<RiskSeverity, string> = {
  LOW: "bg-success/10 text-success",
  MEDIUM: "bg-warning/10 text-warning",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  CRITICAL: "bg-danger/10 text-danger",
};

function SeverityBadge({ severity }: { severity: RiskSeverity }) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", SEVERITY_STYLE[severity])}>
      {severity}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, score);
  const color = pct >= 75 ? "bg-danger" : pct >= 50 ? "bg-orange-500" : pct >= 25 ? "bg-warning" : "bg-success";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-surface-border">
        <div className={cn("h-1.5 rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted">{score}</span>
    </div>
  );
}

function EscalateModal({
  userId,
  onClose,
  onDone,
}: {
  userId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (reason.trim().length < 10) {
      setErr("Reason must be at least 10 characters.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/admin/risk/flagged-users?userId=${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "escalate", reason }),
    });
    setLoading(false);
    if (!res.ok) {
      setErr("Failed to escalate.");
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-background p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Escalate to CRITICAL</h3>
        <textarea
          className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-brand-400 focus:outline-none sm:text-sm"
          rows={4}
          placeholder="Reason for manual escalation (min 10 chars)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {err && <p className="mt-1 text-xs text-danger">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-60"
          >
            {loading ? "Escalating…" : "Escalate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RiskManagementPanel({ initialRiskScores }: { initialRiskScores: RiskScoreRow[] }) {
  const [rows, setRows] = useState(initialRiskScores);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [escalateUserId, setEscalateUserId] = useState<string | null>(null);

  async function dismiss(userId: string) {
    const res = await fetch(`/api/admin/risk/flagged-users?userId=${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
    });
    if (res.ok) setRows((prev) => prev.filter((r) => r.userId !== userId));
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface p-12 text-center text-sm text-muted">
        No flagged accounts. All clear.
      </div>
    );
  }

  return (
    <>
      {escalateUserId && (
        <EscalateModal
          userId={escalateUserId}
          onClose={() => setEscalateUserId(null)}
          onDone={() => {
            setEscalateUserId(null);
            setRows((prev) => prev.filter((r) => r.userId !== escalateUserId));
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-surface-border text-xs font-semibold uppercase tracking-widest text-muted">
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Score</th>
              <th className="px-4 py-3 text-left">Severity</th>
              <th className="px-4 py-3 text-left">Computed</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr
                  className="cursor-pointer transition hover:bg-surface-hover"
                  onClick={() => setExpandedId(expandedId === row.userId ? null : row.userId)}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/risk/${row.userId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-foreground hover:text-brand-600 hover:underline"
                    >
                      {row.user.name ?? row.user.username ?? "—"}
                    </Link>
                    <p className="text-xs text-muted">{row.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBar score={row.score} />
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={row.severity} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(row.computedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/admin/risk/${row.userId}`}
                        className="rounded-lg border border-brand-300 px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-500/5"
                      >
                        Details
                      </Link>
                      <button
                        onClick={() => setEscalateUserId(row.userId)}
                        className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/5"
                      >
                        Escalate
                      </button>
                      <button
                        onClick={() => dismiss(row.userId)}
                        className="rounded-lg border border-surface-border px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground"
                      >
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>

                {expandedId === row.userId && (
                  <tr key={`${row.id}-expanded`} className="bg-surface-hover/50">
                    <td colSpan={5} className="px-6 py-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
                        Risk Factors
                      </p>
                      {(row.factors as RiskFactor[]).length === 0 ? (
                        <p className="text-xs text-muted">No factors recorded.</p>
                      ) : (
                        <ul className="space-y-2">
                          {(row.factors as RiskFactor[]).map((f) => (
                            <li key={f.key} className="flex items-start gap-3">
                              <span
                                className={cn(
                                  "mt-0.5 h-2 w-2 flex-shrink-0 rounded-full",
                                  f.weight >= 35 ? "bg-danger" : f.weight >= 25 ? "bg-warning" : "bg-info",
                                )}
                              />
                              <div>
                                <p className="text-sm font-medium text-foreground">{f.label}</p>
                                {f.detail && <p className="text-xs text-muted">{f.detail}</p>}
                                <p className="text-xs text-muted">Weight: {f.weight}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
