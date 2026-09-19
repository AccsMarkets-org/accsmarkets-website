"use client";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatCurrency } from "@/lib/utils";

interface LocalPriceProps {
  /** Amount in USD (the canonical stored/settled currency). */
  usd: number | string;
  className?: string;
  /** Show a muted "≈ $X USD" hint under/after the local price. */
  usdHint?: boolean;
  /** Prefix converted values with "≈" to signal they're approximate. Default true. */
  approx?: boolean;
}

/**
 * Renders a USD-stored price in the visitor's local currency (auto-detected).
 * Falls back to plain USD before the client is ready or when the local currency
 * IS USD, so the value is always correct and there's no hydration mismatch.
 */
export function LocalPrice({ usd, className, usdHint = false, approx = true }: LocalPriceProps) {
  const { format, isConverted } = useCurrency();
  const amount = typeof usd === "string" ? parseFloat(usd) : usd;
  const usdText = formatCurrency(amount);

  if (!Number.isFinite(amount)) {
    return <span className={className}>{usdText}</span>;
  }

  if (!isConverted) {
    // Not ready yet, or the user's currency is USD — show USD as-is.
    return (
      <span className={className} suppressHydrationWarning>
        {usdText}
      </span>
    );
  }

  return (
    <span className={className} suppressHydrationWarning>
      {approx ? "≈ " : ""}
      {format(amount)}
      {usdHint && <span className="ml-1 text-[0.75em] font-normal text-muted">({usdText})</span>}
    </span>
  );
}
