"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const NETWORKS = [
  { id: "TRC20", label: "TRC-20 (USDT)", icon: "🔵" },
  { id: "BEP20", label: "BEP-20 (USDT)", icon: "🟡" },
  { id: "ERC20", label: "ERC-20 (USDT)", icon: "🔷" },
  { id: "POLYGON", label: "Polygon (USDT)", icon: "🟣" },
  { id: "SOLANA", label: "Solana (USDT)", icon: "🟢" },
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

  const sufficient = props.walletBalance >= props.buyerTotal;
  const shortfall = props.buyerTotal - props.walletBalance;
  const feePercent = Math.round(props.feeRate * 100);

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/50 text-lg">
            📦
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
              <span className="text-base">{n.icon}</span>
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
            {formatCurrency(props.walletBalance)}
          </span>
        </p>

        {/* Insufficient balance inline warning */}
        {!sufficient && (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/5 p-3">
            <span className="mt-0.5 shrink-0 text-warning">⚠️</span>
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
                className="mt-1 text-brand-600 hover:underline font-medium"
              >
                Top up now →
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
            <dd className="font-medium">{formatCurrency(props.escrowFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-surface-border pt-2 text-base">
            <dt className="font-bold">Total</dt>
            <dd className="font-bold text-brand-600">{formatCurrency(props.buyerTotal)}</dd>
          </div>
        </dl>
      </Card>

      {/* Trust badges */}
      <div className="flex flex-wrap justify-center gap-4 py-1">
        {[
          { icon: "🛡️", label: "Escrow Protected" },
          { icon: "✅", label: "Verified Listing" },
          { icon: "↩️", label: "Buyer Protection" },
        ].map((b) => (
          <div key={b.label} className="flex items-center gap-1.5 text-xs text-muted">
            <span>{b.icon}</span>
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
        Confirm & fund escrow — {formatCurrency(props.buyerTotal)}
      </Button>

      <p className="text-center text-xs text-muted">
        Funds are held securely until you confirm the account transfer. Full refund if cancelled
        before credentials are submitted.
      </p>
    </div>
  );
}
