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

// Groups digits into "4242 4242 4242 4242" as the user types — display only,
// handleSubmit strips spaces before tokenizing.
function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

// Auto-inserts the "/" as the user types so a real MM/YY value reaches the
// tokenizer every time — this is the actual, proven cause of the bulk of
// live "Invalid or expired expiry date" failures: nothing here was rejecting
// or reformatting a slash-less "0427", so it was sent to BasisTheory exactly
// as typed and correctly rejected as unparseable.
function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// Defensive normalization right before the value ever leaves the component —
// covers paste and autofill, which can hand back "04 / 27", "04-2027", or a
// 4-digit year, none of which formatExpiry's live typing handler would see.
function normalizeExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  const month = digits.slice(0, 2);
  const year = digits.length >= 4 ? digits.slice(-2) : digits.slice(2);
  return `${month}/${year}`;
}

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | null;

// Standard IIN/BIN-range prefix checks — same ranges Stripe/Braintree Elements
// use for live brand detection. Order matters: check longer/more specific
// prefixes (Amex, Discover) before broader ones.
function detectCardBrand(digits: string): CardBrand {
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(6011|65|64[4-9]|622)/.test(digits)) return "discover";
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(digits)) return "mastercard";
  if (/^4/.test(digits)) return "visa";
  return null;
}

