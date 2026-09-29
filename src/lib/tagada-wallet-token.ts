/**
 * Wraps the raw BasisTheory token that `startGooglePaySession` (from
 * `@tagadapay/core-js`) hands back into a base64 TagadaToken string, ready for
 * `POST /payment-instruments/create-from-token` — i.e. the exact same shape
 * `applePayTokenToTagadaToken` produces for the Apple Pay native flow.
 *
 * `@tagadapay/core-js` ships `applePayTokenToTagadaToken` for Apple but has no
 * Google equivalent even though `GooglePayTokenResult` (native flow) is
 * structurally identical to `ApplePayTokenResult` (same `id`/`type`/`card`
 * shape) — this mirrors that helper's own implementation rather than
 * reinventing the wrapping.
 */
import { createTagadaToken, type GooglePayTokenResult } from "@tagadapay/core-js";

export function googlePayTokenToTagadaToken(token: GooglePayTokenResult): string {
  const card = token.card ?? ({} as GooglePayTokenResult["card"]);
  return createTagadaToken(
    {
      id: token.id,
      type: "google_pay",
      data: {
        expiration_month: card.expiration_month,
        expiration_year: card.expiration_year,
      },
      metadata: {
        rawProviderResponse: {
          card: { last4: card.last4, bin: card.bin, brand: card.brand },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- createTagadaToken's
      // published .d.ts declares CardTokenResponse | GooglePayTokenResponse, neither of
      // which types this literal exactly (see module docstring); the runtime only reads
      // id/type/data/metadata off it, same fields applePayTokenToTagadaToken passes.
    } as any,
  );
}
