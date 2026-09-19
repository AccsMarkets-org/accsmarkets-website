/**
 * Lightweight Stripe singleton. Returns null when STRIPE_SECRET_KEY is not set
 * so the card deposit tab can be hidden without crashing the rest of the app.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _stripe: any = null;
let _tried = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getStripe(): Promise<any> {
  if (_tried) return _stripe;
  _tried = true;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    // Dynamic require prevents webpack from bundling stripe when not installed
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const Stripe = (new Function('m', 'return require(m)'))('stripe');
    _stripe = new (Stripe.default ?? Stripe)(key, { apiVersion: "2024-04-10" });
  } catch {
    _stripe = null;
  }
  return _stripe;
}
