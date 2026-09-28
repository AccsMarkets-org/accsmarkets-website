/**
 * Lightweight TagadaPay singleton, mirroring the graceful-degradation pattern
 * in src/lib/stripe.ts: getTagada() resolves to null when TAGADA_API_KEY is
 * not set, so the card deposit tab / "pay the difference" checkout flow can
 * stay hidden without crashing the rest of the app.
 *
 * Unlike stripe.ts (which leans on a `new Function('m','return require(m)')`
 * eval hack because the `stripe` package was never actually installed here),
 * `@tagadapay/node-sdk` IS a real installed dependency. This uses a plain
 * dynamic import() instead of the eval hack, gated behind the env-var check
 * below — the module is only ever loaded (and `new Tagada(...)` only ever
 * constructed) once TAGADA_API_KEY is present, so an unconfigured deployment
 * never pays for it and never crashes at module-load time.
 *
 * Env vars (see .env.example):
 *   TAGADA_API_KEY          Processing Key — "tp_sk_live_..." or "tp_sk_test_..."
 *   TAGADA_STORE_ID         Store to charge/credit against
 *   TAGADA_WEBHOOK_SECRET   Verifies inbound `POST /api/webhooks/tagada` signatures
 *   NEXT_PUBLIC_TAGADA_ENABLED     "true" to show the Card (TagadaPay) tab client-side
 *   NEXT_PUBLIC_TAGADA_TEST_MODE   "true" to show a "TEST MODE" badge on that tab
 */
import type Tagada from "@tagadapay/node-sdk";

let _tagada: Tagada | null = null;
let _tried = false;

export async function getTagada(): Promise<Tagada | null> {
  if (_tried) return _tagada;
  _tried = true;

  const key = process.env.TAGADA_API_KEY;
  if (!key) return null;

  try {
    const { default: TagadaSDK } = await import("@tagadapay/node-sdk");
    _tagada = new TagadaSDK(key);
  } catch {
    _tagada = null;
  }
  return _tagada;
}

/** True when TAGADA_API_KEY is a test-mode Processing Key ("tp_sk_test_..."). */
export function isTagadaTestMode(): boolean {
  return Boolean(process.env.TAGADA_API_KEY?.startsWith("tp_sk_test_"));
}
