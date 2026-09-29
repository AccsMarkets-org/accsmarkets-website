"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { CardTokenResponse, GooglePayTokenResult } from "@tagadapay/core-js";
import type { TagadaChargeResult } from "./TagadaCardForm";

// Same env convention as TagadaCardForm — "development" mode uses BasisTheory's
// embedded test key regardless of what's passed, per the SDK's own config.ts.
const TEST_MODE = process.env.NEXT_PUBLIC_TAGADA_TEST_MODE === "true";

// Google Pay requires a real Google Pay Business Console merchant ID for
// production (sandboxed mode works without one) — unlike Apple Pay, there's
// no safe default, so the button only renders once this is configured.
const GOOGLE_PAY_MERCHANT_ID = process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID;

interface TagadaWalletButtonsProps {
  amountUsd: number;
  endpoint?: string;
  onSuccess: (result: TagadaChargeResult) => void;
}

/**
 * Apple Pay / Google Pay buttons for the same wallet deposit endpoint
 * TagadaCardForm already posts to — both wallets tokenize through
 * BasisTheory via @tagadapay/core-js's startApplePaySession/
 * startGooglePaySession, producing a card-shaped token that's wrapped into
 * the identical base64 TagadaToken format the card flow uses, so the server
 * side (POST /api/wallet/deposit/tagada) needs no changes at all.
 *
 * Apple Pay: works with no extra config (isApplePayAvailable() gates it to
 * Safari/Apple Pay-capable devices), but TagadaPay must have this checkout
 * domain registered on their side or merchant validation fails silently —
 * that's a one-time step only TagadaPay support can do, not something any
 * code change here can complete. Untested end-to-end (needs Safari on an
 * Apple Pay-capable device with the domain already registered).
 *
 * Google Pay: the button only appears once NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID
 * is set to a real Google Pay Business Console merchant ID.
 */
