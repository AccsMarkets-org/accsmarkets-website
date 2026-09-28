"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ShieldCheck } from "lucide-react";

// "true" only once TAGADA_API_KEY is a live key server-side — purely cosmetic
// (a small trust badge), the server independently decides test vs. live via
// isTagadaTestMode() in src/lib/tagada.ts when actually charging the card.
const TEST_MODE = process.env.NEXT_PUBLIC_TAGADA_TEST_MODE === "true";

export interface TagadaChargeResult {
  status: "completed" | "pending";
  paymentId: string;
}

interface TagadaCardFormProps {
  /** Amount to charge, in whole USD (e.g. 25 for $25.00). */
  amountUsd: number;
  /** Defaults to the wallet deposit endpoint; the checkout "pay the difference"
   *  flow reuses this same component and endpoint, parameterized by amount. */
  endpoint?: string;
  onSuccess: (result: TagadaChargeResult) => void;
  submitLabel?: string;
}

/**
 * Collects card details client-side and tokenizes them via @tagadapay/core-js
 * — the raw card number/CVC are handed straight to TagadaPay's tokenizer and
 * NEVER sent to our own API routes, only the resulting `tagadaToken` is.
 *
 * The SDK is dynamically imported inside the submit handler (not at module
 * top) so it's fetched only at the moment a user actually submits a card —
 * not merely when this tab/section is opened, and never at all for a
 * deployment where the Card (TagadaPay) tab isn't shown in the first place
 * (this component itself is lazy-loaded via next/dynamic — see DepositWidget
 * and CheckoutForm).
 */
export function TagadaCardForm({ amountUsd, endpoint = "/api/wallet/deposit/tagada", onSuccess, submitLabel }: TagadaCardFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { Tokenizer } = await import("@tagadapay/core-js");
      const tokenizer = new Tokenizer({ environment: TEST_MODE ? "development" : "production" });
      await tokenizer.initialize();

      // tokenizeCard() returns the base64 TagadaToken string directly — this
      // is the only thing that leaves the browser for our backend.
      const tagadaToken = await tokenizer.tokenizeCard({
        cardNumber: cardNumber.replace(/\s+/g, ""),
        expiryDate: expiryDate.trim(), // "MM/YY"
        cvc: cvc.trim(),
        cardholderName: cardholderName.trim() || undefined,
      });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd, tagadaToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed");
      onSuccess({ status: data.status, paymentId: data.paymentId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2 text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden />
        Secured by TagadaPay — your card details never touch our servers.
        {TEST_MODE && (
          <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
            Test mode
          </span>
        )}
      </div>

      <Input
        label="Card number"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="4242 4242 4242 4242"
        value={cardNumber}
        onChange={(e) => setCardNumber(e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Expiry (MM/YY)"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="12/29"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          required
        />
        <Input
          label="CVC"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="123"
          value={cvc}
          onChange={(e) => setCvc(e.target.value)}
          required
        />
      </div>
      <Input
        label="Cardholder name (optional)"
        autoComplete="cc-name"
        placeholder="Jane Doe"
        value={cardholderName}
        onChange={(e) => setCardholderName(e.target.value)}
      />

      {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <Button
        type="submit"
        isLoading={loading}
        disabled={!cardNumber.trim() || !expiryDate.trim() || !cvc.trim() || amountUsd <= 0}
        className="h-12 w-full text-base font-bold"
      >
        {submitLabel ?? `Pay $${amountUsd.toFixed(2)}`}
      </Button>
    </form>
  );
}
