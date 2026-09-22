"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Gift, Search, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useConfirm } from "@/hooks/useConfirm";
import { formatCurrency, formatDate } from "@/lib/utils";

type Tab = "active" | "expired" | "history";

interface SellerRef { id: string; name: string | null; username: string | null; email: string }

interface PromotedListing {
  id: string;
  title: string;
  platform: string;
  status: string;
  isFeatured: boolean;
  isPremiumFeatured: boolean;
  isPinned: boolean;
  featuredUntil: string | null;
  pinnedUntil: string | null;
  updatedAt: string;
  seller: SellerRef;
}

interface HistoryRow {
  id: string;
  type: "PROMOTION" | "BUMP";
  amount: number;
  promotionType: string;
  listingId: string | null;
  listingTitle: string | null;
  expiresAt: string | null;
  grantedByAdmin: boolean;
  user: SellerRef;
  createdAt: string;
}

interface Totals { revenue7d: number; revenue30d: number; revenueAll: number }

const TYPE_LABEL: Record<string, string> = {
  FEATURED_BOOST: "Featured",
  PREMIUM_FEATURED: "Premium",
  PINNED: "Pinned",
  BUMP: "Bump",
  PROMO_CREDIT: "Promo credit",
};

function typesOf(l: PromotedListing): string[] {
  const t: string[] = [];
  if (l.isPremiumFeatured) t.push("Premium");
  if (l.isFeatured) t.push("Featured");
  if (l.isPinned) t.push("Pinned");
  return t;
}

function sellerLabel(u: SellerRef) {
  return u.name ?? u.username ?? u.email;
}

