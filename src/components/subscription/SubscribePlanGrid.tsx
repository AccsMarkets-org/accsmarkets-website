"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { PLAN_FEATURES_TABLE } from "@/lib/plan-features";

const NETWORKS = ["TRC20", "BEP20", "ERC20", "POLYGON", "SOLANA"] as const;
type Network = (typeof NETWORKS)[number];

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  listingLimit: number;
  escrowFeeRate: number;
}

interface Props {
  plans: Plan[];
  currentPlanId: string | null | undefined;
  walletBalance?: number;
}

type Step = "grid" | "method" | "network" | "paying" | "done";
type PayMethod = "balance" | "crypto";

/* ── Static feature matrix (imported from shared source of truth) ──────── */
const FEATURES = PLAN_FEATURES_TABLE;

const PLAN_KEYS = ["free", "starter", "pro", "enterprise"] as const;
type PlanKey = (typeof PLAN_KEYS)[number];

const PLAN_STYLES: Record<PlanKey, { badge: string; button: string; border: string; header: string }> = {
  free:       { badge: "bg-surface text-muted border border-surface-border", button: "bg-surface border border-surface-border text-foreground", border: "", header: "text-foreground" },
  starter:    { badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",   button: "bg-blue-500 hover:bg-blue-600 text-white", border: "border-blue-200 dark:border-blue-800",   header: "text-blue-700 dark:text-blue-400" },
  pro:        { badge: "bg-brand-100 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400", button: "bg-brand-500 hover:bg-brand-600 text-white", border: "border-brand-300 shadow-brand-100 shadow-lg dark:border-brand-700", header: "text-brand-700 dark:text-brand-400" },
  enterprise: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400", button: "bg-amber-500 hover:bg-amber-600 text-white", border: "border-amber-300 dark:border-amber-700", header: "text-amber-700 dark:text-amber-400" },
};

const PLAN_ICONS: Record<PlanKey, React.ReactNode> = {
  free: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
    </svg>
  ),
  starter: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
    </svg>
  ),
  pro: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  enterprise: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
};

