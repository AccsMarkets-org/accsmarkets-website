"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUp } from "lucide-react";
import { DepositWidget } from "@/components/wallet/DepositWidget";

export default function DepositPage() {
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => { if (d.user?.walletBalance != null) setWalletBalance(Number(d.user.walletBalance)); })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/wallet" aria-label="Back to wallet" className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border bg-surface text-muted hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <div>
          <h1 className="text-xl font-black text-foreground">Add Funds</h1>
          <p className="text-xs text-muted">Instant, secure deposits · 5 ways to pay</p>
        </div>
      </div>

      {/* Balance card */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-5 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Current balance</p>
            <p className="mt-1 text-4xl font-black tabular-nums text-white">
              {walletBalance !== null ? `$${walletBalance.toFixed(2)}` : "—"}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
            <ArrowUp className="h-5 w-5 text-white" aria-hidden />
          </div>
        </div>
      </div>

      <DepositWidget />
    </div>
  );
}
