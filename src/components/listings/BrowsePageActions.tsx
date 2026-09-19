"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function BrowsePageActions() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.user?.walletBalance === "number") setBalance(d.user.walletBalance);
        else if (d.user?.walletBalance != null) setBalance(Number(d.user.walletBalance));
      })
      .catch(() => null);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Balance */}
      <Link
        href="/dashboard/wallet"
        className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-brand-500/8 hover:text-brand-600 transition"
      >
        <span className="text-base leading-none">💰</span>
        <span>{balance !== null ? `$${balance.toFixed(2)}` : "Wallet"}</span>
      </Link>

      {/* Messages */}
      <Link
        href="/dashboard/messages"
        className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-brand-500/8 hover:text-brand-600 transition"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
        </svg>
        Messages
      </Link>

      {/* Add Listing */}
      <Link
        href="/dashboard/listings/new"
        className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 transition shadow-sm"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Listing
      </Link>
    </div>
  );
}
