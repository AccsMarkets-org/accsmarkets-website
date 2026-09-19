"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import type { PlatformSettings } from "@prisma/client";

interface Props { settings: PlatformSettings }

export function AdminSettingsForm({ settings }: Props) {
  const [form, setForm] = useState({
    siteName:                          settings.siteName,
    maintenanceMode:                   settings.maintenanceMode,
    registrationOpen:                  settings.registrationOpen,
    requireEmailVerification:          settings.requireEmailVerification,
    minDeposit:                        String(settings.minDeposit),
    minWithdrawal:                     String(settings.minWithdrawal),
    escrowTransferDays:                String(settings.escrowTransferDays),
    disputeWindowHours:                String(settings.disputeWindowHours),
    highValueEscrowThreshold:          String(settings.highValueEscrowThreshold),
    listingReviewHours:                String(settings.listingReviewHours),
    bankTransferShortfallToleranceUsd: String(settings.bankTransferShortfallToleranceUsd),
    bankTransferShortfallTolerancePct: String(settings.bankTransferShortfallTolerancePct),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: data.error ?? "Save failed." }); return; }
      setMsg({ ok: true, text: "Settings saved." });
    } catch {
      setMsg({ ok: false, text: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  const toggle = (field: "maintenanceMode" | "registrationOpen" | "requireEmailVerification") =>
    setForm((f) => ({ ...f, [field]: !f[field] }));

  function numField(field: keyof typeof form, min = 0, step?: string) {
    return (
      <input
        type="number"
        value={form[field] as string}
        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
        className="h-9 w-36 rounded-xl border border-surface-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm"
        min={min}
        step={step}
        required
      />
    );
  }

  function textField(field: keyof typeof form) {
    return (
      <input
        type="text"
        value={form[field] as string}
        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
        className="h-9 w-full rounded-xl border border-surface-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm"
      />
    );
  }

  function ToggleRow({ field, label, description }: { field: "maintenanceMode" | "registrationOpen" | "requireEmailVerification"; label: string; description: string }) {
    return (
      <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <Toggle checked={form[field]} onChange={() => toggle(field)} />
      </label>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* General */}
      <Card>
        <h2 className="mb-1 font-semibold">General</h2>
        <p className="text-xs text-muted mb-4">Site identity and core mode toggles.</p>
        <label className="flex flex-col gap-1 text-sm mb-4">
          <span className="font-medium">Site name</span>
          <p className="text-xs text-muted">Displayed in the browser tab and emails.</p>
          {textField("siteName")}
        </label>
        <div className="divide-y divide-surface-border">
          <ToggleRow field="maintenanceMode" label="Maintenance mode" description="Shows maintenance page to all non-admin visitors." />
          <ToggleRow field="registrationOpen" label="Registration open" description="Allow new user sign-ups." />
        </div>
      </Card>

      {/* Security */}
      <Card>
        <h2 className="mb-1 font-semibold">Security</h2>
        <p className="text-xs text-muted mb-4">Authentication requirements.</p>
        <div className="divide-y divide-surface-border">
          <ToggleRow field="requireEmailVerification" label="Require email verification" description="Users must verify email before accessing the platform." />
        </div>
      </Card>

      {/* Financial limits */}
      <Card>
        <h2 className="mb-1 font-semibold">Financial Limits</h2>
        <p className="text-xs text-muted mb-4">Minimum amounts for deposits and withdrawals.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Min deposit (USD)</span>
            <p className="text-xs text-muted">Minimum amount a user can deposit.</p>
            {numField("minDeposit")}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Min withdrawal (USD)</span>
            <p className="text-xs text-muted">Minimum amount a user can withdraw.</p>
            {numField("minWithdrawal")}
          </label>
        </div>
      </Card>

      {/* Escrow */}
      <Card>
        <h2 className="mb-1 font-semibold">Escrow &amp; Disputes</h2>
        <p className="text-xs text-muted mb-4">Time windows and thresholds for escrow processing.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Transfer deadline (days)</span>
            <p className="text-xs text-muted">Days buyer has to complete the account transfer.</p>
            {numField("escrowTransferDays", 1)}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Dispute window (hours)</span>
            <p className="text-xs text-muted">Hours after transfer to raise a dispute.</p>
            {numField("disputeWindowHours", 1)}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">High-value threshold (USD)</span>
            <p className="text-xs text-muted">Escrows above this are flagged as high-value.</p>
            {numField("highValueEscrowThreshold")}
          </label>
        </div>
      </Card>

      {/* Bank Transfer */}
      <Card>
        <h2 className="mb-1 font-semibold">Bank Transfer</h2>
        <p className="text-xs text-muted mb-4">Tolerance for received amounts that are slightly under the expected total.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Shortfall tolerance (USD)</span>
            <p className="text-xs text-muted">Flat USD amount under expected that is still accepted.</p>
            {numField("bankTransferShortfallToleranceUsd", 0, "0.01")}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Shortfall tolerance (%)</span>
            <p className="text-xs text-muted">Percentage under expected that is still accepted.</p>
            {numField("bankTransferShortfallTolerancePct", 0, "0.001")}
          </label>
        </div>
      </Card>

      {/* Review */}
      <Card>
        <h2 className="mb-1 font-semibold">Review</h2>
        <p className="text-xs text-muted mb-4">Listing review and moderation windows.</p>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Listing review window (hours)</span>
          <p className="text-xs text-muted">Time allowed to review a new listing before it is auto-approved.</p>
          {numField("listingReviewHours", 1)}
        </label>
      </Card>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {msg && <span className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}
