"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ExportRequest {
  id: string;
  status: string;
  requestedAt: string;
  completedAt: string | null;
}

interface ErasureRequest {
  id: string;
  status: string;
  requestedAt: string;
}

interface Props {
  exportRequests: ExportRequest[];
  erasureRequests: ErasureRequest[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-warning/10 text-warning",
    READY: "bg-success/10 text-success",
    COMPLETED: "bg-success/10 text-success",
    REVIEWING: "bg-info/10 text-info",
    EXPIRED: "bg-muted/10 text-muted",
    DENIED: "bg-danger/10 text-danger",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-surface text-muted"}`}>
      {status}
    </span>
  );
}

export function PrivacySettingsClient({ exportRequests, erasureRequests }: Props) {
  const router = useRouter();
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function requestExport() {
    setExportLoading(true);
    setExportMsg("");
    try {
      const res = await fetch("/api/user/export-data", { method: "POST" });
      const json = await res.json();
      if (!res.ok) setExportMsg(json.error ?? "Failed");
      else {
        setExportMsg(json.message);
        router.refresh();
      }
    } finally {
      setExportLoading(false);
    }
  }

  async function requestDeletion() {
    setDeleteLoading(true);
    setDeleteMsg("");
    try {
      const res = await fetch("/api/user/request-deletion", { method: "POST" });
      const json = await res.json();
      if (!res.ok) setDeleteMsg(json.error ?? "Failed");
      else {
        setDeleteMsg(json.message);
        setShowDeleteConfirm(false);
        router.refresh();
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  const hasPendingErasure = erasureRequests.some((r) => ["PENDING", "REVIEWING"].includes(r.status));

  return (
    <div className="space-y-8">
      {/* Download data */}
      <section className="rounded-2xl border border-surface-border bg-surface p-6">
        <h2 className="mb-1 text-base font-semibold text-foreground">Download your data</h2>
        <p className="mb-4 text-sm text-muted">
          Export a copy of your profile, listings, escrows, transactions, reviews, and messages.
          You will receive an email when the archive is ready.
        </p>
        <button
          onClick={requestExport}
          disabled={exportLoading}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {exportLoading ? "Requesting…" : "Request data export"}
        </button>
        {exportMsg && <p className="mt-3 text-sm text-muted">{exportMsg}</p>}

        {exportRequests.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Recent requests</p>
            {exportRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-surface-border px-4 py-2 text-sm">
                <span className="text-muted">{new Date(r.requestedAt).toLocaleDateString()}</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delete account */}
      <section className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
        <h2 className="mb-1 text-base font-semibold text-danger">Delete account</h2>
        <p className="mb-4 text-sm text-muted">
          Submits a deletion request for admin review. Because AccsMarkets processes financial
          transactions, records required for audit and compliance will be retained in anonymized
          form — your PII (name, email, messages) will be removed.
        </p>
        <p className="mb-4 text-sm font-medium text-muted">
          You cannot request deletion while you have open escrows or active disputes.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={hasPendingErasure}
            className="rounded-xl border border-danger/40 bg-background px-5 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/5 disabled:opacity-60"
          >
            {hasPendingErasure ? "Deletion request already submitted" : "Delete my account"}
          </button>
        ) : (
          <div className="space-y-3 rounded-xl border border-danger/30 bg-background p-4">
            <p className="text-sm font-semibold text-danger">Are you sure?</p>
            <p className="text-sm text-muted">
              This action is irreversible. Your account will be anonymized and you will be logged out.
            </p>
            <div className="flex gap-2">
              <button
                onClick={requestDeletion}
                disabled={deleteLoading}
                className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger/80 disabled:opacity-60"
              >
                {deleteLoading ? "Submitting…" : "Yes, delete my account"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl border border-surface-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand-300"
              >
                Cancel
              </button>
            </div>
            {deleteMsg && <p className="text-sm text-muted">{deleteMsg}</p>}
          </div>
        )}

        {erasureRequests.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Deletion requests</p>
            {erasureRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-surface-border px-4 py-2 text-sm">
                <span className="text-muted">{new Date(r.requestedAt).toLocaleDateString()}</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
