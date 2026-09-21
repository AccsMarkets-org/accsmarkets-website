"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PendingRequest {
  id: string;
  status: string;
  requestedAt: string;
  user: { id: string; email: string; name: string | null; createdAt: string };
}

interface ResolvedRequest {
  id: string;
  status: string;
  completedAt: string | null;
  user: { id: string; email: string; name: string | null };
}

interface Props {
  pending: PendingRequest[];
  resolved: ResolvedRequest[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-warning/10 text-warning",
    REVIEWING: "bg-info/10 text-info",
    COMPLETED: "bg-success/10 text-success",
    DENIED: "bg-danger/10 text-danger",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-surface text-muted"}`}>
      {status}
    </span>
  );
}

function RequestRow({ req, onAction }: { req: PendingRequest; onAction: () => void }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function act(action: "mark_reviewing" | "anonymize" | "deny") {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/legal/erasure-requests/${req.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "mark_reviewing" ? { action } : { action, adminNotes: notes }),
      });
      const json = await res.json();
      if (!res.ok) { setMsg(json.error ?? "Failed"); return; }
      router.refresh();
      onAction();
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  const daysSinceRequest = Math.floor(
    (Date.now() - new Date(req.requestedAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">{req.user.name ?? req.user.email}</p>
          <p className="text-sm text-muted">{req.user.email}</p>
          <p className="mt-1 text-xs text-muted">
            Requested {daysSinceRequest === 0 ? "today" : `${daysSinceRequest}d ago`} ·
            Member since {new Date(req.user.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={req.status} />
          {req.status === "PENDING" && (
            <button
              onClick={() => act("mark_reviewing")}
              disabled={loading}
              className="rounded-lg border border-surface-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand-300 disabled:opacity-60"
            >
              Mark reviewing
            </button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg border border-surface-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand-300"
          >
            {expanded ? "Collapse" : "Actions"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-surface-border pt-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Admin notes (required for anonymize/deny)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Reason for action…"
              className="w-full rounded-xl border border-surface-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:text-sm"
            />
          </div>
          {msg && <p className="text-sm text-danger">{msg}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => act("anonymize")}
              disabled={loading || notes.length < 5}
              className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger/80 disabled:opacity-60"
            >
              Anonymize account
            </button>
            <button
              onClick={() => act("deny")}
              disabled={loading || notes.length < 5}
              className="rounded-xl border border-surface-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand-300 disabled:opacity-60"
            >
              Deny request
            </button>
          </div>
          <p className="text-xs text-muted">
            Anonymize: removes PII, retains financial records. Deny: request closed with no changes.
          </p>
        </div>
      )}
    </div>
  );
}

export function AdminErasureQueue({ pending, resolved }: Props) {
  const [, setRefreshKey] = useState(0);

  return (
    <div className="space-y-8">
      {/* Pending */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
          Pending review ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-surface-border bg-surface p-8 text-center text-sm text-muted">
            No erasure requests pending.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((req) => (
              <RequestRow key={req.id} req={req} onAction={() => setRefreshKey((k) => k + 1)} />
            ))}
          </div>
        )}
      </section>

      {/* Resolved */}
      {resolved.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
            Recently resolved
          </h2>
          <div className="overflow-hidden rounded-2xl border border-surface-border">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="border-b border-surface-border bg-surface">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {resolved.map((r) => (
                  <tr key={r.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 text-foreground">{r.user.email}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-muted">
                      {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
