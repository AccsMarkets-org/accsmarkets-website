"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Props {
  listingId: string;
  listingPrice: number;
  userBalance: number;
}

export function MakeOfferForm({ listingId, listingPrice, userBalance }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(listingPrice.toString());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const offerAmount = Number(amount) || 0;
  const hasEnoughBalance = userBalance >= offerAmount;
  const shortfall = offerAmount - userBalance;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasEnoughBalance) {
      toast.error("Insufficient wallet balance. Please deposit funds first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, amount: offerAmount, message: message || undefined }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === "PHONE_VERIFICATION_REQUIRED") {
        router.push(`/dashboard/verify-whatsapp?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to send offer");
      setSent(true);
      toast.success("Offer sent!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <p className="mt-3 text-center text-sm text-success">Offer sent — track it from your dashboard.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500 bg-background px-4 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-500/8"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        Send Offer
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
      {/* Balance indicator */}
      <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs">
        <span className="text-muted">Your wallet balance</span>
        <span className={`font-semibold ${hasEnoughBalance ? "text-success" : "text-error"}`}>
          ${userBalance.toFixed(2)}
        </span>
      </div>

      <Input
        label="Your offer (USD)"
        type="number"
        min={1}
        step="0.01"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {/* Insufficient balance warning */}
      {!hasEnoughBalance && offerAmount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/5 px-3 py-2.5 text-xs text-error">
          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          <span>
            You need{" "}
            <strong>${shortfall.toFixed(2)} more</strong> to send this offer.{" "}
            <Link href="/dashboard/wallet/deposit" className="underline font-semibold">
              Top up wallet
            </Link>
          </span>
        </div>
      )}

      <Textarea
        label="Message (optional)"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <Button
        type="submit"
        isLoading={loading}
        disabled={!hasEnoughBalance || offerAmount <= 0}
        className="w-full"
      >
        Send offer
      </Button>
    </form>
  );
}
