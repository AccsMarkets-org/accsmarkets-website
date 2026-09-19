"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────────

const NETWORKS = [
  {
    value: "TRC20",
    label: "TRC20",
    sub: "TRON",
    fee: "~$1",
    speed: "Fast",
    color: "#E50914",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
        <path d="M28 12.5L16 4 4 12.5v7l6 4v-4.5l6-4 6 4V23.5l6-4v-7z"/>
      </svg>
    ),
  },
  {
    value: "BEP20",
    label: "BEP20",
    sub: "BNB Chain",
    fee: "~$0.10",
    speed: "Fast",
    color: "#F0B90B",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
        <path d="M16 2l3.5 3.5L10 15l-3.5-3.5L16 2zm8.5 5.5L28 11l-5.5 5.5L19 13l5.5-5.5zm0 9L28 20l-3.5 3.5-3.5-3.5 3.5-3.5zM16 22l3.5 3.5L10 31l-3.5-3.5L16 22zM7.5 16.5L11 20 7.5 23.5 4 20l3.5-3.5zM16 10l6 6-6 6-6-6 6-6z"/>
      </svg>
    ),
  },
  {
    value: "ERC20",
    label: "ERC20",
    sub: "Ethereum",
    fee: "~$5–15",
    speed: "Medium",
    color: "#627EEA",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
        <path d="M16 3l-8.5 14.5L16 21.5l8.5-4L16 3zm0 14.5L9 14l7-11.5 7 11.5-7 3.5zm0 2.5l-8.5 3 8.5 6 8.5-6L16 20z"/>
      </svg>
    ),
  },
  {
    value: "POLYGON",
    label: "MATIC",
    sub: "Polygon",
    fee: "~$0.01",
    speed: "Fast",
    color: "#8247E5",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
        <path d="M22 11l-6-3.5L10 11v7l6 3.5 6-3.5V11zm-6 7.5L11 15V11l5-2.9 5 2.9v4l-5 2.9v.6z"/>
      </svg>
    ),
  },
  {
    value: "SOLANA",
    label: "SOL",
    sub: "Solana",
    fee: "~$0.001",
    speed: "Instant",
    color: "#9945FF",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
        <path d="M6 22h16.5l3-3H9L6 22zm0-9h16.5l3-3H9L6 13zm19.5-6H9L6 10h19.5l-3-3z" opacity=".7"/>
        <path d="M6 22h16.5l3-3H9L6 22zm16.5-12H9L6 13h19.5l-3-3z"/>
      </svg>
    ),
  },
];

