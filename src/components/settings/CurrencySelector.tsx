"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";

const CURRENCIES = [
  { code: "USD", label: "US Dollar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "AUD", label: "Australian Dollar (AUD)" },
  { code: "CAD", label: "Canadian Dollar (CAD)" },
  { code: "JPY", label: "Japanese Yen (JPY)" },
  { code: "CNY", label: "Chinese Yuan (CNY)" },
  { code: "INR", label: "Indian Rupee (INR)" },
  { code: "BRL", label: "Brazilian Real (BRL)" },
  { code: "MXN", label: "Mexican Peso (MXN)" },
  { code: "NGN", label: "Nigerian Naira (NGN)" },
  { code: "AED", label: "UAE Dirham (AED)" },
];

export function CurrencySelector({ initial }: { initial: string }) {
  const [currency, setCurrency] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/currency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayCurrency: currency }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Display currency updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Choose how amounts are displayed across the platform. Your wallet and transactions always stay in USD — this is a display-only setting.
      </p>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="h-10 rounded-xl border border-surface-border bg-background px-3 text-sm focus:border-brand-400 focus:outline-none"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
      <Button size="sm" isLoading={saving} onClick={save} disabled={currency === initial}>
        Save preference
      </Button>
    </div>
  );
}