function CardBrandIcon({ brand }: { brand: CardBrand }) {
  if (!brand) return null;
  if (brand === "visa") {
    return (
      <svg viewBox="0 0 48 32" className="h-6 w-9" aria-label="Visa">
        <rect width="48" height="32" rx="4" fill="#1A1F71" />
        <text x="24" y="21" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" fontStyle="italic" fontFamily="Arial, sans-serif">VISA</text>
      </svg>
    );
  }
  if (brand === "mastercard") {
    return (
      <svg viewBox="0 0 48 32" className="h-6 w-9" aria-label="Mastercard">
        <rect width="48" height="32" rx="4" fill="#f8f9fb" stroke="#e8ebef" />
        <circle cx="20" cy="16" r="9" fill="#EB001B" />
        <circle cx="28" cy="16" r="9" fill="#F79E1B" fillOpacity="0.9" />
      </svg>
    );
  }
  if (brand === "amex") {
    return (
      <svg viewBox="0 0 48 32" className="h-6 w-9" aria-label="American Express">
        <rect width="48" height="32" rx="4" fill="#2E77BC" />
        <text x="24" y="20" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial, sans-serif">AMEX</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-9" aria-label="Discover">
      <rect width="48" height="32" rx="4" fill="#f8f9fb" stroke="#e8ebef" />
      <circle cx="34" cy="16" r="7" fill="#FF6000" />
      <text x="19" y="20" textAnchor="middle" fill="#111827" fontSize="8" fontWeight="700" fontFamily="Arial, sans-serif">DISC</text>
    </svg>
  );
}

function validateCardFields(cardNumber: string, expiryDate: string, cvc: string): string | null {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 19) return "Enter a valid card number.";
  const [month, year] = expiryDate.split("/");
  const monthNum = Number(month);
  if (!month || !year || year.length !== 2 || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return "Enter the expiry as MM/YY.";
  }
  const expiry = new Date(2000 + Number(year), monthNum); // first day of the month after expiry
  if (expiry.getTime() <= Date.now()) return "This card has expired.";
  if (!/^\d{3,4}$/.test(cvc)) return "Enter a valid CVC.";
  return null;
}

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
  const cardBrand = detectCardBrand(cardNumber.replace(/\s+/g, ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Normalize before validating/sending — covers paste and browser autofill,
    // which can hand back a 4-digit year or a differently-spaced value that
    // the live-typing formatter above never touched.
    const normalizedExpiry = normalizeExpiry(expiryDate);
    if (normalizedExpiry !== expiryDate) setExpiryDate(normalizedExpiry);
    const normalizedCardNumber = cardNumber.replace(/\s+/g, "");

    const validationError = validateCardFields(normalizedCardNumber, normalizedExpiry, cvc.trim());
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setLoading(true);

    // One key for this whole submission, sent on every attempt below —
    // lets the server recognize a retry as the same attempt instead of a
    // fresh one, so retrying after a lost/blocked response can never trigger
    // a second real charge. A genuinely new submission (calling handleSubmit
    // again) gets its own fresh key.
    const idempotencyKey = crypto.randomUUID();

    // Tracked so a failure can be attributed to a specific step instead of
    // surfacing as one indistinguishable "something went wrong" — this stage
    // is what actually lets a client-side-only failure (blocked by a VPN,
    // ad-blocker, or network filter before it ever reaches our server) be
    // diagnosed from the server-side error log a browser crash can't give us.
    let stage = "tokenizer_import";
    // Extra context a plain err.message/stack can't carry, filled in at the
    // exact point of failure and forwarded to /api/client-errors — this is
    // what actually makes a client-side-only failure debuggable from the
    // server log a browser crash never reaches.
    let diagnostic = "";
    try {
      const { Tokenizer } = await import("@tagadapay/core-js");
      stage = "tokenizer_init";
      const tokenizer = new Tokenizer({ environment: TEST_MODE ? "development" : "production" });
      await tokenizer.initialize();

      // tokenizeCard() returns the base64 TagadaToken string directly — this
      // is the only thing that leaves the browser for our backend.
      stage = "tokenize_card";
      const tagadaToken = await tokenizer.tokenizeCard({
        cardNumber: normalizedCardNumber,
        expiryDate: normalizedExpiry, // "MM/YY"
        cvc: cvc.trim(),
        cardholderName: cardholderName.trim() || undefined,
      });

      // Up to 3 attempts of the *same* submission (same idempotencyKey and
      // already-tokenized card — no need to touch BasisTheory again) before
      // giving up. This is what actually papers over a transient gateway
      // blip between the browser and our server instead of dead-ending the
      // user on the first one; it's only safe to retry blindly like this
      // because the server recognizes the repeated key and will never
      // process a second real charge for it.
      stage = "server_request";
      const MAX_ATTEMPTS = 3;
      let data: { status?: string; paymentId?: string; error?: string } | null = null;
      let resOk = false;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountUsd, tagadaToken, idempotencyKey }),
        });

        // Read as text first: a proxy, VPN, or firewall between the browser
        // and our server can return an HTML block/error page instead of
        // JSON, and res.json() on that throws an opaque "Unexpected token
        // '<'" indistinguishable from every other failure. Parsing text
        // ourselves both gives that case a real message and lets it retry.
        stage = "server_response";
        const rawText = await res.text();
        try {
          data = JSON.parse(rawText);
          resOk = res.ok;
          diagnostic = ""; // an earlier attempt's failed-parse note doesn't apply to this real response
          break;
        } catch {
          diagnostic = `attempt=${attempt}/${MAX_ATTEMPTS} http_status=${res.status} content_type=${res.headers.get("content-type") ?? "?"} body="${rawText.slice(0, 200).replace(/"/g, "'")}"`;
          if (attempt === MAX_ATTEMPTS) break;
          await new Promise((r) => setTimeout(r, attempt * 1200));
          stage = "server_request";
        }
      }

      if (!data) {
        throw new Error(
          "Couldn't reach our payment processor after a few tries. This usually means a VPN, ad-blocker, or network filter is blocking the connection — try disabling those, switching networks, or use a different deposit method.",
        );
      }
      if (!resOk) throw new Error(data.error ?? "Payment failed");
      onSuccess({ status: data.status as "completed" | "pending", paymentId: data.paymentId! });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);

      // The tokenizer SDK wraps every failure in a generic PaymentSDKError
      // ("Failed to tokenize card" / "Failed to verify card"), discarding the
      // real cause into .originalError and .code — unwrap those explicitly or
      // the one detail that would actually explain a tokenize_card failure is
      // lost the moment it's thrown.
      const sdkErr = err as { code?: unknown; originalError?: unknown };
      const sdkCode = typeof sdkErr?.code === "string" ? sdkErr.code : undefined;
      const originalError = sdkErr?.originalError;
      const originalMessage = originalError instanceof Error
        ? originalError.message
        : originalError != null
          ? String(originalError).slice(0, 300)
          : undefined;

      fetch("/api/client-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: [
            `[tagada-card:${stage}] ${message}`,
            sdkCode && `code=${sdkCode}`,
            originalMessage && `cause="${originalMessage}"`,
            diagnostic,
          ].filter(Boolean).join(" "),
          stack: err instanceof Error ? err.stack : undefined,
          url: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      }).catch(() => {});
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

      <div className="relative">
        <Input
          label="Card number"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4242 4242 4242 4242"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          className={cardBrand ? "pr-12" : undefined}
          required
        />
        {cardBrand && (
          <div className="pointer-events-none absolute bottom-0 right-3 flex h-10 items-center">
            <CardBrandIcon brand={cardBrand} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Expiry (MM/YY)"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="12/29"
          value={expiryDate}
          onChange={(e) => setExpiryDate(formatExpiry(e.target.value))}
          maxLength={5}
          required
        />
        <Input
          label="CVC"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="123"
          value={cvc}
          onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
          maxLength={4}
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
