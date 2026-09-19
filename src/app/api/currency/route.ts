import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import {
  CURRENCIES,
  FALLBACK_RATES,
  currencyForCountry,
  DEFAULT_CURRENCY,
} from "@/lib/currency";

const SUPPORTED = Object.keys(CURRENCIES);

// Fetch USD-based rates from a free, no-key provider. Cached 6h across all
// users (rates are shared). Falls back to the static table if the fetch fails,
// so the endpoint can never break price display.
const getRates = unstable_cache(
  async (): Promise<{ rates: Record<string, number>; updatedAt: string }> => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD", {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          result?: string;
          rates?: Record<string, number>;
          time_last_update_utc?: string;
        };
        if (data.result === "success" && data.rates) {
          const rates: Record<string, number> = { USD: 1 };
          for (const code of SUPPORTED) {
            if (typeof data.rates[code] === "number") rates[code] = data.rates[code];
            else if (FALLBACK_RATES[code] != null) rates[code] = FALLBACK_RATES[code];
          }
          return { rates, updatedAt: data.time_last_update_utc ?? new Date().toISOString() };
        }
      }
    } catch {
      // fall through to static table
    }
    return { rates: { ...FALLBACK_RATES }, updatedAt: new Date().toISOString() };
  },
  ["currency-rates-usd"],
  { revalidate: 60 * 60 * 6 },
);

export const dynamic = "force-dynamic";

export async function GET() {
  const h = headers();
  const country = h.get("cf-ipcountry") ?? h.get("x-vercel-ip-country") ?? null;
  const detected = currencyForCountry(country);
  const currency = SUPPORTED.includes(detected) ? detected : DEFAULT_CURRENCY;

  const { rates, updatedAt } = await getRates();

  return NextResponse.json(
    { currency, base: "USD", rates, updatedAt },
    {
      headers: {
        // Per-user (country) response — must not be shared across visitors by the CDN.
        "Cache-Control": "private, no-store",
      },
    },
  );
}
