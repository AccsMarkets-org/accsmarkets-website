"use client";

import Link from "next/link";
import { LayoutGrid, Plus, Wallet } from "lucide-react";

export function DashboardHeaderActions({ balance }: { balance: number }) {
  return (
    <div className="flex items-center gap-2">
      {/* Browse — hidden on mobile (BottomTabBar handles it) */}
      <Link
        href="/listings"
        className="hidden sm:flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-brand-500/8 hover:text-brand-600 transition"
      >
        <LayoutGrid className="h-4 w-4" aria-hidden />
        Browse
      </Link>

      {/* Balance chip */}
      <Link
        href="/dashboard/wallet"
        aria-label={`Wallet balance $${balance.toFixed(2)}`}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-brand-500/8 hover:text-brand-600 transition"
      >
        <Wallet className="h-4 w-4 text-brand-500" aria-hidden />
        <span className="whitespace-nowrap">${balance.toFixed(2)}</span>
      </Link>

      {/* Upload Listing */}
      <Link
        href="/dashboard/listings/new"
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 transition shadow-sm whitespace-nowrap"
      >
        <Plus className="h-4 w-4 shrink-0" aria-hidden />
        List
      </Link>
    </div>
  );
}
