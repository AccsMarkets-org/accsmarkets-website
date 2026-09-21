"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Plus, Wallet } from "lucide-react";

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
        <Wallet className="h-4 w-4 text-brand-500" aria-hidden />
        <span>{balance !== null ? `$${balance.toFixed(2)}` : "Wallet"}</span>
      </Link>

      {/* Messages */}
      <Link
        href="/dashboard/messages"
        className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-brand-500/8 hover:text-brand-600 transition"
      >
        <MessageSquare className="h-4 w-4" aria-hidden />
        Messages
      </Link>

      {/* Add Listing */}
      <Link
        href="/dashboard/listings/new"
        className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 transition shadow-sm"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add Listing
      </Link>
    </div>
  );
}
