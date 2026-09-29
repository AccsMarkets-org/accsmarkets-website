"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { TagadaChargeResult } from "./TagadaCardForm";

// Same "dark until configured" convention as NEXT_PUBLIC_TAGADA_ENABLED in
// TagadaCardForm — every one of these has to be set (real merchant/BasisTheory
// registration on TagadaPay's dashboard) before either button renders at all,
// so an unconfigured deployment silently falls back to the card form only.
const STORE_ID = process.env.NEXT_PUBLIC_TAGADA_STORE_ID ?? "";
const TAGADA_PUBLIC_KEY = process.env.NEXT_PUBLIC_TAGADA_PUBLIC_KEY ?? "";
const BASISTHEORY_API_KEY = process.env.NEXT_PUBLIC_BASISTHEORY_API_KEY ?? "";
const BASISTHEORY_TENANT_ID = process.env.NEXT_PUBLIC_BASISTHEORY_TENANT_ID ?? "";
const GOOGLE_PAY_MERCHANT_ID = process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID ?? "";
const TEST_MODE = process.env.NEXT_PUBLIC_TAGADA_TEST_MODE === "true";

const APPLE_PAY_ENABLED =
  process.env.NEXT_PUBLIC_APPLE_PAY_ENABLED === "true" && Boolean(STORE_ID && TAGADA_PUBLIC_KEY && BASISTHEORY_API_KEY);
const GOOGLE_PAY_ENABLED =
  process.env.NEXT_PUBLIC_GOOGLE_PAY_ENABLED === "true" &&
  Boolean(BASISTHEORY_API_KEY && BASISTHEORY_TENANT_ID && GOOGLE_PAY_MERCHANT_ID);

interface DigitalWalletButtonsProps {
  amountUsd: number;
  endpoint?: string;
  onSuccess: (result: TagadaChargeResult) => void;
}

/**
 * Apple Pay / Google Pay express buttons for the wallet deposit + escrow
 * "pay the difference" card flows. Both wallets tokenize natively via
 * `@tagadapay/core-js` (BasisTheory under the hood) and hand back a token
 * that's wrapped into the exact same base64 TagadaToken string the manual
 * card form produces — so this posts to the SAME backend endpoint
 * (`/api/wallet/deposit/tagada` by default) with no server-side changes.
 *
 * Renders nothing (not even a loading placeholder) until device capability
 * is confirmed — Apple Pay only exists on Safari/iOS with a card in Wallet,
 * Google Pay only where the Google Pay SDK reports a usable payment method —
 * so there's never an empty/disabled button shown to someone who can't use it.
 */
