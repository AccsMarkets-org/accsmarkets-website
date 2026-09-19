"use client";

import { useState, useRef, useEffect } from "react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency, options, ready } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const meta = CURRENCIES[currency] ?? CURRENCIES.USD;

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change currency"
        suppressHydrationWarning
        className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:border-brand-300 hover:text-brand-600"
      >
        <span className="text-sm leading-none">{meta.symbol}</span>
        <span>{currency}</span>
        <svg className="h-3 w-3 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 max-h-72 w-52 overflow-y-auto rounded-xl border border-surface-border bg-background p-1 shadow-xl">
          {!ready && (
            <p className="px-3 py-1.5 text-[11px] text-muted">Detecting your region…</p>
          )}
          {options.map((code) => {
            const m = CURRENCIES[code];
            const active = code === currency;
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setCurrency(code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-xs transition",
                  active ? "bg-brand-500/10 text-brand-700 dark:text-brand-400" : "text-foreground hover:bg-surface-border/40",
                )}
              >
                <span className="w-6 shrink-0 text-sm">{m.symbol}</span>
                <span className="font-semibold">{code}</span>
                <span className="truncate text-muted">{m.name}</span>
                {active && (
                  <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
          <p className="px-3 py-1.5 text-[10px] leading-tight text-muted">
            Prices are estimates. Payments settle in USD.
          </p>
        </div>
      )}
    </div>
  );
}
