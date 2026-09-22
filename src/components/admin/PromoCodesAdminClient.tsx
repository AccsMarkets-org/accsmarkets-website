"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Copy, Plus, RefreshCw, Users, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useConfirm } from "@/hooks/useConfirm";
import { formatDate } from "@/lib/utils";

type PromoType = "PERCENT_OFF_FEE" | "FLAT_CREDIT";
type Status = "ACTIVE" | "EXPIRED" | "EXHAUSTED";

interface PromoRow {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  createdAt: string;
  status: Status;
}

interface Stats { total: number; active: number; redemptions: number }

interface RedemptionRow {
  id: string;
  redeemedAt: string;
  consumedAt: string | null;
  user: { id: string; name: string | null; username: string | null; email: string };
}

function valueLabel(c: { type: PromoType; value: number }) {
  return c.type === "PERCENT_OFF_FEE" ? `${c.value}% off escrow fee` : `$${c.value.toFixed(2)} wallet credit`;
}

const STATUS_CLASS: Record<Status, string> = {
  ACTIVE: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  EXPIRED: "bg-surface text-muted",
  EXHAUSTED: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
};

export function PromoCodesAdminClient() {
  const [codes, setCodes] = useState<PromoRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, redemptions: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [drawer, setDrawer] = useState<PromoRow | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async (p = 0, q = "") => {
    setLoading(true);
    const res = await fetch(`/api/admin/promo-codes?page=${p}&q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setCodes(data.codes);
      setStats(data.stats);
      setHasMore(data.pagination.hasMore);
    } else {
      toast.error("Failed to load promo codes");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => { setPage(0); load(0, query.trim()); }, 250);
    return () => clearTimeout(handle);
  }, [query, load]);

  async function patch(c: PromoRow, body: Record<string, unknown>, successMsg: string) {
    setActing(c.id);
    const res = await fetch(`/api/admin/promo-codes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (res.ok) { toast.success(successMsg); load(page, query.trim()); }
    else toast.error(d.error ?? "Failed");
    setActing(null);
  }

  async function disable(c: PromoRow) {
    const ok = await confirm({
      title: `Disable ${c.code}?`,
      description: "Its expiry will be set to now, so it can no longer be redeemed. You can re-enable it later.",
      confirmLabel: "Disable",
      destructive: true,
    });
    if (!ok) return;
    patch(c, { action: "disable" }, "Promo code disabled");
  }

  async function enable(c: PromoRow) {
    patch(c, { action: "enable", expiresAt: null }, "Promo code enabled (no expiry)");
  }

  async function remove(c: PromoRow) {
    const ok = await confirm({
      title: `Delete ${c.code}?`,
      description: "This permanently removes the code. Only possible while it has zero redemptions.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setActing(c.id);
    const res = await fetch(`/api/admin/promo-codes/${c.id}`, { method: "DELETE" });
    const d = await res.json();
    if (res.ok) { toast.success("Promo code deleted"); load(page, query.trim()); }
    else toast.error(d.error ?? "Failed");
    setActing(null);
  }

  function copy(code: string) {
    navigator.clipboard.writeText(code).then(() => toast.success("Copied")).catch(() => null);
  }

  return (
    <div className="space-y-6">
      {ConfirmDialog}
      <AdminPageHeader
        title="Promo codes"
        subtitle="Escrow-fee discounts and wallet credits"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            New code
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total codes", value: stats.total, color: "text-foreground" },
          { label: "Active", value: stats.active, color: "text-green-600" },
          { label: "Redemptions", value: stats.redemptions, color: "text-brand-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-surface-border bg-background p-5">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder="Search code…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
        <Button variant="outline" size="sm" onClick={() => load(page, query.trim())} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="rounded-2xl border border-surface-border overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-8 text-center text-sm text-muted">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface text-left text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Redemptions</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-foreground">{c.code}</span>
                        <button onClick={() => copy(c.code)} className="rounded p-0.5 text-muted hover:text-foreground" aria-label="Copy code">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-muted">Created {formatDate(c.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.type === "PERCENT_OFF_FEE" ? "Fee discount" : "Wallet credit"}
                    </td>
                    <td className="px-4 py-3 font-medium">{valueLabel(c)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDrawer(c)}
                        className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline"
                      >
                        <Users className="h-3.5 w-3.5" aria-hidden />
                        {c.redemptionCount}{c.maxRedemptions !== null ? ` / ${c.maxRedemptions}` : " / ∞"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {c.expiresAt ? formatDate(c.expiresAt) : <span className="text-muted">Never</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {c.status === "EXPIRED" ? (
                          <Button size="sm" variant="outline" disabled={acting === c.id} onClick={() => enable(c)}>Enable</Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled={acting === c.id} onClick={() => disable(c)}>Disable</Button>
                        )}
                        {c.redemptionCount === 0 && (
                          <Button size="sm" variant="danger" disabled={acting === c.id} onClick={() => remove(c)}>Delete</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {codes.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">No promo codes yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-xs text-muted">
        <button
          onClick={() => { const p = page - 1; setPage(p); load(p, query.trim()); }}
          disabled={page === 0}
          className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface disabled:opacity-40"
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          onClick={() => { const p = page + 1; setPage(p); load(p, query.trim()); }}
          disabled={!hasMore}
          className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); setPage(0); load(0, query.trim()); }}
        />
      )}
      {drawer && <RedemptionsDrawer promo={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}

// ── Create modal ───────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [auto, setAuto] = useState(true);
  const [code, setCode] = useState("");
  const [type, setType] = useState<PromoType>("PERCENT_OFF_FEE");
  const [value, setValue] = useState("10");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function submit() {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) { toast.error("Enter a positive value"); return; }
    if (type === "PERCENT_OFF_FEE" && v > 100) { toast.error("Percent cannot exceed 100"); return; }
    const max = maxRedemptions.trim() === "" ? null : Number(maxRedemptions);
    if (max !== null && (!Number.isInteger(max) || max <= 0)) { toast.error("Max redemptions must be a positive whole number"); return; }
    const exp = expiresAt ? new Date(expiresAt) : null;
    if (exp && Number.isNaN(exp.getTime())) { toast.error("Invalid expiry date"); return; }

    setSubmitting(true);
    const res = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: auto ? undefined : code.trim(),
        type,
        value: v,
        maxRedemptions: max,
        expiresAt: exp ? exp.toISOString() : null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { toast.error(data.error ?? "Failed to create"); return; }
    toast.success(`Created ${data.code}`);
    onCreated();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-promo-title"
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="create-promo-title" className="text-base font-semibold text-foreground">New promo code</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-brand-500/8 hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-1 rounded-xl bg-background p-1">
              {([["auto", "Auto-generate"], ["custom", "Custom code"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setAuto(k === "auto")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    (k === "auto") === auto ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {!auto && (
              <Input
                placeholder="e.g. WELCOME10"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PromoType)}
                className="h-10 rounded-xl border border-surface-border bg-background px-3 text-sm text-foreground focus:border-brand-400 focus:outline-none"
              >
                <option value="PERCENT_OFF_FEE">% off escrow fee</option>
                <option value="FLAT_CREDIT">Flat wallet credit ($)</option>
              </select>
            </div>
            <Input
              label={type === "PERCENT_OFF_FEE" ? "Discount (%)" : "Credit (USD)"}
              type="number"
              min={0.01}
              step={type === "PERCENT_OFF_FEE" ? 1 : 0.01}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Max redemptions (blank = unlimited)"
              type="number"
              min={1}
              placeholder="∞"
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
            />
            <Input
              label="Expires (blank = never)"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <p className="rounded-xl bg-background px-3 py-2 text-xs text-muted">
            {type === "PERCENT_OFF_FEE"
              ? "Fee discounts are applied once to the redeemer's next escrow checkout."
              : "Flat credits are added to the redeemer's wallet immediately on redemption."}
            {" "}Each user can redeem a given code once.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} isLoading={submitting} disabled={!auto && code.trim().length < 3}>Create</Button>
        </div>
      </div>
    </>
  );
}

// ── Redemptions drawer ─────────────────────────────────────────────────────────

function RedemptionsDrawer({ promo, onClose }: { promo: PromoRow; onClose: () => void }) {
  const [rows, setRows] = useState<RedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/admin/promo-codes/${promo.id}/redemptions?page=${p}`);
    if (res.ok) {
      const d = await res.json();
      setRows(d.redemptions);
      setHasMore(d.pagination.hasMore);
    }
    setLoading(false);
  }, [promo.id]);

  useEffect(() => { load(0); }, [load]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" aria-hidden onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="redemptions-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-surface-border bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-border p-5">
          <div>
            <h2 id="redemptions-title" className="text-base font-semibold text-foreground">
              Redemptions · <span className="font-mono">{promo.code}</span>
            </h2>
            <p className="mt-0.5 text-xs text-muted">{valueLabel(promo)}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-brand-500/8 hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="animate-pulse p-8 text-center text-sm text-muted">Loading...</div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">No one has redeemed this code yet.</p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/users/${r.user.id}`} className="truncate text-sm font-medium text-foreground hover:text-brand-600">
                      {r.user.name ?? r.user.username ?? r.user.email}
                    </Link>
                    <p className="truncate text-xs text-muted">{r.user.email}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p className="text-foreground">{formatDate(r.redeemedAt)}</p>
                    {promo.type === "PERCENT_OFF_FEE" && (
                      <p className={r.consumedAt ? "text-muted" : "text-amber-600"}>
                        {r.consumedAt ? `Used ${formatDate(r.consumedAt)}` : "Not yet used"}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(page > 0 || hasMore) && (
          <div className="flex items-center justify-between border-t border-surface-border px-5 py-3 text-xs text-muted">
            <button
              onClick={() => { const p = page - 1; setPage(p); load(p); }}
              disabled={page === 0}
              className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-background disabled:opacity-40"
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              onClick={() => { const p = page + 1; setPage(p); load(p); }}
              disabled={!hasMore}
              className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-background disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