export function PromotionsAdminClient() {
  const [tab, setTab] = useState<Tab>("active");
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<PromotedListing[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [totals, setTotals] = useState<Totals>({ revenue7d: 0, revenue30d: 0, revenueAll: 0 });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async (t: Tab, p = 0) => {
    setLoading(true);
    const res = await fetch(`/api/admin/promotions?tab=${t}&page=${p}`);
    if (res.ok) {
      const data = await res.json();
      if (t === "history") {
        setHistory(data.rows);
        setTotals(data.totals);
        setHasMore(data.pagination.hasMore);
      } else {
        setListings(data.listings);
      }
    } else {
      toast.error("Failed to load promotions");
    }
    setLoading(false);
  }, []);

  useEffect(() => { setPage(0); load(tab, 0); }, [tab, load]);

  async function extend(l: PromotedListing, days: 7 | 14) {
    const target = l.isFeatured || l.isPremiumFeatured ? "featured" : "pinned";
    setActing(l.id);
    const res = await fetch(`/api/admin/promotions/${l.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extend", days, target }),
    });
    const d = await res.json();
    if (res.ok) { toast.success(`Extended by ${days} days`); load(tab, page); }
    else toast.error(d.error ?? "Failed");
    setActing(null);
  }

  async function cancel(l: PromotedListing) {
    const ok = await confirm({
      title: "Cancel this promotion?",
      description: `"${l.title}" will lose its featured/pinned placement immediately. The seller will be notified.`,
      confirmLabel: "Cancel promotion",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (!ok) return;
    setActing(l.id);
    const res = await fetch(`/api/admin/promotions/${l.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const d = await res.json();
    if (res.ok) { toast.success("Promotion cancelled"); load(tab, page); }
    else toast.error(d.error ?? "Failed");
    setActing(null);
  }

  return (
    <div className="space-y-6">
      {ConfirmDialog}
      <AdminPageHeader
        title="Promotions"
        subtitle="Featured, premium and pinned listings — plus bump and promotion revenue"
        actions={
          <Button size="sm" onClick={() => setGrantOpen(true)}>
            <Gift className="h-4 w-4" aria-hidden />
            Grant promotion
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-surface p-1 max-w-md">
        {([["active", "Active"], ["expired", "Expired (30d)"], ["history", "History"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === k ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "history" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Revenue · 7 days", value: totals.revenue7d },
            { label: "Revenue · 30 days", value: totals.revenue30d },
            { label: "Revenue · all time", value: totals.revenueAll },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-surface-border bg-background p-5">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">{s.label}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{formatCurrency(s.value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-surface-border overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-8 text-center text-sm text-muted">Loading...</div>
        ) : tab === "history" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface text-left text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Listing</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {history.map((r) => (
                  <tr key={r.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${r.user.id}`} className="font-medium text-foreground hover:text-brand-600">
                        {sellerLabel(r.user)}
                      </Link>
                      <p className="text-xs text-muted">{r.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.listingId ? (
                        <Link href={`/listings/${r.listingId}`} className="hover:text-brand-600 line-clamp-1">
                          {r.listingTitle ?? r.listingId}
                        </Link>
                      ) : (
                        <span className="text-muted">— (wallet credit)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-600">
                        {TYPE_LABEL[r.promotionType] ?? r.promotionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">No promotion transactions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-surface text-left text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-3">Listing</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Since</th>
                  <th className="px-4 py-3">Expires</th>
                  {tab === "active" && <th className="px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {listings.map((l) => {
                  const types = typesOf(l);
                  const expires = l.featuredUntil ?? l.pinnedUntil;
                  const expired = expires ? new Date(expires) < new Date() : false;
                  return (
                    <tr key={l.id} className="hover:bg-surface/50">
                      <td className="px-4 py-3">
                        <Link href={`/listings/${l.id}`} className="font-medium text-foreground hover:text-brand-600 line-clamp-1">
                          {l.title}
                        </Link>
                        <p className="text-xs text-muted">{l.platform} · {l.status}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${l.seller.id}`} className="font-medium text-foreground hover:text-brand-600">
                          {sellerLabel(l.seller)}
                        </Link>
                        <p className="text-xs text-muted">{l.seller.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(types.length ? types : ["Expired"]).map((t) => (
                            <span key={t} className="inline-block rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-600">{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{formatDate(l.updatedAt)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {expires ? (
                          <span className={expired ? "text-danger" : "text-foreground"}>{formatDate(expires)}</span>
                        ) : (
                          <span className="text-muted">Never</span>
                        )}
                        {l.featuredUntil && l.pinnedUntil && (
                          <p className="text-muted">Pinned: {formatDate(l.pinnedUntil)}</p>
                        )}
                      </td>
                      {tab === "active" && (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" disabled={acting === l.id} onClick={() => extend(l, 7)}>+7d</Button>
                            <Button size="sm" variant="outline" disabled={acting === l.id} onClick={() => extend(l, 14)}>+14d</Button>
                            <Button size="sm" variant="danger" disabled={acting === l.id} onClick={() => cancel(l)}>Cancel</Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {listings.length === 0 && (
                  <tr>
                    <td colSpan={tab === "active" ? 6 : 5} className="px-4 py-8 text-center text-sm text-muted">
                      {tab === "active" ? "No active promotions." : "No promotions expired in the last 30 days."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {tab === "history" && (
        <div className="flex justify-between items-center text-xs text-muted">
          <button
            onClick={() => { const p = page - 1; setPage(p); load(tab, p); }}
            disabled={page === 0}
            className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface disabled:opacity-40"
          >
            Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            onClick={() => { const p = page + 1; setPage(p); load(tab, p); }}
            disabled={!hasMore}
            className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {grantOpen && (
        <GrantModal
          onClose={() => setGrantOpen(false)}
          onGranted={() => { setGrantOpen(false); if (tab === "active") load("active", 0); else setTab("active"); }}
        />
      )}
    </div>
  );
}

// ── Grant modal ────────────────────────────────────────────────────────────────

function GrantModal({ onClose, onGranted }: { onClose: () => void; onGranted: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PromotedListing[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<PromotedListing | null>(null);
  const [type, setType] = useState<"FEATURED_BOOST" | "PREMIUM_FEATURED" | "PINNED">("FEATURED_BOOST");
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/admin/promotions?tab=search&q=${encodeURIComponent(q)}`);
      if (res.ok) setResults((await res.json()).listings);
      setSearching(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function submit() {
    if (!selected) return;
    const d = Number(days);
    if (!Number.isInteger(d) || d < 1 || d > 90) { toast.error("Days must be between 1 and 90"); return; }
    setSubmitting(true);
    const res = await fetch("/api/admin/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: selected.id, type, days: d, reason: reason || undefined }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { toast.error(data.error ?? "Failed to grant"); return; }
    toast.success("Promotion granted");
    onGranted();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grant-title"
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="grant-title" className="text-base font-semibold text-foreground">Grant a free promotion</h2>
            <p className="mt-1 text-xs text-muted">Support gesture — no wallet charge. Logged to the audit trail.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-brand-500/8 hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {selected ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-400 bg-brand-500/10 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{selected.title}</p>
                <p className="truncate text-xs text-muted">{selected.platform} · {sellerLabel(selected.seller)} · {selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs font-medium text-brand-600 hover:underline shrink-0">Change</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                <Input
                  autoFocus
                  placeholder="Search by listing id or title…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {(results.length > 0 || searching) && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-surface-border divide-y divide-surface-border">
                  {searching && results.length === 0 && (
                    <p className="p-3 text-xs text-muted">Searching…</p>
                  )}
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="block w-full px-3 py-2 text-left hover:bg-brand-500/8"
                    >
                      <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                      <p className="truncate text-xs text-muted">{r.platform} · {sellerLabel(r.seller)}</p>
                    </button>
                  ))}
                </div>
              )}
              {query.trim().length >= 2 && !searching && results.length === 0 && (
                <p className="text-xs text-muted">No active listings match.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="h-10 rounded-xl border border-surface-border bg-background px-3 text-sm text-foreground focus:border-brand-400 focus:outline-none"
              >
                <option value="FEATURED_BOOST">Featured boost</option>
                <option value="PREMIUM_FEATURED">Premium featured</option>
                <option value="PINNED">Pinned</option>
              </select>
            </div>
            <Input label="Days (1–90)" type="number" min={1} max={90} value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <Input label="Reason (optional, audit only)" placeholder="e.g. compensation for support ticket #123" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} isLoading={submitting} disabled={!selected}>Grant</Button>
        </div>
      </div>
    </>
  );
}
