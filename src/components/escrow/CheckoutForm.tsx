"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ArrowRight, BadgeCheck, ChevronDown, Package, ShieldCheck, Tag, TriangleAlert, Undo2 } from "lucide-react";

interface AppliedPromo {
  code: string;
  /** Percent off the escrow fee (0–100). */
  percent: number;
}

const NETWORKS = [
  { id: "TRC20", label: "TRC-20 (USDT)", dot: "bg-red-500" },
  { id: "BEP20", label: "BEP-20 (USDT)", dot: "bg-yellow-400" },
  { id: "ERC20", label: "ERC-20 (USDT)", dot: "bg-indigo-500" },
  { id: "POLYGON", label: "Polygon (USDT)", dot: "bg-purple-500" },
  { id: "SOLANA", label: "Solana (USDT)", dot: "bg-emerald-500" },
];

interface CheckoutFormProps {
  listingId: string;
  listingTitle: string;
  listingPlatform: string;
  platform: string;
  amount: number;
  escrowFee: number;
  feeRate: number;
  buyerTotal: number;
  walletBalance: number;
  offerId?: string;
  isYouTube: boolean;
}

export function CheckoutForm(props: CheckoutFormProps) {
  const router = useRouter();
  const [network, setNetwork] = useState("TRC20");
  const [ownershipEmail, setOwnershipEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Promo code entry. A PERCENT_OFF_FEE code discounts the escrow fee on this
  // order; a FLAT_CREDIT code tops up the wallet immediately instead.
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [walletBalance, setWalletBalance] = useState(props.walletBalance);

  // A fee discount redeemed earlier (e.g. from the wallet page) is applied by the
  // server automatically — surface it so the total shown matches what's charged.
  useEffect(() => {
    fetch("/api/promo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.pending?.type === "PERCENT_OFF_FEE") {
          setPromo({ code: d.pending.code, percent: Number(d.pending.value) });
          setPromoOpen(true);
        }
      })
      .catch(() => null);
  }, []);

  const escrowFee = promo
    ? Math.max(0, Math.round(props.escrowFee * (1 - Math.min(promo.percent / 100, 1)) * 100) / 100)
    : props.escrowFee;
  const promoSavings = Math.round((props.escrowFee - escrowFee) * 100) / 100;
  const buyerTotal = Math.round((props.amount + escrowFee) * 100) / 100;

  const sufficient = walletBalance >= buyerTotal;
  const shortfall = buyerTotal - walletBalance;
  const feePercent = Math.round(props.feeRate * 100);

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not apply promo code");
      if (data.type === "PERCENT_OFF_FEE") {
        setPromo({ code: data.code ?? code.toUpperCase(), percent: Number(data.value) });
        toast.success(data.message ?? "Discount applied");
      } else {
        // Wallet credit: reflect the new balance right away.
        setWalletBalance((b) => Math.round((b + Number(data.value)) * 100) / 100);
        toast.success(data.message ?? "Wallet credited");
      }
      setPromoInput("");
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "Could not apply promo code");
    } finally {
      setPromoLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/escrows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: props.listingId,
          offerId: props.offerId,
          cryptoNetwork: network,
          ownershipEmail: props.isYouTube && ownershipEmail ? ownershipEmail : undefined,
          promoCode: promo?.code,
        }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === "PHONE_VERIFICATION_REQUIRED") {
        router.push(`/dashboard/verify-whatsapp?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (res.status === 409) {
        toast.error(data.error ?? "This listing already has an active escrow.");
        router.push("/dashboard/escrows");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to fund escrow");
      toast.success("Order placed! Open your chat with the seller to track progress.");
      router.push(`/dashboard/messages/${data.escrow.sellerId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* What you're buying */}
      <Card>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">You are buying</p>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400">
            <Package className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="font-semibold leading-tight">{props.listingTitle}</p>
            <p className="text-sm text-muted">{props.platform}</p>
          </div>
        </div>
      </Card>

      {/* Payment method */}
      <Card>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Payment method</p>
        <div className="flex flex-col gap-2">
          {NETWORKS.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setNetwork(n.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                network === n.id
                  ? "border-brand-400 bg-brand-500/10 font-medium text-brand-700 dark:text-brand-400"
                  : "border-surface-border bg-background text-foreground hover:border-brand-200",
              )}
            >
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", n.dot)} aria-hidden />
              <div className="flex-1">
                <span>{n.label}</span>
              </div>
              <div className={cn(
                "h-4 w-4 rounded-full border-2 transition",
                network === n.id ? "border-brand-500 bg-brand-500" : "border-surface-border",
              )} />
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Wallet balance:{" "}
          <span className={sufficient ? "font-semibold text-success" : "font-semibold text-danger"}>
            {formatCurrency(walletBalance)}
          </span>
        </p>

        {/* Insufficient balance inline warning */}
        {!sufficient && (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/5 p-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <div className="flex-1 text-sm">
              <p className="font-medium text-warning-foreground">Insufficient balance</p>
              <p className="text-muted">
                You need{" "}
                <span className="font-semibold text-foreground">{formatCurrency(shortfall)}</span>{" "}
                more to complete this purchase.
              </p>
              <button
                type="button"
                onClick={() => router.push("/dashboard/wallet/deposit")}
                className="mt-1 inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline"
              >
                Top up now
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* YouTube ownership email */}
      {props.isYouTube && (
        <Card>
          <Input
            label="Gmail to receive channel ownership"
            type="email"
            placeholder="you@gmail.com"
            value={ownershipEmail}
            onChange={(e) => setOwnershipEmail(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted">
            The seller will transfer the YouTube channel to this Google account.
          </p>
        </Card>
      )}

      {/* Promo code */}
      <Card>
        <button
          type="button"
          onClick={() => setPromoOpen((o) => !o)}
          aria-expanded={promoOpen}
          className="flex w-full items-center justify-between gap-2 text-sm font-medium text-foreground"
        >
          <span className="inline-flex items-center gap-2">
            <Tag className="h-4 w-4 text-brand-500" aria-hidden />
            {promo ? `Promo applied: ${promo.code}` : "Have a promo code?"}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted transition", promoOpen && "rotate-180")} aria-hidden />
        </button>
        {promoOpen && (
          <div className="mt-3 flex flex-col gap-2">
            {promo ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-success/40 bg-success/5 px-3 py-2 text-sm">
                <span>
                  <span className="font-mono font-semibold">{promo.code}</span>{" "}
                  <span className="text-muted">— {promo.percent}% off the escrow fee</span>
                </span>
                <span className="font-semibold text-success">−{formatCurrency(promoSavings)}</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } }}
                  error={promoError ?? undefined}
                  className="font-mono uppercase"
                  aria-label="Promo code"
                />
                <Button type="button" variant="secondary" onClick={applyPromo} isLoading={promoLoading} disabled={!promoInput.trim()} className="shrink-0 self-start">
                  Apply
                </Button>
              </div>
            )}
            <p className="text-xs text-muted">
              Fee-discount codes apply to this order. Wallet-credit codes top up your balance instantly.
            </p>
          </div>
        )}
      </Card>

      {/* Order summary */}
      <Card>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Order summary</p>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">
              Sale price{props.offerId ? " (negotiated offer)" : ""}
            </dt>
            <dd className="font-medium">{formatCurrency(props.amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Escrow fee ({feePercent}%)</dt>
            <dd className="font-medium">
              {promo && promoSavings > 0 ? (
                <>
                  <span className="mr-1.5 text-muted line-through">{formatCurrency(props.escrowFee)}</span>
                  {formatCurrency(escrowFee)}
                </>
              ) : (
                formatCurrency(escrowFee)
              )}
            </dd>
          </div>
          {promo && promoSavings > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Promo {promo.code} ({promo.percent}% off fee)</dt>
              <dd className="font-medium text-success">−{formatCurrency(promoSavings)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-surface-border pt-2 text-base">
            <dt className="font-bold">Total</dt>
            <dd className="font-bold text-brand-600">{formatCurrency(buyerTotal)}</dd>
          </div>
        </dl>
      </Card>

      {/* Trust badges */}
      <div className="flex flex-wrap justify-center gap-4 py-1">
        {[
          { icon: ShieldCheck, label: "Escrow Protected" },
          { icon: BadgeCheck, label: "Verified Listing" },
          { icon: Undo2, label: "Buyer Protection" },
        ].map((b) => (
          <div key={b.label} className="flex items-center gap-1.5 text-xs text-muted">
            <b.icon className="h-4 w-4 text-success" aria-hidden />
            <span>{b.label}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Button
        onClick={handleConfirm}
        isLoading={loading}
        disabled={!sufficient}
        className="w-full"
        size="lg"
      >
        Confirm & fund escrow — {formatCurrency(buyerTotal)}
      </Button>

      <p className="text-center text-xs text-muted">
        Funds are held securely until you confirm the account transfer. Full refund if cancelled
        before credentials are submitted.
      </p>
    </div>
  );
}
