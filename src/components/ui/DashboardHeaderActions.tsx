"use client";

import Link from "next/link";

export function DashboardHeaderActions({ balance }: { balance: number }) {
  return (
    <div className="flex items-center gap-2">
      {/* Browse — hidden on mobile (BottomTabBar handles it) */}
      <Link
        href="/listings"
        className="hidden sm:flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-brand-500/8 hover:text-brand-600 transition"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        Browse
      </Link>

      {/* Balance chip */}
      <Link
        href="/dashboard/wallet"
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-brand-500/8 hover:text-brand-600 transition"
      >
        <span className="text-base leading-none">💰</span>
        <span className="whitespace-nowrap">${balance.toFixed(2)}</span>
      </Link>

      {/* Upload Listing */}
      <Link
        href="/dashboard/listings/new"
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 transition shadow-sm whitespace-nowrap"
      >
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        List
      </Link>
    </div>
  );
}
