"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/hooks/useConfirm";
import { ArrowLeft, ArrowRight } from "lucide-react";

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

const PAYMENT_METHODS = [
  {
    key: "crypto",
    label: "Crypto",
    sub: "Auto-detect",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.5 8h3.5a2 2 0 010 4H9.5m0-4v8m0-4h4a2 2 0 010 4H9.5"/>
      </svg>
    ),
  },
  {
    key: "manual",
    label: "Manual USDT",
    sub: "Upload proof",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
      </svg>
    ),
  },
  {
    key: "bank",
    label: "Bank Wire",
    sub: "1–3 days",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
      </svg>
    ),
  },
  {
    key: "card",
    label: "Card",
    sub: "Instant",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
      </svg>
    ),
  },
];

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const hasStripe = Boolean(stripePublicKey);

interface DepositResult {
  walletId: string;
  address: string;
  amountCrypto: number;
  currency: string;
  network: string;
}

interface FeeConfig {
  feeRate: number;
  minFee: number;
  maxFee: number | null;
  minAmount: number;
}

interface BankAccountOption {
  id: string;
  bankName: string;
  accountName: string;
  currency: string;
  accountLast4: string;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DepositWidget() {
  const router = useRouter();
  const [method, setMethod] = useState<"crypto" | "manual" | "card" | "bank">("crypto");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("TRC20");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DepositResult | null>(null);
  const [pendingChecked, setPendingChecked] = useState(false);

  // Manual
  const [txHash, setTxHash] = useState("");
  const [manualSubmitted, setManualSubmitted] = useState(false);
  const [walletAddresses, setWalletAddresses] = useState<Record<string, string>>({});
  const [walletAddressCopied, setWalletAddressCopied] = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);

