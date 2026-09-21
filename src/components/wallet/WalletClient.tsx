"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { isCreditTransaction } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface TxRow {
  id: string;
  type: string;
  amount: string;
  status: string;
  reference: string | null;
  createdAt: string;
}

interface Props {
  totalBalance: number;
  available: number;
  reserved: number;
  totalDeposited: number;
  totalEarned: number;
  transactions: TxRow[];
}

const TX_ICONS: Record<string, React.ReactNode> = {
  DEPOSIT: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  ),
  WALLET_CREDIT: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
    </svg>
  ),
  WITHDRAWAL: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12l7 7 7-7"/>
    </svg>
  ),
  ESCROW_HOLD: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  ESCROW_PAYMENT: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  ESCROW_RELEASE: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  PLATFORM_FEE: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
    </svg>
  ),
  REFUND: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6 6-6"/>
    </svg>
  ),
};

const TX_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  ESCROW_PAYMENT: "Escrow Payment",
  ESCROW_RELEASE: "Escrow Release",
  PLATFORM_FEE: "Platform Fee",
  REFUND: "Refund",
  WALLET_CREDIT: "Wallet Credit",
  WALLET_DEBIT: "Wallet Debit",
  PROMOTION: "Promotion",
  BUMP: "Listing Bump",
  SUBSCRIPTION: "Subscription",
};

const STATUS_PILL: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning",
  COMPLETED: "bg-success/10 text-success",
  FAILED: "bg-danger/10 text-danger",
  CANCELLED: "bg-muted/10 text-muted",
};

const TYPE_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "DEPOSIT", label: "Deposits" },
  { key: "WITHDRAWAL", label: "Withdrawals" },
  { key: "ESCROW_PAYMENT", label: "Escrow" },
  { key: "ESCROW_RELEASE", label: "Releases" },
  { key: "PLATFORM_FEE", label: "Fees" },
];

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Build a mini 30-day activity sparkline from transactions
function buildMiniSparkline(txs: TxRow[]): string {
  const DAYS = 30;
  const buckets = new Array(DAYS).fill(0) as number[];
  const now = Date.now();
  const dayMs = 86_400_000;
  for (const tx of txs) {
    const age = Math.floor((now - new Date(tx.createdAt).getTime()) / dayMs);
    if (age >= 0 && age < DAYS && isCreditTransaction(tx.type as import("@prisma/client").TransactionType)) {
      buckets[DAYS - 1 - age] += Number(tx.amount);
    }
  }
  const max = Math.max(...buckets, 1);
  const W = 200, H = 40, step = W / (DAYS - 1);
  const pts = buckets.map((v, i) => `${i * step},${H - (v / max) * H}`).join(" ");
  return pts;
}

export function WalletClient({ totalBalance, available, reserved, totalDeposited, totalEarned, transactions }: Props) {
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = transactions.filter((tx) => {
    if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
    if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !tx.type.toLowerCase().includes(q) &&
        !(tx.reference ?? "").toLowerCase().includes(q) &&
        !(TX_LABELS[tx.type] ?? "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const sparkPts = buildMiniSparkline(transactions);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
          <p className="mt-0.5 text-sm text-muted">
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/wallet/withdraw"
            className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:border-brand-300 hover:bg-brand-500/8 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
            Withdraw
          </Link>
          <Link
            href="/dashboard/wallet/deposit"
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
            Add Funds
          </Link>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Main balance card with sparkline */}
        <div className="sm:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-5 shadow-lg">
          {/* Background sparkline */}
          <svg
            className="absolute bottom-0 left-0 right-0 opacity-20"
            viewBox={`0 0 200 40`}
            preserveAspectRatio="none"
            style={{ height: "60px", width: "100%" }}
          >
            <polyline points={sparkPts} fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/70">Available Balance</p>
                <p className="mt-1 text-4xl font-bold text-white">{formatCurrency(available.toString())}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-white/70">
              <span>
                Total: <strong className="text-white">{formatCurrency(totalBalance.toString())}</strong>
              </span>
              {reserved > 0 && (
                <span>
                  Reserved: <strong className="text-white/90">{formatCurrency(reserved.toString())}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats tiles */}
        <Card className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Total Deposited</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalDeposited.toString())}</p>
          <p className="text-xs text-muted">All-time deposits</p>
        </Card>

        <Card className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Total Earned</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalEarned.toString())}</p>
          <p className="text-xs text-muted">From completed sales</p>
        </Card>
      </div>

      {/* Reserved info */}
      {reserved > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <p className="text-sm text-foreground">
            <strong>{formatCurrency(reserved.toString())}</strong> is reserved in active escrows.
            {" "}
            <Link href="/dashboard/escrows" className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline">
              View escrows
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </p>
        </div>
      )}

      {/* Transaction history */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Transaction History</h2>
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm">
            <svg className="h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions…"
              className="w-44 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
            />
          </div>
        </div>

        {/* Type filter tabs + status select */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-1">
            {TYPE_FILTERS.map((f) => {
              const cnt = f.key === "ALL" ? transactions.length : transactions.filter((t) => t.type === f.key).length;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTypeFilter(f.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition",
                    typeFilter === f.key
                      ? "bg-brand-500 text-white"
                      : "border border-surface-border bg-surface text-muted hover:text-foreground hover:border-brand-300",
                  )}
                >
                  {f.label}
                  {cnt > 0 && (
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                      typeFilter === f.key ? "bg-white/20 text-white" : "bg-surface-border text-muted",
                    )}>
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Status filter — separate row on mobile so it's always reachable */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="shrink-0 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-muted focus:border-brand-400 focus:outline-none"
          >
            <option value="ALL">All statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Transaction list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-surface-border py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-border">
              <svg className="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">No transactions found</p>
              <p className="mt-1 text-sm text-muted">
                {transactions.length === 0 ? "Deposit funds to get started." : "Try a different filter."}
              </p>
            </div>
            {transactions.length === 0 && (
              <Link
                href="/dashboard/wallet/deposit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
              >
                Add funds
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            {filtered.map((tx, i) => {
              const credit = isCreditTransaction(tx.type as import("@prisma/client").TransactionType);
              const icon = TX_ICONS[tx.type] ?? TX_ICONS.DEPOSIT;
              const label = TX_LABELS[tx.type] ?? tx.type.replace(/_/g, " ");
              const date = new Date(tx.createdAt);
              const fullDate = date.toLocaleDateString(undefined, {
                month: "short", day: "numeric", year: "numeric",
              });
              const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

              return (
                <div
                  key={tx.id}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 transition hover:bg-brand-500/8/30",
                    i > 0 && "border-t border-surface-border",
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    credit ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
                    tx.type === "ESCROW_PAYMENT" && "bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400",
                    tx.type === "PLATFORM_FEE" && "bg-surface-border text-muted",
                  )}>
                    {icon}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-medium text-foreground">{label}</p>
                      <p className={cn(
                        "shrink-0 font-bold tabular-nums",
                        credit ? "text-success" : "text-foreground",
                      )}>
                        {credit ? "+" : "−"}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_PILL[tx.status] ?? STATUS_PILL.CANCELLED)}>
                          {tx.status}
                        </span>
                        {tx.reference && (
                          <span className="truncate max-w-[120px] text-[10px] font-mono text-muted">
                            {tx.reference}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-muted" title={`${fullDate} ${time}`}>
                          {relTime(tx.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        {filtered.length > 0 && (
          <p className="text-center text-xs text-muted">
            Showing {filtered.length} of {transactions.length} transactions
          </p>
        )}
      </div>
    </div>
  );
}