export function DigitalWalletButtons({ amountUsd, endpoint = "/api/wallet/deposit/tagada", onSuccess }: DigitalWalletButtonsProps) {
  const [applePayReady, setApplePayReady] = useState(false);
  const [googlePayReady, setGooglePayReady] = useState(false);
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);
  const appleButtonHostRef = useRef<HTMLDivElement>(null);
  // The <apple-pay-button> element is created once (see the effect below) and
  // its click listener attached then -- a plain closure over payWithApple
  // would freeze whatever `amountUsd`/`busy` were at that moment, so every
  // later render refreshes this ref instead of ever re-attaching the listener.
  const payWithAppleRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!APPLE_PAY_ENABLED) return;
    let cancelled = false;
    import("@tagadapay/core-js")
      .then(async ({ isApplePayAvailable, ensureApplePayButtonElement }) => {
        const [available, elementReady] = await Promise.all([isApplePayAvailable(), ensureApplePayButtonElement()]);
        if (!cancelled) setApplePayReady(available && elementReady);
      })
      .catch(() => { if (!cancelled) setApplePayReady(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!GOOGLE_PAY_ENABLED) return;
    let cancelled = false;
    import("@tagadapay/core-js")
      .then(({ isGooglePayAvailable }) => isGooglePayAvailable(TEST_MODE))
      .then((available) => { if (!cancelled) setGooglePayReady(available); })
      .catch(() => { if (!cancelled) setGooglePayReady(false); });
    return () => { cancelled = true; };
  }, []);

  // Paints the compliant Apple Pay face (HIG requires their own markup, not
  // an arbitrary label) into the <apple-pay-button> custom element once it's
  // upgraded — imperative because the element's shadow root has no <slot>,
  // so React can't express these as normal children.
  useEffect(() => {
    if (!applePayReady || !appleButtonHostRef.current) return;
    import("@tagadapay/core-js").then(({ applePayFallbackFaceHTML, applePayAccessibleLabel }) => {
      const host = appleButtonHostRef.current;
      if (!host) return;
      const button = document.createElement("apple-pay-button") as HTMLElement;
      button.setAttribute("buttonstyle", "black");
      button.setAttribute("type", "pay");
      button.setAttribute("locale", "en");
      button.setAttribute("aria-label", applePayAccessibleLabel("pay"));
      button.style.setProperty("--apple-pay-button-width", "100%");
      button.style.setProperty("--apple-pay-button-height", "48px");
      button.style.setProperty("--apple-pay-button-border-radius", "12px");
      button.innerHTML = applePayFallbackFaceHTML("pay");
      button.addEventListener("click", () => payWithAppleRef.current());
      host.replaceChildren(button);
    });
    // amountUsd intentionally excluded: the button element is only (re)painted
    // when it first becomes ready, not on every keystroke in the amount field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applePayReady]);

  async function submitTagadaToken(tagadaToken: string, method: "apple" | "google") {
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd, tagadaToken, idempotencyKey }),
      });
      const rawText = await res.text();
      let data: { status?: string; paymentId?: string; error?: string };
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error("Couldn't reach our payment processor. Please try again.");
      }
      if (!res.ok) throw new Error(data.error ?? "Payment failed");
      onSuccess({ status: data.status as "completed" | "pending", paymentId: data.paymentId! });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
      fetch("/api/client-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `[${method}-pay] ${message}`, url: typeof window !== "undefined" ? window.location.href : undefined }),
      }).catch(() => {});
    } finally {
      setBusy(null);
    }
  }

  async function payWithApple() {
    if (busy || amountUsd < 1) return;
    setBusy("apple");
    const { startApplePaySession, applePayTokenToTagadaToken } = await import("@tagadapay/core-js");
    startApplePaySession(
      {
        basisTheoryApiKey: BASISTHEORY_API_KEY,
        countryCode: "US",
        storeName: "AccsMarkets",
        storeId: STORE_ID,
        tagadaApiKey: TAGADA_PUBLIC_KEY,
      },
      { currency: "USD", totalAmountMinor: Math.round(amountUsd * 100) },
      {
        onSuccess: async (token) => {
          await submitTagadaToken(applePayTokenToTagadaToken(token), "apple");
        },
        onError: (message) => {
          toast.error(message);
          setBusy(null);
        },
        onCancel: () => setBusy(null),
      },
    );
  }
  payWithAppleRef.current = payWithApple;

  async function payWithGoogle() {
    if (busy || amountUsd < 1) return;
    setBusy("google");
    const { startGooglePaySession } = await import("@tagadapay/core-js");
    const { googlePayTokenToTagadaToken } = await import("@/lib/tagada-wallet-token");
    startGooglePaySession(
      {
        basisTheoryApiKey: BASISTHEORY_API_KEY,
        basisTheoryTenantId: BASISTHEORY_TENANT_ID,
        merchantId: GOOGLE_PAY_MERCHANT_ID,
        merchantName: "AccsMarkets",
        countryCode: "US",
        sandboxed: TEST_MODE,
      },
      { currency: "USD", totalAmountMinor: Math.round(amountUsd * 100), totalPriceStatus: "FINAL" },
      {
        onSuccess: async (token) => {
          await submitTagadaToken(googlePayTokenToTagadaToken(token), "google");
        },
        onError: (message) => {
          toast.error(message);
          setBusy(null);
        },
        onCancel: () => setBusy(null),
      },
    );
  }

  if (!APPLE_PAY_ENABLED && !GOOGLE_PAY_ENABLED) return null;
  if (!applePayReady && !googlePayReady) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {applePayReady && (
          <div
            ref={appleButtonHostRef}
            className="h-12 w-full overflow-hidden rounded-xl"
            style={{ opacity: busy === "google" ? 0.5 : 1, pointerEvents: busy ? "none" : "auto" }}
          />
        )}
        {googlePayReady && (
          <button
            type="button"
            onClick={payWithGoogle}
            disabled={!!busy || amountUsd < 1}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            aria-label="Pay with Google Pay"
          >
            {busy === "google" ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            ) : (
              <>
                <svg viewBox="0 0 41 17" className="h-4 w-9" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.526 8.635v3.5h-1.088V3.55h2.9a2.62 2.62 0 011.882.744 2.516 2.516 0 010 3.6 2.64 2.64 0 01-1.882.737h-1.812v.004zm0-4.05v3.017h1.836a1.44 1.44 0 001.078-.436 1.474 1.474 0 000-2.132 1.42 1.42 0 00-1.078-.449h-1.836z" fill="#fff"/>
                  <path d="M25.98 6.478c.708 0 1.267.19 1.677.568.41.379.615.898.615 1.556v3.14h-1.04v-.81h-.047a1.988 1.988 0 01-1.729 1.05c-.66 0-1.212-.19-1.657-.573a1.83 1.83 0 01-.665-1.46c0-.617.234-1.107.702-1.47.469-.363 1.096-.545 1.882-.545.673 0 1.227.124 1.66.372v-.26c.002-.19-.038-.379-.117-.552a1.293 1.293 0 00-.328-.437 1.51 1.51 0 00-1.017-.372c-.588 0-1.053.248-1.396.744l-.958-.6c.492-.729 1.221-1.093 2.185-1.093l.233.192zm-1.407 3.712c0 .29.135.56.365.729.244.191.545.291.854.284a1.774 1.774 0 001.25-.52c.362-.346.543-.752.543-1.22-.354-.284-.848-.426-1.482-.426-.462 0-.847.112-1.156.337-.309.225-.374.502-.374.816z" fill="#fff"/>
                  <path d="M33.55 6.716l-3.63 8.343h-1.124l1.347-2.918-2.386-5.425h1.183l1.722 4.158h.024l1.677-4.158h1.187z" fill="#fff"/>
                  <path d="M16.06 7.887a5.03 5.03 0 00-.078-.9h-4.517v1.702h2.594a2.22 2.22 0 01-.958 1.457v1.208h.014a4.02 4.02 0 001.226-3.086 4.317 4.317 0 00-.281-.381z" fill="#4285F4"/>
                  <path d="M11.465 12.634a3.958 3.958 0 002.732-.998L13.02 10.4a2.42 2.42 0 01-1.556.53 2.55 2.55 0 01-2.396-1.758H6.98v1.245a3.984 3.984 0 003.503 2.216h.982z" fill="#34A853"/>
                  <path d="M9.068 9.172a2.541 2.541 0 010-1.626V6.301H6.98a3.976 3.976 0 000 3.615l2.088-.744z" fill="#FBBC04"/>
                  <path d="M11.465 5.788a2.17 2.17 0 011.527.596l1.135-1.128a3.837 3.837 0 00-2.662-1.036 3.984 3.984 0 00-3.503 2.216L9.068 7.68a2.55 2.55 0 012.397-1.892z" fill="#EA4335"/>
                </svg>
              </>
            )}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-surface-border" />
        Or pay with card
        <span className="h-px flex-1 bg-surface-border" />
      </div>
    </div>
  );
}
