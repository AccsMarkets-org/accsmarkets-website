"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { relativeTime } from "@/lib/utils";

interface EscrowUser {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
}

interface PinnedMessage {
  id: string;
  content: string;
  pinnedAt: string | null;
  sender: { name: string | null; role: string };
}

interface EscrowRow {
  id: string;
  status: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
  buyer: EscrowUser;
  seller: EscrowUser;
  listing: { id: string; title: string } | null;
  _count: { messages: number };
  messages: PinnedMessage[];
}

const STATUS_FILTERS = ["ACTIVE", "PENDING", "DISPUTED", "COMPLETED", "ALL"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  DISPUTED: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  COMPLETED: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  CANCELLED: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
};

export function EscrowSupportClient() {
  const [escrows, setEscrows] = useState<EscrowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  async function fetchEscrows(status: StatusFilter, p: number) {
    setLoading(true);
    const res = await fetch(`/api/admin/escrow-support?status=${status}&page=${p}`);
    if (res.ok) {
      const data = await res.json();
      setEscrows(data.escrows);
      setHasMore(data.pagination.hasMore);
      setTotal(data.pagination.total);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchEscrows(statusFilter, 0);
    setPage(0);
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Escrow Support</h1>
        <p className="mt-1 text-sm text-muted">Monitor escrow conversations and manage pinned messages</p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              statusFilter === s
                ? "bg-brand-500 text-white"
                : "bg-surface text-muted hover:bg-surface-border hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-2 flex items-center text-xs text-muted">{total} total</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="animate-pulse rounded-2xl border border-surface-border bg-background p-8 text-center text-sm text-muted">
          Loading escrows...
        </div>
      ) : (
        <div className="rounded-2xl border border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface text-left text-xs text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Escrow</th>
                <th className="px-4 py-3">Parties</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Messages</th>
                <th className="px-4 py-3">Pinned</th>
                <th className="px-4 py-3">Last Activity</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {escrows.map((e) => (
                <tr key={e.id} className="hover:bg-surface/50 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground font-mono text-xs">{e.id.slice(-8)}</p>
                    {e.listing && (
                      <p className="mt-0.5 text-xs text-muted line-clamp-1">{e.listing.title}</p>
                    )}
                    <p className="mt-0.5 text-xs font-semibold text-foreground">${Number(e.amount).toFixed(2)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div>
                        <span className="text-[10px] text-muted uppercase font-bold">Buyer</span>
                        <p className="text-xs text-foreground">{e.buyer.name ?? e.buyer.username ?? e.buyer.email}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted uppercase font-bold">Seller</span>
                        <p className="text-xs text-foreground">{e.seller.name ?? e.seller.username ?? e.seller.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[e.status] ?? "bg-surface text-muted"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-foreground">
                      {e._count.messages}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {e.messages.length > 0 ? (
                      <div className="space-y-1 max-w-[200px]">
                        {e.messages.map((p) => (
                          <p key={p.id} className="text-xs text-amber-700 dark:text-amber-400 line-clamp-2">
                            📌 {p.content}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {relativeTime(e.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/escrows/${e.id}`}
                      className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface transition"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {escrows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                    No escrows found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted">
        <button
          onClick={() => { const p = page - 1; setPage(p); fetchEscrows(statusFilter, p); }}
          disabled={page === 0}
          className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface disabled:opacity-40"
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          onClick={() => { const p = page + 1; setPage(p); fetchEscrows(statusFilter, p); }}
          disabled={!hasMore}
          className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