  // Card
  const [cardClientSecret, setCardClientSecret] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardSuccess, setCardSuccess] = useState(false);

  // Bank
  const [bankFeeConfig, setBankFeeConfig] = useState<FeeConfig | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [bankAccountsLoaded, setBankAccountsLoaded] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string>("");

  useEffect(() => {
    if (method !== "bank") return;
    fetch("/api/wallet/deposit/bank-transfer/fee-config")
      .then((r) => r.json())
      .then((d) => setBankFeeConfig(d))
      .catch(() => null);
    fetch("/api/wallet/deposit/bank-transfer/accounts")
      .then((r) => r.json())
      .then((d) => {
        const list: BankAccountOption[] = d?.accounts ?? [];
        setBankAccounts(list);
        setBankAccountsLoaded(true);
        setSelectedBankId((prev) => prev || (list[0]?.id ?? ""));
      })
      .catch(() => setBankAccountsLoaded(true));
  }, [method]);

  useEffect(() => {
    if (method !== "manual") return;
    setWalletLoading(true);
    fetch("/api/wallet/deposit/wallet-config")
      .then((r) => r.json())
      .then((d) => { setWalletAddresses(d ?? {}); setWalletLoading(false); })
      .catch(() => { setWalletLoading(false); });
  }, [method]);

  // On mount: resume any pending NowPayments deposit instead of showing a blank form
  useEffect(() => {
    fetch("/api/wallet/deposit")
      .then((r) => r.json())
      .then((d) => {
        if (d?.pending) {
          setResult(d.pending);
          const net = NETWORKS.find((n) => n.value === d.pending.network);
          if (net) setNetwork(net.value);
        }
      })
      .catch(() => null)
      .finally(() => setPendingChecked(true));
  }, []);

  const amountNum = Number(amount) || 0;
  const bankFee = bankFeeConfig
    ? (() => {
        const raw = Math.max(amountNum * bankFeeConfig.feeRate, bankFeeConfig.minFee);
        return bankFeeConfig.maxFee != null ? Math.min(raw, bankFeeConfig.maxFee) : raw;
      })()
    : 0;
  const bankTotal = amountNum + bankFee;
  const bankFeeLabel = bankFeeConfig
    ? `Bank wire fee (${(bankFeeConfig.feeRate * 100).toFixed(0)}%${bankFeeConfig.minFee > 0 ? `, min $${bankFeeConfig.minFee}` : ""})`
    : "Bank wire fee";

  const selectedNetwork = NETWORKS.find((n) => n.value === network) ?? NETWORKS[0];
  // Card stays visible even without a processor: users searching for a card
  // option get the card→USDT onramp guide instead of a missing tab.
  const visibleMethods = PAYMENT_METHODS;

  async function handleCryptoDeposit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: amountNum, network }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create deposit");
      setResult({ ...data, network });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleManualDeposit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/deposit/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: amountNum, network, txHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit deposit");
      setManualSubmitted(true);
      toast.success("Deposit submitted — awaiting admin confirmation.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleBankDeposit(e: React.FormEvent) {
    e.preventDefault();
    setBankLoading(true);
    try {
      const res = await fetch("/api/wallet/deposit/bank-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: amountNum, bankAccountId: selectedBankId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create order");
      router.push(`/dashboard/wallet/deposit/bank-transfer/${data.orderId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setBankLoading(false);
    }
  }

  async function initCardPayment(e: React.FormEvent) {
    e.preventDefault();
    setCardLoading(true);
    try {
      const res = await fetch("/api/wallet/deposit/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: amountNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setCardClientSecret(data.clientSecret);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCardLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-surface-border bg-background shadow-card">
      {/* ── Method picker ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-surface-border">
        {visibleMethods.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => { setMethod(m.key as typeof method); setResult(null); setManualSubmitted(false); setCardClientSecret(null); setCardSuccess(false); }}
            className={cn(
              "flex flex-col items-center gap-1.5 py-4 px-2 text-xs font-semibold transition border-b-2",
              method === m.key
                ? "border-brand-500 text-brand-600 bg-brand-50/60 dark:bg-brand-950/30"
                : "border-transparent text-muted hover:text-foreground hover:bg-surface/60",
            )}
          >
            <span className={method === m.key ? "text-brand-500" : "text-muted"}>{m.icon}</span>
            <span className="font-bold tracking-tight">{m.label}</span>
            <span className={cn("text-[10px] font-normal", method === m.key ? "text-brand-400" : "text-muted/70")}>{m.sub}</span>
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ── Crypto ────────────────────────────────────────────────────── */}
        {method === "crypto" && (
          !pendingChecked ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-6 w-6 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            </div>
          ) : result ? (
            <CryptoDepositResult
              result={result}
              network={NETWORKS.find((n) => n.value === result.network) ?? selectedNetwork}
              onReset={() => setResult(null)}
              onCancel={async () => {
                if (!result.walletId) return;
                await fetch("/api/wallet/deposit/cancel", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ walletId: result.walletId }),
                });
                setResult(null);
              }}
            />
          ) : (
            <form onSubmit={handleCryptoDeposit} className="flex flex-col gap-5">
              <AmountInput value={amount} onChange={setAmount} label="Amount (USD)" />
              <NetworkPicker value={network} onChange={setNetwork} />
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                No platform fee · Full amount credited after network confirmation
              </div>
              <Button type="submit" isLoading={loading} disabled={amountNum < 1} className="h-12 w-full text-base font-bold">
                Generate Deposit Address
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </form>
          )
        )}

        {/* ── Manual USDT ───────────────────────────────────────────────── */}
        {method === "manual" && (
          manualSubmitted ? (
            <SuccessState
              icon={<svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>}
              title="Deposit submitted"
              sub="An admin will verify and credit your wallet within 1–24 hours."
              action={{ label: "Back to wallet", href: "/dashboard/wallet" }}
            />
          ) : (
            <form onSubmit={handleManualDeposit} className="flex flex-col gap-5">
              <AmountInput value={amount} onChange={setAmount} label="Amount you sent (USD)" />
              <NetworkPicker value={network} onChange={setNetwork} label="Network you used" />
              {/* Wallet address to send to */}
              {walletLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-xs text-muted">
                  <svg className="h-3.5 w-3.5 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  Loading wallet address…
                </div>
              ) : walletAddresses[network] ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Send USDT to this address</label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(walletAddresses[network]).then(() => {
                        setWalletAddressCopied(true);
                        setTimeout(() => setWalletAddressCopied(false), 2000);
                      });
                    }}
                    className="group w-full rounded-2xl border-2 border-brand-200 bg-brand-500/10 px-4 py-3 text-left transition hover:border-brand-400 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/30 dark:hover:border-brand-600 dark:hover:bg-brand-950/50"
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-500">
                      USDT · {network} Wallet Address
                    </p>
                    <p className="break-all font-mono text-xs text-foreground">{walletAddresses[network]}</p>
                    <div className={cn(
                      "mt-2 flex items-center gap-1.5 text-xs font-semibold transition",
                      walletAddressCopied ? "text-success" : "text-brand-500 group-hover:text-brand-600",
                    )}>
                      {walletAddressCopied ? (
                        <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
                      ) : (
                        <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Tap to copy address</>
                      )}
                    </div>
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                  <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Payment address for {network} is not configured yet. Please contact support or try another deposit method.
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Transaction hash</label>
                <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-background px-3 py-2.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-400/20 transition">
                  <svg className="h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                  <input
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x… or TX hash"
                    required
                    className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                No platform fee · Full amount credited after admin verification
              </div>
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Make sure the TX hash matches the exact network you selected. Wrong hash or network = delayed review.
              </div>

              {/* Payment summary shown before submit */}
              {amountNum >= 1 && (
                <div className="overflow-hidden rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-background dark:border-brand-800 dark:from-brand-950/30">
                  <div className="border-b border-brand-100 bg-brand-500 px-4 py-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-white">Payment Summary</p>
                  </div>
                  <div className="flex flex-col gap-0 divide-y divide-brand-100 dark:divide-brand-800">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-muted">You must send</span>
                      <span className="text-xl font-black tabular-nums text-brand-700 dark:text-brand-400">
                        {amountNum.toFixed(2)} <span className="text-sm font-bold">USDT</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="text-muted">Network</span>
                      <span className="flex items-center gap-1.5 font-bold text-foreground">
                        <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: selectedNetwork.color }} />
                        {selectedNetwork.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="text-muted">Network fee</span>
                      <span className="font-medium text-amber-600">{selectedNetwork.fee} <span className="font-normal text-muted">(paid to blockchain)</span></span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="text-muted">You receive</span>
                      <span className="font-bold text-success">${amountNum.toFixed(2)} wallet credit</span>
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" isLoading={loading} disabled={amountNum < 1 || !txHash.trim()} className="h-12 w-full text-base font-bold">
                Submit for Review
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </form>
          )
        )}

        {/* ── Bank Wire ─────────────────────────────────────────────────── */}
        {method === "bank" && (
          <form onSubmit={handleBankDeposit} className="flex flex-col gap-5">
            <AmountInput value={amount} onChange={setAmount} label="Amount (USD)" min={10} />
            {bankAccounts.length > 0 && (
              <BankAccountPicker accounts={bankAccounts} value={selectedBankId} onChange={setSelectedBankId} />
            )}
            {bankAccountsLoaded && bankAccounts.length === 0 && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Bank transfer is temporarily unavailable. Please try another deposit method.
              </div>
            )}
            {amountNum >= 10 && (
              <FeeBreakdown
                rows={[
                  { label: "Deposit amount", value: `$${amountNum.toFixed(2)}` },
                  { label: bankFeeLabel, value: bankFee === 0 ? "Free" : `$${bankFee.toFixed(2)}`, green: bankFee === 0 },
                ]}
                total={`$${bankTotal.toFixed(2)}`}
                totalLabel="Total to transfer"
              />
            )}
            <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-xs text-muted">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Processing time: 1–3 business days after payment received
            </div>
            <Button type="submit" isLoading={bankLoading} disabled={amountNum < 10 || (bankAccountsLoaded && bankAccounts.length === 0) || (bankAccounts.length > 0 && !selectedBankId)} className="h-12 w-full text-base font-bold">
              Get Bank Details
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        )}

        {/* ── Card without a processor: card→USDT onramp guide ──────────── */}
        {method === "card" && !hasStripe && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <p className="text-base font-bold text-foreground">Pay with your card — via USDT</p>
              <p className="text-sm text-muted">
                Direct card charging is temporarily unavailable, but you can still fund your wallet
                with a card in about 5 minutes:
              </p>
            </div>
            <ol className="flex flex-col gap-3">
              {[
                { n: 1, title: "Buy USDT with your card", sub: "Use any major app — Binance, Coinbase, Kraken, Bybit, or the buy button inside Trust Wallet / MetaMask." },
                { n: 2, title: "Get your deposit address here", sub: "Switch to the Crypto tab, enter your amount, and we generate a USDT address for you." },
                { n: 3, title: "Send & get credited automatically", sub: "Withdraw the USDT to your deposit address. Your wallet is credited as soon as the network confirms — no fee from us." },
              ].map((s) => (
                <li key={s.n} className="flex items-start gap-3 rounded-xl border border-surface-border bg-surface px-3.5 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">{s.n}</span>
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">{s.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{s.sub}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-xs text-muted">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              Tip: TRC-20 has the lowest withdrawal fee (~$1) on most exchanges.
            </div>
            <Button
              type="button"
              onClick={() => { setMethod("crypto"); setResult(null); }}
              className="h-12 w-full text-base font-bold"
            >
              Continue with Crypto Deposit
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        )}

        {/* ── Card (Stripe) ─────────────────────────────────────────────── */}
        {method === "card" && hasStripe && (
          cardSuccess ? (
            <SuccessState
              icon={<svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>}
              title="Payment received!"
              sub="Your funds will appear in your wallet within a few minutes."
              action={{ label: "Back to wallet", href: "/dashboard/wallet" }}
            />
          ) : cardClientSecret ? (
            <StripeCardForm clientSecret={cardClientSecret} publishableKey={stripePublicKey!} onSuccess={() => setCardSuccess(true)} />
          ) : (
            <form onSubmit={initCardPayment} className="flex flex-col gap-5">
              <AmountInput value={amount} onChange={setAmount} label="Amount (USD)" />
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                Funds credited instantly after successful payment
              </div>
              <Button type="submit" isLoading={cardLoading} disabled={amountNum < 1} className="h-12 w-full text-base font-bold">
                Pay with Card
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </form>
          )
        )}
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function AmountInput({ value, onChange, label, min = 1 }: { value: string; onChange: (v: string) => void; label: string; min?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {/* Quick amounts */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onChange(String(q))}
            className={cn(
              "rounded-xl border py-2 text-xs font-bold transition",
              Number(value) === q
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-surface-border bg-surface text-muted hover:border-brand-300 hover:text-foreground",
            )}
          >
            ${q}
          </button>
        ))}
      </div>
      {/* Custom input */}
      <div className="flex h-14 items-center gap-2 rounded-2xl border-2 border-surface-border bg-background px-4 focus-within:border-brand-400 transition">
        <span className="text-xl font-bold text-muted">$</span>
        <input
          type="number"
          min={min}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="flex-1 bg-transparent text-2xl font-bold text-foreground placeholder:text-muted/40 focus:outline-none tabular-nums"
        />
        <span className="text-sm font-semibold text-muted">USD</span>
      </div>
    </div>
  );
}

function NetworkPicker({ value, onChange, label = "Network" }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {NETWORKS.map((n) => (
          <button
            key={n.value}
            type="button"
            onClick={() => onChange(n.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 text-[10px] font-bold transition",
              value === n.value
                ? "border-transparent text-white shadow-md"
                : "border-surface-border bg-background text-muted hover:border-brand-200",
            )}
            style={value === n.value ? { backgroundColor: n.color, borderColor: n.color } : undefined}
          >
            <span style={{ color: value === n.value ? "white" : n.color }}>{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </div>
      {/* Speed badge */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="flex items-center gap-1 rounded-full border border-surface-border px-2 py-0.5 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
          {NETWORKS.find((n) => n.value === value)?.speed ?? "Fast"}
        </span>
      </div>
    </div>
  );
}

function BankAccountPicker({ accounts, value, onChange }: { accounts: BankAccountOption[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">
        {accounts.length > 1 ? "Choose bank account" : "Transfer to"}
      </label>
      <div className="flex flex-col gap-2">
        {accounts.map((a) => {
          const selected = a.id === value;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                selected
                  ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-400/30 dark:bg-brand-950/30 dark:ring-brand-500/30"
                  : "border-surface-border bg-background hover:border-brand-300 dark:hover:border-brand-700",
              )}
            >
              <span className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                selected ? "bg-brand-500 text-white" : "bg-surface text-muted",
              )}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{a.bankName}</p>
                <p className="truncate text-xs text-muted">
                  {a.accountName}
                  {a.accountLast4 && <span className="font-mono"> · ••{a.accountLast4}</span>}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-surface-border px-2 py-0.5 text-[10px] font-bold text-muted">{a.currency}</span>
              {selected && (
                <svg className="h-4 w-4 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FeeBreakdown({ rows, total, totalLabel }: { rows: { label: string; value: string; green?: boolean }[]; total: string; totalLabel: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border">
      {rows.map((r, i) => (
        <div key={r.label} className={cn("flex items-center justify-between px-4 py-3 text-sm", i > 0 && "border-t border-surface-border")}>
          <span className="text-muted">{r.label}</span>
          <span className={cn("font-medium", r.green && "text-success")}>{r.value}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t-2 border-surface-border bg-surface px-4 py-3 text-sm font-bold">
        <span className="text-foreground">{totalLabel}</span>
        <span className="text-brand-600 text-base">{total}</span>
      </div>
    </div>
  );
}

function SuccessState({ icon, title, sub, action }: { icon: React.ReactNode; title: string; sub: string; action: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">{icon}</div>
      <div>
        <p className="text-lg font-bold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted">{sub}</p>
      </div>
      <a href={action.href} className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition">
        {action.label}
      </a>
    </div>
  );
}

// ── Crypto deposit result ──────────────────────────────────────────────────────

const DEPOSIT_STEPS = ["Address generated", "Send crypto", "Network confirms", "Balance credited"];

function CryptoDepositResult({
  result,
  network,
  onReset,
  onCancel,
}: {
  result: DepositResult;
  network: (typeof NETWORKS)[0];
  onReset: () => void;
  onCancel?: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&bgcolor=ffffff&color=000000&data=${encodeURIComponent(result.address)}`;

  function copy() {
    navigator.clipboard.writeText(result.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Amount pill */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-brand-200 bg-gradient-to-r from-brand-50 to-background px-5 py-4 dark:border-brand-800 dark:from-brand-950/30">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Send exactly</p>
          <p className="mt-0.5 text-3xl font-black tabular-nums text-brand-700">
            {result.amountCrypto} <span className="text-lg">{result.currency.toUpperCase()}</span>
          </p>
          <p className="mt-1 text-xs text-amber-600">Network fee: {network.fee} <span className="text-muted">(deducted by your wallet)</span></p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: network.color }}>
          {network.icon}
        </div>
      </div>

      {/* QR + address */}
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl border-2 border-surface-border p-3 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="QR code" width={180} height={180} className="rounded-lg" />
        </div>

        {/* Address copy box */}
        <button
          type="button"
          onClick={copy}
          className="group w-full rounded-2xl border-2 border-surface-border bg-surface px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-500/8"
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Wallet address · {network.label}</p>
          <p className="break-all font-mono text-xs text-foreground">{result.address}</p>
          <div className={cn(
            "mt-2 flex items-center gap-1.5 text-xs font-semibold transition",
            copied ? "text-success" : "text-brand-500 group-hover:text-brand-600",
          )}>
            {copied ? (
              <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
            ) : (
              <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Tap to copy address</>
            )}
          </div>
        </button>
      </div>

      {/* Step tracker */}
      <div className="flex items-center gap-0">
        {DEPOSIT_STEPS.map((step, i) => (
          <div key={step} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                i === 0 ? "bg-success text-white" : i === 1 ? "border-2 border-brand-400 bg-brand-500/10 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400" : "border-2 border-surface-border bg-background text-muted",
              )}>
                {i === 0 ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg> : i + 1}
              </div>
              <span className="hidden text-center text-[9px] leading-tight text-muted sm:block max-w-[56px]">{step}</span>
            </div>
            {i < DEPOSIT_STEPS.length - 1 && (
              <div className={cn("mb-4 h-px flex-1", i === 0 ? "bg-success" : "bg-surface-border")} />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
        <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
        Send only <strong className="mx-0.5">{result.currency.toUpperCase()}</strong> on <strong className="mx-0.5">{network.label}</strong> to this address. Wrong coin or network = permanent loss.
      </div>

      <div className="flex flex-col gap-2">
        <button type="button" onClick={onReset} className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Use a different amount or network
        </button>
        {onCancel && (
          <button
            type="button"
            disabled={cancelling}
            onClick={async () => {
              const ok = await confirm({
                title: "Cancel this deposit?",
                description: "The address will become invalid.",
                confirmLabel: "Cancel deposit",
                cancelLabel: "Keep it",
                destructive: true,
              });
              if (!ok) return;
              setCancelling(true);
              await onCancel();
              setCancelling(false);
            }}
            className="text-center text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 disabled:opacity-50 transition"
          >
            {cancelling ? "Cancelling…" : "Cancel this deposit"}
          </button>
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}

// ── Stripe card form ───────────────────────────────────────────────────────────

function StripeCardForm({ clientSecret, publishableKey, onSuccess }: { clientSecret: string; publishableKey: string; onSuccess: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elementsRef = useRef<any>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stripe = (window as any).Stripe(publishableKey);
      const elements = stripe.elements({ clientSecret });
      const card = elements.create("payment");
      if (!mountRef.current) return;
      card.mount(mountRef.current);
      elementsRef.current = elements;
      card.on("ready", () => setMounted(true));
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!elementsRef.current) return;
    setPaying(true);
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripe = (window as any).Stripe(publishableKey);
    const { error: stripeError } = await stripe.confirmPayment({
      elements: elementsRef.current,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (stripeError) {
      setError(stripeError.message ?? "Payment failed");
      setPaying(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handlePay} className="flex flex-col gap-4">
      <div ref={mountRef} className="min-h-[52px] rounded-xl border border-surface-border bg-background p-3" />
      {!mounted && <p className="text-xs text-muted">Loading payment form…</p>}
      {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" isLoading={paying} disabled={!mounted} className="h-12 w-full text-base font-bold">
        Confirm payment
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </form>
  );
}
