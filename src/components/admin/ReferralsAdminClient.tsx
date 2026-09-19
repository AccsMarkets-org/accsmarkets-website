"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface ReferralUser {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  createdAt: string;
}

interface ReferralRow {
  id: string;
  referrerId: string;
  status: "PENDING" | "REWARDED";
  rewardedAt: string | null;
  createdAt: string;
  referee: ReferralUser;
  referralCode: {
    code: string;
    user: ReferralUser;
  };
}

interface TopReferrer {
  user: ReferralUser | null;
  count: number;
}

interface Stats {
  total: number;
  rewarded: number;
  pending: number;
}

export function ReferralsAdminClient() {
  const [stats, setStats] = useState<Stats>({ total: 0, rewarded: 0, pending: 0 });
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "REWARDED">("ALL");
  const [acting, setActing] = useState<string | null>(null);

  async function fetchData(p = 0) {
    setLoading(true);
    const res = await fetch(`/api/admin/referrals?page=${p}`);
    if (res.ok) {
      const data = await res.json();
      setStats(data.stats);
      setReferrals(data.referrals);
      setTopReferrers(data.topReferrers);
      setHasMore(data.pagination.hasMore);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(0); }, []);

  async function doAction(referralId: string, action: "reward" | "reset") {
    setActing(referralId);
    const res = await fetch("/api/admin/referrals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralId, action }),
    });
    if (res.ok) {
      toast.success(action === "reward" ? "Marked as rewarded" : "Reset to pending");
      fetchData(page);
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed");
    }
    setActing(null);
  }

  const filtered = filter === "ALL" ? referrals : referrals.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Referrals</h1>
        <p className="mt-1 text-sm text-muted">Track and manage the referral program</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Referrals", value: stats.total, color: "text-foreground" },
          { label: "Rewarded", value: stats.rewarded, color: "text-green-600" },
          { label: "Pending", value: stats.pending, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-surface-border bg-background p-5">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main table */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filter tabs */}
          <div className="flex gap-1 rounded-xl bg-surface p-1">
            {(["ALL", "PENDING", "REWARDED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filter === f ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-surface-border overflow-hidden">
            {loading ? (
              <div className="animate-pulse p-8 text-center text-sm text-muted">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-xs text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3">Referee</th>
                    <th className="px-4 py-3">Referred by</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-surface/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{r.referee.name ?? r.referee.username ?? "—"}</p>
                        <p className="text-xs text-muted">{r.referee.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{r.referralCode.user.name ?? r.referralCode.user.username ?? "—"}</p>
                        <p className="text-xs text-muted font-mono">{r.referralCode.code}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.status === "REWARDED"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                        }`}>
                          {r.status}
                        </span>
                        {r.rewardedAt && (
                          <p className="text-xs text-muted mt-0.5">{new Date(r.rewardedAt).toLocaleDateString()}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "PENDING" ? (
                          <button
                            onClick={() => doAction(r.id, "reward")}
                            disabled={acting === r.id}
                            className="rounded-lg bg-green-50 dark:bg-green-950/40 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/60 disabled:opacity-50"
                          >
                            {acting === r.id ? "..." : "Mark Rewarded"}
                          </button>
                        ) : (
                          <button
                            onClick={() => doAction(r.id, "reset")}
                            disabled={acting === r.id}
                            className="rounded-lg bg-surface px-2 py-1 text-xs font-medium text-muted hover:bg-surface-border disabled:opacity-50"
                          >
                            {acting === r.id ? "..." : "Reset"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                        No referrals found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center text-xs text-muted">
            <button
              onClick={() => { const p = page - 1; setPage(p); fetchData(p); }}
              disabled={page === 0}
              className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface disabled:opacity-40"
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              onClick={() => { const p = page + 1; setPage(p); fetchData(p); }}
              disabled={!hasMore}
              className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {/* Top referrers sidebar */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Top Referrers</h2>
          <div className="rounded-2xl border border-surface-border bg-background divide-y divide-surface-border overflow-hidden">
            {topReferrers.length === 0 && (
              <p className="p-4 text-center text-sm text-muted">No referrers yet.</p>
            )}
            {topReferrers.map((tr, i) => (
              <div key={tr.user?.id ?? i} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-xs font-bold text-brand-600">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground text-sm">
                    {tr.user?.name ?? tr.user?.username ?? tr.user?.email ?? "Unknown"}
                  </p>
                  {tr.user?.email && (
                    <p className="truncate text-xs text-muted">{tr.user.email}</p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-bold text-brand-600">
                  {tr.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