const QUICK_PCT = [25, 50, 75, 100];
const WITHDRAW_FEE_RATE = 0.03;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WithdrawPage() {
  const [tab, setTab] = useState<"crypto" | "bank">("crypto");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("TRC20");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [minWithdrawal, setMinWithdrawal] = useState(20);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Bank withdraw fields
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankRouting, setBankRouting] = useState("");
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSubmitted, setBankSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings?.minWithdrawal) setMinWithdrawal(Number(d.settings.minWithdrawal)); })
      .catch(() => {});
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => { if (d.user?.walletBalance != null) setWalletBalance(Number(d.user.walletBalance)); })
      .catch(() => {});
  }, []);

  const amountNum = Number(amount) || 0;
  const withdrawFee = amountNum * WITHDRAW_FEE_RATE;
  const youReceive = amountNum - withdrawFee;
  const selectedNetwork = NETWORKS.find((n) => n.value === network) ?? NETWORKS[0];
  const isValid = amountNum >= minWithdrawal && address.trim().length > 10;
  const isBankValid = amountNum >= minWithdrawal && bankAccountName.trim().length > 0 && bankAccountNumber.trim().length > 0 && bankName.trim().length > 0;
  const available = walletBalance ?? 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "crypto", amountUsd: amountNum, network, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Withdrawal request failed");
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleBankSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBankLoading(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: amountNum,
          method: "bank",
          bankAccountName,
          bankAccountNumber,
          bankName,
          bankRouting,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Withdrawal request failed");
      setBankSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBankLoading(false);
    }
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (submitted || bankSubmitted) {
    const isBankSuccess = bankSubmitted;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <svg className="h-10 w-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        </div>
        <div>
          <p className="text-2xl font-black text-foreground">Withdrawal requested!</p>
          <p className="mt-2 text-sm text-muted">
            Your request for <strong className="text-foreground">${youReceive.toFixed(2)}</strong>{" "}
            {isBankSuccess ? "via bank wire" : <>on <strong className="text-foreground">{selectedNetwork.label}</strong></>} is pending admin approval.
            {isBankSuccess ? " Usually processed within 1–3 business days." : " Usually processed within 24 hours."}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/wallet" className="rounded-xl border border-surface-border bg-surface px-5 py-2.5 text-sm font-bold text-foreground hover:bg-brand-500/8 transition">
            Back to wallet
          </Link>
          <button
            type="button"
            onClick={() => { setSubmitted(false); setBankSubmitted(false); setAmount(""); setAddress(""); }}
            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition"
          >
            New withdrawal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/wallet" className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border bg-surface text-muted hover:text-foreground transition">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-black text-foreground">Withdraw Funds</h1>
          <p className="text-xs text-muted">Min ${minWithdrawal} · Manual review</p>
        </div>
      </div>

      {/* Method tabs */}
      <div className="flex gap-1.5 overflow-hidden rounded-2xl border border-surface-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setTab("crypto")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition",
            tab === "crypto" ? "bg-background text-brand-600 shadow-sm" : "text-muted hover:text-foreground",
          )}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><path d="M9.5 8h3.5a2 2 0 010 4H9.5m0-4v8m0-4h4a2 2 0 010 4H9.5"/>
          </svg>
          Crypto
        </button>
        <button
          type="button"
          onClick={() => setTab("bank")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition",
            tab === "bank" ? "bg-background text-brand-600 shadow-sm" : "text-muted hover:text-foreground",
          )}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
          </svg>
          Bank Wire
        </button>
      </div>

      {/* Balance card */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-5 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Available to withdraw</p>
            <p className="mt-1 text-4xl font-black tabular-nums text-white">
              {walletBalance !== null ? `$${walletBalance.toFixed(2)}` : "—"}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </div>
        </div>
        {/* Quick-percent buttons */}
        {walletBalance !== null && walletBalance >= minWithdrawal && (
          <div className="mt-4 flex gap-2">
            {QUICK_PCT.map((pct) => {
              const val = Math.floor((available * pct) / 100);
              const isSelected = amountNum === val && val >= minWithdrawal;
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className={cn(
                    "flex-1 rounded-xl py-1.5 text-xs font-bold transition",
                    isSelected
                      ? "bg-white text-brand-700"
                      : "bg-white/20 text-white hover:bg-white/30",
                  )}
                >
                  {pct === 100 ? "Max" : `${pct}%`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Crypto Form */}
      {tab === "crypto" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Amount input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Amount (USD)</label>
            <div className={cn(
              "flex h-16 items-center gap-2 rounded-2xl border-2 px-4 transition",
              amountNum > 0 && amountNum < minWithdrawal
                ? "border-danger/50 bg-danger/5"
                : amountNum >= minWithdrawal
                  ? "border-success/50 bg-success/5"
                  : "border-surface-border bg-background",
            )}>
              <span className="text-2xl font-bold text-muted">$</span>
              <input
                type="number"
                min={minWithdrawal}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-2xl font-bold text-foreground placeholder:text-muted/40 focus:outline-none tabular-nums"
              />
              <span className="text-sm font-semibold text-muted">USD</span>
            </div>
            {amountNum > 0 && amountNum < minWithdrawal && (
              <p className="text-xs text-danger">Minimum withdrawal is ${minWithdrawal}</p>
            )}
            {amountNum > available && available > 0 && (
              <p className="text-xs text-danger">Amount exceeds your balance of ${available.toFixed(2)}</p>
            )}
          </div>

          {/* Network picker */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Withdrawal network</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {NETWORKS.map((n) => (
                <button
                  key={n.value}
                  type="button"
                  onClick={() => setNetwork(n.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 text-[10px] font-bold transition",
                    network === n.value
                      ? "border-transparent text-white shadow-md"
                      : "border-surface-border bg-background text-muted hover:border-brand-200",
                  )}
                  style={network === n.value ? { backgroundColor: n.color } : undefined}
                >
                  <span style={{ color: network === n.value ? "white" : n.color }}>{n.icon}</span>
                  <span>{n.label}</span>
                  <span className={cn("font-normal", network === n.value ? "text-white/70" : "text-muted/60")}>{n.fee}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="flex items-center gap-1 rounded-full border border-surface-border px-2 py-0.5 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
                {selectedNetwork.speed}
              </span>
              <span>Est. network fee: <strong className="text-foreground">{selectedNetwork.fee}</strong></span>
            </div>
          </div>

          {/* Address input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Your {selectedNetwork.label} wallet address
            </label>
            <div className={cn(
              "flex items-start gap-2 rounded-2xl border-2 px-4 py-3 transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-400/20",
              address.trim().length > 10 ? "border-success/40 bg-success/5" : "border-surface-border bg-background",
            )}>
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6 6-6"/>
              </svg>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={`Paste your ${selectedNetwork.label} address here…`}
                required
                rows={2}
                className="flex-1 resize-none bg-transparent font-mono text-sm text-foreground placeholder:text-muted/60 focus:outline-none"
              />
              {address && (
                <button type="button" onClick={() => setAddress("")} className="mt-0.5 text-muted hover:text-danger transition">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
            {address.trim().length > 5 && address.trim().length < 10 && (
              <p className="text-xs text-danger">Address looks too short — double-check it</p>
            )}
          </div>

          {/* Summary */}
          {amountNum >= minWithdrawal && address.trim().length > 10 && (
            <div className="overflow-hidden rounded-2xl border border-surface-border">
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-muted">Withdrawal amount</span>
                <span className="font-medium text-foreground">${amountNum.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 text-sm">
                <span className="text-muted">Platform fee (3%)</span>
                <span className="font-medium text-danger">-${withdrawFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 text-sm">
                <span className="text-muted">Network</span>
                <span className="flex items-center gap-1.5 font-medium" style={{ color: selectedNetwork.color }}>
                  {selectedNetwork.icon}
                  {selectedNetwork.label} ({selectedNetwork.sub})
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 text-sm">
                <span className="text-muted">Address</span>
                <span className="max-w-[180px] truncate font-mono text-xs text-foreground">{address}</span>
              </div>
              <div className="flex items-center justify-between border-t-2 border-surface-border bg-surface px-4 py-3 text-sm font-bold">
                <span className="text-foreground">You receive</span>
                <span className="text-base text-brand-600">${youReceive.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/5 px-3 py-3 text-xs text-danger">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Double-check your wallet address and network. Sending to the wrong address or network results in permanent loss of funds.</span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid || loading || amountNum > available}
            className={cn(
              "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black transition",
              isValid && !loading && amountNum <= available
                ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-[1.01]"
                : "cursor-not-allowed bg-surface text-muted",
            )}
          >
            {loading ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Submitting…
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
                Request Withdrawal
              </>
            )}
          </button>
        </form>
      )}

      {/* Bank Wire Form */}
      {tab === "bank" && (
        <form onSubmit={handleBankSubmit} className="flex flex-col gap-5">

          {/* Amount input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Amount (USD)</label>
            <div className={cn(
              "flex h-16 items-center gap-2 rounded-2xl border-2 px-4 transition",
              amountNum > 0 && amountNum < minWithdrawal
                ? "border-danger/50 bg-danger/5"
                : amountNum >= minWithdrawal
                  ? "border-success/50 bg-success/5"
                  : "border-surface-border bg-background",
            )}>
              <span className="text-2xl font-bold text-muted">$</span>
              <input
                type="number"
                min={minWithdrawal}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-2xl font-bold text-foreground placeholder:text-muted/40 focus:outline-none tabular-nums"
              />
              <span className="text-sm font-semibold text-muted">USD</span>
            </div>
            {amountNum > 0 && amountNum < minWithdrawal && (
              <p className="text-xs text-danger">Minimum withdrawal is ${minWithdrawal}</p>
            )}
            {amountNum > available && available > 0 && (
              <p className="text-xs text-danger">Amount exceeds your balance of ${available.toFixed(2)}</p>
            )}
          </div>

          {/* Bank details */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-foreground">Bank account details</label>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted">Account holder name</label>
              <input
                type="text"
                required
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="Full name on account"
                className="h-11 rounded-xl border border-surface-border bg-background px-3 text-sm text-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted">Bank name</label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Chase, Bank of America"
                  className="h-11 rounded-xl border border-surface-border bg-background px-3 text-sm text-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted">Routing / SWIFT</label>
                <input
                  type="text"
                  value={bankRouting}
                  onChange={(e) => setBankRouting(e.target.value)}
                  placeholder="Routing or SWIFT code"
                  className="h-11 rounded-xl border border-surface-border bg-background px-3 text-sm text-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted">Account number / IBAN</label>
              <input
                type="text"
                required
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="Account number or IBAN"
                className="h-11 rounded-xl border border-surface-border bg-background px-3 font-mono text-sm text-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition"
              />
            </div>
          </div>

          {/* Fee summary */}
          {amountNum >= minWithdrawal && (
            <div className="overflow-hidden rounded-2xl border border-surface-border">
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-muted">Withdrawal amount</span>
                <span className="font-medium text-foreground">${amountNum.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 text-sm">
                <span className="text-muted">Platform fee (3%)</span>
                <span className="font-medium text-danger">-${withdrawFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 text-sm">
                <span className="text-muted">Transfer method</span>
                <span className="font-medium text-foreground">Bank Wire</span>
              </div>
              <div className="flex items-center justify-between border-t-2 border-surface-border bg-surface px-4 py-3 text-sm font-bold">
                <span className="text-foreground">You receive</span>
                <span className="text-base text-brand-600">${youReceive.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-xs text-muted">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Bank wire processing: 1–3 business days after admin approval
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isBankValid || bankLoading || amountNum > available}
            className={cn(
              "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black transition",
              isBankValid && !bankLoading && amountNum <= available
                ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-[1.01]"
                : "cursor-not-allowed bg-surface text-muted",
            )}
          >
            {bankLoading ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Submitting…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                </svg>
                Request Bank Withdrawal
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