function FeatureValue({ value }: { value: string | boolean | undefined }) {
  if (value === false || value == null) {
    return (
      <svg className="mx-auto h-4 w-4 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    );
  }
  if (value === true) {
    return (
      <svg className="mx-auto h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    );
  }
  return <span className="text-xs font-medium text-foreground">{value}</span>;
}

export function SubscribePlanGrid({ plans, currentPlanId, walletBalance = 0 }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("grid");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("balance");
  const [network, setNetwork] = useState<Network>("TRC20");
  const [paymentInfo, setPaymentInfo] = useState<{ address: string; amountCrypto: string; currency: string; walletId: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopPolling() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPolling(false);
  }

  // Cleanup on unmount
  // (useEffect cleanup handled inline via refs)

  function selectPlan(plan: Plan) {
    if (plan.priceMonthly === 0) {
      toast("You're on the Free plan — upgrade to unlock more features!");
      return;
    }
    setSelectedPlan(plan);
    setStep("method");
  }

  async function payWithBalance() {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payments/subscribe-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setStep("done");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  async function createPayment() {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id, network }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setPaymentInfo(data);
      setStep("paying");
      pollStatus(data.walletId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function pollStatus(walletId: string) {
    setPolling(true);
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/subscribe/status?walletId=${walletId}`);
        const data = await res.json();
        if (data.status === "confirmed") {
          stopPolling();
          setStep("done");
          router.refresh();
        } else if (["failed", "rejected"].includes(data.status)) {
          stopPolling();
          toast.error("Payment failed. Please try again.");
          setStep("grid");
        }
      } catch { /* ignore polling errors */ }
    }, 5000);
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      toast.error("Payment window timed out. Contact support if you already paid.");
      setStep("grid");
    }, 20 * 60 * 1000);
  }

  if (step === "done") {
    return (
      <Card className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">Subscription activated!</p>
          <p className="mt-1 text-sm text-muted">Your plan is now active. Enjoy your new features.</p>
        </div>
        <Button size="sm" onClick={() => { setStep("grid"); setSelectedPlan(null); router.refresh(); }}>
          Back to plans
        </Button>
      </Card>
    );
  }

  if (step === "paying" && paymentInfo) {
    return (
      <Card className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-foreground">Send payment</p>
            <p className="text-xs text-muted">{selectedPlan?.name} plan · {network}</p>
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Amount to send</p>
          <p className="text-2xl font-bold text-foreground">
            {paymentInfo.amountCrypto} <span className="text-base font-semibold text-muted">{paymentInfo.currency}</span>
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Wallet address</p>
          <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface p-3">
            <code className="flex-1 break-all font-mono text-xs text-foreground">{paymentInfo.address}</code>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(paymentInfo.address); toast.success("Copied!"); }}
              className="shrink-0 rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface-border transition"
              title="Copy address"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
            </button>
          </div>
        </div>

        {polling && (
          <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-500/10 px-4 py-3 dark:border-brand-800">
            <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
            </svg>
            <p className="text-sm text-brand-700 dark:text-brand-400">Waiting for blockchain confirmation…</p>
          </div>
        )}

        {/* This aborts the in-progress crypto payment flow only — it is not
            "cancel subscription" (see CancelSubscriptionControl for that). */}
        <Button variant="outline" size="sm" onClick={() => { stopPolling(); setStep("grid"); }}>
          Cancel this payment
        </Button>
      </Card>
    );
  }

  if (step === "method" && selectedPlan) {
    const canPayBalance = walletBalance >= selectedPlan.priceMonthly;
    return (
      <Card className="flex flex-col gap-5">
        <div>
          <p className="text-lg font-semibold text-foreground">Choose payment method</p>
          <p className="mt-0.5 text-sm text-muted">
            Upgrading to <strong>{selectedPlan.name}</strong> · ${selectedPlan.priceMonthly}/month
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setPayMethod("balance")}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition",
              payMethod === "balance"
                ? "border-brand-400 bg-brand-50 dark:bg-brand-950/30"
                : "border-surface-border bg-surface hover:border-brand-300",
            )}
          >
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", payMethod === "balance" ? "bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400" : "bg-surface-border text-muted")}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Pay from balance</p>
              <p className="text-xs text-muted">
                Available: <span className={canPayBalance ? "text-success font-medium" : "text-danger font-medium"}>${walletBalance.toFixed(2)}</span>
              </p>
            </div>
            {canPayBalance && (
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">Instant</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setPayMethod("crypto")}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition",
              payMethod === "crypto"
                ? "border-brand-400 bg-brand-50 dark:bg-brand-950/30"
                : "border-surface-border bg-surface hover:border-brand-300",
            )}
          >
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", payMethod === "crypto" ? "bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400" : "bg-surface-border text-muted")}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h4.5a2.5 2.5 0 0 1 0 5H9V9z"/></svg>
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Pay with crypto</p>
              <p className="text-xs text-muted">BTC, USDT, ETH via multiple networks</p>
            </div>
          </button>
        </div>

        {!canPayBalance && payMethod === "balance" && (
          <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning-foreground">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>Insufficient balance. You need ${(selectedPlan.priceMonthly - walletBalance).toFixed(2)} more. <a href="/dashboard/wallet" className="font-medium underline">Deposit funds</a></span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setStep("grid")}>Back</Button>
          {payMethod === "balance" ? (
            <Button size="sm" isLoading={loading} disabled={!canPayBalance} onClick={payWithBalance}>
              Pay ${selectedPlan.priceMonthly} from balance
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep("network")}>
              Continue to network selection
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (step === "network" && selectedPlan) {
    return (
      <Card className="flex flex-col gap-5">
        <div>
          <p className="text-lg font-semibold text-foreground">Choose payment network</p>
          <p className="mt-0.5 text-sm text-muted">
            Upgrading to <strong>{selectedPlan.name}</strong> · ${selectedPlan.priceMonthly}/month
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          {NETWORKS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNetwork(n)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                network === n
                  ? "border-brand-400 bg-brand-500/10 text-brand-700 dark:text-brand-400"
                  : "border-surface-border bg-surface text-foreground hover:border-brand-300",
              )}
            >
              <span className={cn("h-3.5 w-3.5 shrink-0 rounded-full border-2", network === n ? "border-brand-500 bg-brand-500" : "border-muted bg-transparent")} />
              <span className="flex-1 font-medium">{n}</span>
              {n === "TRC20" && <span className="text-[11px] text-muted">Recommended · Lowest fees</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setStep("method")}>Back</Button>
          <Button size="sm" isLoading={loading} onClick={createPayment}>Generate payment address</Button>
        </div>
      </Card>
    );
  }

  /* ── Plan grid ──────────────────────────────────────────────────────────── */
  const sortedPlans = [...plans].sort((a, b) => a.priceMonthly - b.priceMonthly);

  return (
    <div className="flex flex-col gap-6">
      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sortedPlans.map((plan) => {
          const key = plan.name.toLowerCase() as PlanKey;
          const style = PLAN_STYLES[key] ?? PLAN_STYLES.free;
          const icon = PLAN_ICONS[key] ?? PLAN_ICONS.free;
          const isFree = plan.priceMonthly === 0;
          // Fix: treat null currentPlanId as FREE
          const isCurrent = currentPlanId
            ? plan.id === currentPlanId
            : isFree;
          const isPopular = key === "pro";

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-surface p-5 transition",
                isCurrent ? `border-2 ${style.border || "border-brand-500"}` : "border-surface-border hover:border-brand-200",
                isPopular && !isCurrent ? "ring-2 ring-brand-400/30" : "",
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-brand-500 px-3 py-0.5 text-[11px] font-bold text-white shadow">
                    Most Popular
                  </span>
                </div>
              )}

              {isCurrent && (
                <span className={cn("mb-3 w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold", style.badge)}>
                  Current plan
                </span>
              )}

              <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", isCurrent || isPopular ? "bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400" : "bg-surface-border text-muted")}>
                {icon}
              </div>

              <p className={cn("text-base font-bold", style.header)}>{plan.name}</p>

              <div className="mt-2 mb-4">
                {isFree ? (
                  <p className="text-3xl font-bold text-foreground">Free</p>
                ) : (
                  <div className="flex items-end gap-1">
                    <p className="text-3xl font-bold text-foreground">${plan.priceMonthly}</p>
                    <p className="mb-1 text-sm text-muted">/mo</p>
                  </div>
                )}
              </div>

              <ul className="mb-5 flex flex-col gap-2">
                {[
                  `${plan.listingLimit === 999 ? "Unlimited" : plan.listingLimit} active listings`,
                  `${(plan.escrowFeeRate * 100).toFixed(0)}% escrow fee`,
                  ...(key === "starter" ? ["1 featured listing/mo", "3 bumps/mo", "Standard analytics", "Custom profile URL"] : []),
                  ...(key === "pro" ? ["3 featured listings/mo", "10 bumps/mo", "Advanced analytics", "Priority support", "Verified seller badge"] : []),
                  ...(key === "enterprise" ? ["10 featured listings/mo", "Unlimited bumps", "Full analytics", "API access", "10 team members", "Early access features"] : []),
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {isCurrent ? (
                  <div className={cn("rounded-xl px-4 py-2.5 text-center text-sm font-semibold", style.badge)}>
                    Active plan
                  </div>
                ) : isFree ? (
                  <div className="rounded-xl border border-surface-border px-4 py-2.5 text-center text-sm font-medium text-muted">
                    Free forever
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => selectPlan(plan)}
                    className={cn("w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition", style.button)}
                  >
                    Upgrade to {plan.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div className="overflow-hidden rounded-2xl border border-surface-border">
        <div className="border-b border-surface-border bg-surface px-5 py-3">
          <p className="text-sm font-semibold text-foreground">Full feature comparison</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted w-1/3">Feature</th>
                {PLAN_KEYS.map((k) => (
                  <th key={k} className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-foreground">
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr key={f.label} className={cn("border-b border-surface-border last:border-0", i % 2 === 0 ? "" : "bg-surface/30")}>
                  <td className="px-4 py-3 text-xs font-medium text-foreground">{f.label}</td>
                  <td className="px-4 py-3 text-center"><FeatureValue value={f.free} /></td>
                  <td className="px-4 py-3 text-center"><FeatureValue value={f.starter} /></td>
                  <td className="px-4 py-3 text-center bg-brand-50/30 dark:bg-brand-950/10"><FeatureValue value={f.pro} /></td>
                  <td className="px-4 py-3 text-center"><FeatureValue value={f.enterprise} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