export function TagadaWalletButtons({ amountUsd, endpoint = "/api/wallet/deposit/tagada", onSuccess }: TagadaWalletButtonsProps) {
  const [applePayReady, setApplePayReady] = useState(false);
  const [googlePayReady, setGooglePayReady] = useState(false);
  const [loading, setLoading] = useState<"apple" | "google" | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@tagadapay/core-js").then(async (mod) => {
      const appleOk = await mod.isApplePayAvailable().catch(() => false);
      if (!cancelled) setApplePayReady(appleOk);

      if (GOOGLE_PAY_MERCHANT_ID) {
        const googleOk = await mod.isGooglePayAvailable(TEST_MODE).catch(() => false);
        if (!cancelled) setGooglePayReady(googleOk);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function reportFailure(method: "apple_pay" | "google_pay", stage: string, err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    toast.error(message);
    fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `[tagada-wallet:${method}:${stage}] ${message}`,
        stack: err instanceof Error ? err.stack : undefined,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    }).catch(() => {});
  }

  // Same idempotent-retry-safe submission as TagadaCardForm.handleSubmit's
  // server_request/server_response steps — see that file for why: the
  // idempotencyKey lets a retry after a lost response never double-charge.
  async function submitToken(method: "apple_pay" | "google_pay", tagadaToken: string) {
    const idempotencyKey = crypto.randomUUID();
    const MAX_ATTEMPTS = 3;
    let data: { status?: string; paymentId?: string; error?: string } | null = null;
    let resOk = false;
    let diagnostic = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd, tagadaToken, idempotencyKey }),
      });
      const rawText = await res.text();
      try {
        data = JSON.parse(rawText);
        resOk = res.ok;
        break;
      } catch {
        diagnostic = `attempt=${attempt}/${MAX_ATTEMPTS} http_status=${res.status} body="${rawText.slice(0, 200).replace(/"/g, "'")}"`;
        if (attempt === MAX_ATTEMPTS) break;
        await new Promise((r) => setTimeout(r, attempt * 1200));
      }
    }

    if (!data) throw new Error(diagnostic || "Couldn't reach our payment processor. Please try again.");
    if (!resOk) throw new Error(data.error ?? "Payment failed");
    onSuccess({ status: data.status as "completed" | "pending", paymentId: data.paymentId! });
  }

  async function handleApplePay() {
    setLoading("apple");
    try {
      const { startApplePaySession, applePayTokenToTagadaToken, getBasisTheoryApiKey } = await import("@tagadapay/core-js");
      startApplePaySession(
        {
          basisTheoryApiKey: getBasisTheoryApiKey(TEST_MODE ? "development" : "production"),
          countryCode: "US",
          storeName: "AccsMarkets",
        },
        { currency: "USD", totalAmountMinor: Math.round(amountUsd * 100) },
        {
          onSuccess: async (token) => {
            try {
              await submitToken("apple_pay", applePayTokenToTagadaToken(token));
            } catch (err) {
              await reportFailure("apple_pay", "server_submit", err);
            } finally {
              setLoading(null);
            }
          },
          onError: async (msg) => {
            await reportFailure("apple_pay", "session", new Error(msg));
            setLoading(null);
          },
          onCancel: () => setLoading(null),
        },
      );
    } catch (err) {
      await reportFailure("apple_pay", "start", err);
      setLoading(null);
    }
  }

  async function handleGooglePay() {
    if (!GOOGLE_PAY_MERCHANT_ID) return;
    setLoading("google");
    try {
      const { startGooglePaySession, createTagadaToken, getBasisTheoryApiKey, getGoogleTenantId } = await import("@tagadapay/core-js");
      startGooglePaySession(
        {
          basisTheoryApiKey: getBasisTheoryApiKey(TEST_MODE ? "development" : "production"),
          basisTheoryTenantId: getGoogleTenantId(TEST_MODE ? "development" : "production"),
          merchantId: GOOGLE_PAY_MERCHANT_ID,
          merchantName: "AccsMarkets",
          countryCode: "US",
          sandboxed: TEST_MODE,
        },
        { currency: "USD", totalAmountMinor: Math.round(amountUsd * 100) },
        {
          onSuccess: async (token: GooglePayTokenResult) => {
            try {
              // Not createTagadaDigitalWalletToken: it reads tokenResponse.card
              // .expirationMonth/expirationYear (camelCase), but the real
              // GooglePayTokenResult shape here is expiration_month/
              // expiration_year (snake_case) -- that mismatch silently zeroes
              // the expiry. Building the same shape applePayTokenToTagadaToken
              // uses (which does read the snake_case fields correctly) avoids it.
              const card = token.card ?? ({} as GooglePayTokenResult["card"]);
              const tagadaToken = createTagadaToken(
                {
                  id: token.id,
                  type: "google_pay",
                  data: { expiration_month: card.expiration_month, expiration_year: card.expiration_year },
                  metadata: { rawProviderResponse: { card: { last4: card.last4, bin: card.bin, brand: card.brand } } },
                } as CardTokenResponse,
                "basistheory",
              );
              await submitToken("google_pay", tagadaToken);
            } catch (err) {
              await reportFailure("google_pay", "server_submit", err);
            } finally {
              setLoading(null);
            }
          },
          onError: async (msg) => {
            await reportFailure("google_pay", "session", new Error(msg));
            setLoading(null);
          },
          onCancel: () => setLoading(null),
        },
      );
    } catch (err) {
      await reportFailure("google_pay", "start", err);
      setLoading(null);
    }
  }

  if (!applePayReady && !(googlePayReady && GOOGLE_PAY_MERCHANT_ID)) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
      {applePayReady && (
        <button
          type="button"
          onClick={handleApplePay}
          disabled={loading !== null}
          aria-label="Pay with Apple Pay"
          className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-black text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {loading === "apple" ? (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M16.5 6.5c-.9 1-2.3 1.8-3.6 1.7-.2-1.3.4-2.7 1.2-3.5.9-1 2.4-1.8 3.6-1.7.1 1.3-.4 2.6-1.2 3.5zm1.2 1.9c-2-.1-3.7 1.1-4.6 1.1-1 0-2.4-1.1-4-1.1-2 0-3.9 1.2-4.9 3-2.1 3.6-.5 9 1.5 12 1 1.4 2.1 3 3.6 3 1.4-.1 2-.9 3.7-.9s2.2.9 3.7.9c1.5 0 2.5-1.4 3.5-2.8 1.1-1.6 1.5-3.2 1.6-3.3-.1 0-3-1.2-3-4.5 0-2.8 2.3-4.1 2.4-4.2-1.3-1.9-3.3-2.1-4-2.2z" /></svg>
              <span className="text-[15px] font-semibold">Pay</span>
            </>
          )}
        </button>
      )}
      {googlePayReady && GOOGLE_PAY_MERCHANT_ID && (
        <button
          type="button"
          onClick={handleGooglePay}
          disabled={loading !== null}
          aria-label="Pay with Google Pay"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-surface-border bg-white text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60"
        >
          {loading === "google" ? (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path fill="#4285F4" d="M12 11v2.6h4.2c-.2 1.1-1.6 3.2-4.2 3.2-2.5 0-4.6-2.1-4.6-4.8s2.1-4.8 4.6-4.8c1.4 0 2.4.6 2.9 1.1l2-1.9C15.7 4.6 14 3.8 12 3.8 7.6 3.8 4 7.4 4 11.8s3.6 8 8 8c4.6 0 7.7-3.2 7.7-7.8 0-.5-.1-.9-.1-1.3H12z" />
              </svg>
              <span className="text-[15px] font-semibold">Pay</span>
            </>
          )}
        </button>
      )}
      </div>
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
        <div className="h-px flex-1 bg-surface-border" />
        Or pay with card
        <div className="h-px flex-1 bg-surface-border" />
      </div>
    </div>
  );
}
