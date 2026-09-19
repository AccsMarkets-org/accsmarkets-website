"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  CURRENCIES,
  FALLBACK_RATES,
  DEFAULT_CURRENCY,
  convertFromUsd,
  formatMoney,
} from "@/lib/currency";

interface CurrencyContextValue {
  /** Active display currency code (e.g. "INR"). Always "USD" until `ready`. */
  currency: string;
  /** True once detection + rates have loaded on the client. */
  ready: boolean;
  /** Whether the active currency differs from USD (i.e. values are converted). */
  isConverted: boolean;
  /** Convert a USD amount into the active currency's units. */
  convert: (usd: number) => number;
  /** Format a USD amount in the active currency. */
  format: (usd: number) => string;
  /** Manually override the display currency (persists in localStorage). */
  setCurrency: (code: string) => void;
  /** All selectable currency codes. */
  options: string[];
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const LS_OVERRIDE = "am_currency";
const LS_RATES = "am_rates";
const RATES_TTL = 1000 * 60 * 60 * 6; // 6h

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Start as USD/not-ready on both server and first client render → no hydration
  // mismatch. Detection happens in the effect below, after mount.
  const [currency, setCurrencyState] = useState<string>(DEFAULT_CURRENCY);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 1) Instant paint from any cached rates so conversion doesn't wait on network.
    try {
      const cached = localStorage.getItem(LS_RATES);
      if (cached) {
        const parsed = JSON.parse(cached) as { rates: Record<string, number>; at: number };
        if (parsed?.rates && Date.now() - parsed.at < RATES_TTL) setRates(parsed.rates);
      }
    } catch {}

    const override = (() => {
      try {
        const v = localStorage.getItem(LS_OVERRIDE);
        return v && CURRENCIES[v] ? v : null;
      } catch {
        return null;
      }
    })();

    // 2) Fetch fresh rates + geo-detected currency.
    (async () => {
      try {
        const res = await fetch("/api/currency", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as {
            currency: string;
            rates: Record<string, number>;
          };
          if (cancelled) return;
          if (data.rates) {
            setRates(data.rates);
            try {
              localStorage.setItem(LS_RATES, JSON.stringify({ rates: data.rates, at: Date.now() }));
            } catch {}
          }
          // Manual override always wins over geo-detection.
          const next = override ?? (CURRENCIES[data.currency] ? data.currency : DEFAULT_CURRENCY);
          setCurrencyState(next);
        } else if (override) {
          setCurrencyState(override);
        }
      } catch {
        if (!cancelled && override) setCurrencyState(override);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((code: string) => {
    if (!CURRENCIES[code]) return;
    setCurrencyState(code);
    try {
      localStorage.setItem(LS_OVERRIDE, code);
    } catch {}
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      ready,
      isConverted: ready && currency !== DEFAULT_CURRENCY,
      convert: (usd: number) => convertFromUsd(usd, currency, rates),
      format: (usd: number) => formatMoney(convertFromUsd(usd, currency, rates), currency),
      setCurrency,
      options: Object.keys(CURRENCIES),
    }),
    [currency, rates, ready, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Safe no-op fallback if used outside the provider (keeps components rendering in USD).
    return {
      currency: DEFAULT_CURRENCY,
      ready: false,
      isConverted: false,
      convert: (usd: number) => usd,
      format: (usd: number) => formatMoney(usd, DEFAULT_CURRENCY),
      setCurrency: () => {},
      options: Object.keys(CURRENCIES),
    };
  }
  return ctx;
}
