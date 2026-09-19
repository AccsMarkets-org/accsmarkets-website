"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Toggle as ToggleSwitch } from "@/components/ui/Toggle";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlanData {
  id: string;
  name: string;
  displayName: string | null;
  description: string | null;
  features: string[];
  badge: string | null;
  color: string;
  isActive: boolean;
  isPopular: boolean;
  priceMonthly: number;
  priceAnnual: number | null;
  trialDays: number;
  listingLimit: number;
  maxEscrows: number;
  escrowFeeRate: number;
  minFee: number;
  sortOrder: number;
  subscribers: number;
  createdAt: string;
  updatedAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { label: "Slate",   value: "#64748b" },
  { label: "Blue",    value: "#3b82f6" },
  { label: "Brand",   value: "#f97316" },
  { label: "Purple",  value: "#8b5cf6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Rose",    value: "#f43f5e" },
  { label: "Amber",   value: "#f59e0b" },
  { label: "Cyan",    value: "#06b6d4" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function annualSavingsPct(monthly: number, annual: number | null): string {
  if (!annual || annual <= 0 || monthly <= 0) return "";
  const pct = Math.round((1 - annual / (monthly * 12)) * 100);
  return pct > 0 ? `Save ${pct}%` : "";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface px-5 py-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function ColorDot({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={color}
      className={`h-6 w-6 rounded-full transition ring-offset-2 ring-offset-background ${selected ? "ring-2 ring-brand-500" : "hover:scale-110"}`}
      style={{ backgroundColor: color }}
    />
  );
}

function FeaturesEditor({ features, onChange }: { features: string[]; onChange: (f: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function add() {
    const t = draft.trim();
    if (!t) return;
    onChange([...features, t]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg border border-surface-border bg-background px-3 py-1.5 text-sm">
            <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span className="flex-1 text-foreground">{f}</span>
            <button
              type="button"
              onClick={() => onChange(features.filter((_, j) => j !== i))}
              className="text-muted hover:text-danger transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
        {features.length === 0 && (
          <li className="text-xs text-muted py-1">No features added yet.</li>
        )}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add a feature bullet…"
          className="flex-1 rounded-lg border border-surface-border bg-background px-3 py-1.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Plan card (expanded edit view) ────────────────────────────────────────────

function PlanCard({
  plan,
  onSave,
  onDelete,
}: {
  plan: PlanData;
  onSave: (id: string, data: Partial<PlanData>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<PlanData>({ ...plan });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(plan);

  function field(key: keyof PlanData) {
    return (value: unknown) => setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(plan.id, form);
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan() {
    if (plan.subscribers > 0) {
      toast.error(`Cannot delete — ${plan.subscribers} user(s) are on this plan`);
      return;
    }
    if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/pricing?id=${plan.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Plan deleted");
      onDelete(plan.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setDeleting(false);
    }
  }

  const savings = annualSavingsPct(form.priceMonthly, form.priceAnnual);

  return (
    <div
      className={`rounded-2xl border-2 bg-background transition-all ${
        form.isActive ? "border-surface-border" : "border-dashed border-surface-border opacity-60"
      }`}
      style={form.isActive ? { borderLeftColor: form.color, borderLeftWidth: 4 } : undefined}
    >
      {/* ── Collapsed header ── */}
      <div className="flex flex-wrap items-center gap-3 p-4">
        {/* Color dot + name */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold shadow-sm"
            style={{ backgroundColor: form.color }}
          >
            {(form.displayName ?? form.name).slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground">{form.displayName ?? form.name}</span>
              {form.badge && (
                <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">{form.badge}</span>
              )}
              {form.isPopular && (
                <span className="rounded-full bg-brand-100 dark:bg-brand-900/50 px-2 py-0.5 text-[10px] font-bold text-brand-700">★ Popular</span>
              )}
              {!form.isActive && (
                <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-muted border border-surface-border">Inactive</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
              <span className="font-semibold text-foreground">${form.priceMonthly.toFixed(2)}/mo</span>
              {form.priceAnnual && <span>${form.priceAnnual.toFixed(2)}/yr {savings && <span className="text-emerald-600 dark:text-emerald-400 font-medium">{savings}</span>}</span>}
              <span>·</span>
              <span>{form.listingLimit === 0 ? "Unlimited" : form.listingLimit} listings</span>
              <span>·</span>
              <span>{(form.escrowFeeRate * 100).toFixed(1)}% fee</span>
            </div>
          </div>
        </div>

        {/* Subscriber badge */}
        <a
          href={`/admin/subscriptions?plan=${plan.name}`}
          className="flex items-center gap-1.5 rounded-xl border border-surface-border px-3 py-1.5 text-xs font-medium text-muted hover:border-brand-400 hover:text-foreground transition"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
          <span className="font-bold text-foreground">{plan.subscribers}</span>
          <span>subscribers</span>
        </a>

        {/* Active toggle */}
        <ToggleSwitch
          checked={form.isActive}
          onChange={async (newVal) => {
            setForm((f) => ({ ...f, isActive: newVal }));
            await onSave(plan.id, { ...form, isActive: newVal });
          }}
          activeColor="bg-emerald-500"
        />

        {/* Edit / Delete */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-xl border border-surface-border px-3 py-1.5 text-xs font-medium text-muted hover:border-brand-400 hover:text-brand-600 transition"
          >
            {expanded ? "Collapse" : "Edit"}
          </button>
          <button
            onClick={deletePlan}
            disabled={deleting}
            className="rounded-xl border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/5 transition disabled:opacity-40"
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </div>

      {/* ── Expanded edit form ── */}
      {expanded && (
        <div className="border-t border-surface-border p-5 space-y-6">

          {/* Row 1: Identity */}
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Identity</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Internal name</label>
                <input
                  value={form.name}
                  onChange={(e) => field("name")(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                  className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Display name</label>
                <input
                  value={form.displayName ?? ""}
                  onChange={(e) => field("displayName")(e.target.value || null)}
                  placeholder="e.g. Professional"
                  className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Badge text</label>
                <input
                  value={form.badge ?? ""}
                  onChange={(e) => field("badge")(e.target.value || null)}
                  placeholder="Most Popular / Best Value"
                  className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Description</label>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => field("description")(e.target.value || null)}
                rows={2}
                placeholder="Short description shown on the pricing page…"
                className="w-full resize-none rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
              />
            </div>
          </section>

          {/* Row 2: Color + flags */}
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Appearance & Flags</h3>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">Plan color</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <ColorDot key={c.value} color={c.value} selected={form.color === c.value} onClick={() => field("color")(c.value)} />
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => field("color")(e.target.value)}
                      className="h-6 w-6 cursor-pointer rounded-full border-0 p-0"
                      title="Custom color"
                    />
                    <span className="text-[10px] text-muted">Custom</span>
                  </div>
                </div>
              </div>
              <Toggle
                label="Mark as Popular"
                value={form.isPopular}
                onChange={(v) => field("isPopular")(v)}
              />
              <Toggle
                label="Active (accepting new subscribers)"
                value={form.isActive}
                onChange={(v) => field("isActive")(v)}
              />
            </div>
          </section>

          {/* Row 3: Pricing */}
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Pricing</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumField label="Monthly price ($)" value={form.priceMonthly} step="0.01" min={0} onChange={(v) => field("priceMonthly")(v)} />
              <NumField
                label={`Annual price ($) ${savings ? `· ${savings}` : ""}`}
                value={form.priceAnnual ?? ""}
                step="0.01"
                min={0}
                placeholder="Leave blank to hide"
                onChange={(v) => field("priceAnnual")(v === "" ? null : Number(v))}
              />
              <NumField label="Trial days" value={form.trialDays} step="1" min={0} max={365} onChange={(v) => field("trialDays")(Number(v))} />
              <NumField label="Sort order" value={form.sortOrder} step="1" min={0} onChange={(v) => field("sortOrder")(Number(v))} />
            </div>
          </section>

          {/* Row 4: Limits */}
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Limits</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumField label="Listing limit (0 = unlimited)" value={form.listingLimit} step="1" min={0} onChange={(v) => field("listingLimit")(Number(v))} />
              <NumField label="Concurrent escrows (0 = unlimited)" value={form.maxEscrows} step="1" min={0} onChange={(v) => field("maxEscrows")(Number(v))} />
              <NumField label="Escrow fee rate (%)" value={+(form.escrowFeeRate * 100).toFixed(3)} step="0.1" min={0} max={100} onChange={(v) => field("escrowFeeRate")(Number(v) / 100)} />
              <NumField label="Min escrow fee ($)" value={form.minFee} step="0.50" min={0} onChange={(v) => field("minFee")(Number(v))} />
            </div>
          </section>

          {/* Row 5: Features */}
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Feature List</h3>
            <p className="mb-3 text-xs text-muted">These bullet points appear on the public pricing page for this plan.</p>
            <FeaturesEditor features={form.features} onChange={(f) => field("features")(f)} />
          </section>

          {/* Live preview */}
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Live Preview</h3>
            <PlanPreview plan={form} />
          </section>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2 border-t border-surface-border">
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition"
            >
              {saving ? "Saving…" : dirty ? "Save Changes" : "Up to date"}
            </button>
            {dirty && (
              <button
                onClick={() => setForm({ ...plan })}
                className="rounded-xl border border-surface-border px-4 py-2.5 text-sm text-muted hover:text-foreground transition"
              >
                Discard
              </button>
            )}
            <span className="text-xs text-muted ml-auto">
              {plan.subscribers} subscriber{plan.subscribers !== 1 ? "s" : ""} · Updated {new Date(plan.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini preview card ─────────────────────────────────────────────────────────

function PlanPreview({ plan }: { plan: PlanData }) {
  const savings = annualSavingsPct(plan.priceMonthly, plan.priceAnnual);
  return (
    <div className="w-72 rounded-2xl border-2 bg-background p-5 space-y-4" style={{ borderColor: plan.color }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground" style={{ color: plan.color }}>
          {plan.displayName ?? plan.name}
        </span>
        {plan.badge && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: plan.color }}>{plan.badge}</span>}
      </div>
      {plan.description && <p className="text-xs text-muted leading-relaxed">{plan.description}</p>}
      <div>
        <span className="text-3xl font-black text-foreground">${plan.priceMonthly.toFixed(2)}</span>
        <span className="text-sm text-muted">/month</span>
        {plan.priceAnnual && (
          <div className="mt-0.5 text-xs text-muted">
            ${plan.priceAnnual.toFixed(2)}/year
            {savings && <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{savings}</span>}
          </div>
        )}
      </div>
      {plan.features.length > 0 && (
        <ul className="space-y-1.5">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: plan.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 13l4 4L19 7" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      )}
      <button
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition"
        style={{ backgroundColor: plan.color }}
        disabled
      >
        {plan.trialDays > 0 ? `Start ${plan.trialDays}-day trial` : "Get started"}
      </button>
    </div>
  );
}

// ── Shared form controls ──────────────────────────────────────────────────────

function NumField({
  label, value, step, min, max, placeholder, onChange,
}: {
  label: string; value: number | string; step: string; min: number; max?: number; placeholder?: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
      />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <ToggleSwitch checked={value} onChange={onChange} />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

// ── Create plan form ──────────────────────────────────────────────────────────

const BLANK: Omit<PlanData, "id" | "subscribers" | "createdAt" | "updatedAt"> = {
  name: "", displayName: null, description: null, features: [], badge: null,
  color: "#f97316", isActive: true, isPopular: false,
  priceMonthly: 0, priceAnnual: null, trialDays: 0,
  listingLimit: 10, maxEscrows: 0, escrowFeeRate: 0.05, minFee: 1, sortOrder: 0,
};

function CreatePlanForm({ onCreated }: { onCreated: (plan: PlanData) => void }) {
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);

  function field(key: keyof typeof form) {
    return (value: unknown) => setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Plan name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name: form.name.toUpperCase().trim(), escrowFeeRate: form.escrowFeeRate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Plan "${data.plan.name}" created`);
      onCreated(data.plan);
      setForm({ ...BLANK });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border-2 border-brand-300 bg-brand-50/30 p-5 space-y-5">
      <h2 className="font-bold text-foreground">New Subscription Plan</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Plan name (internal) *</label>
          <input
            required
            value={form.name}
            onChange={(e) => field("name")(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
            placeholder="STARTER"
            className="w-full font-mono rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Display name</label>
          <input
            value={form.displayName ?? ""}
            onChange={(e) => field("displayName")(e.target.value || null)}
            placeholder="Starter"
            className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Badge</label>
          <input
            value={form.badge ?? ""}
            onChange={(e) => field("badge")(e.target.value || null)}
            placeholder="Most Popular"
            className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Monthly price ($)</label>
          <input type="number" min={0} step="0.01" value={form.priceMonthly}
            onChange={(e) => field("priceMonthly")(parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Annual price ($)</label>
          <input type="number" min={0} step="0.01" value={form.priceAnnual ?? ""}
            onChange={(e) => field("priceAnnual")(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="Optional"
            className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Trial days</label>
          <input type="number" min={0} max={365} step="1" value={form.trialDays}
            onChange={(e) => field("trialDays")(parseInt(e.target.value) || 0)}
            className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Listing limit (0 = unlimited)</label>
          <input type="number" min={0} step="1" value={form.listingLimit}
            onChange={(e) => field("listingLimit")(parseInt(e.target.value) || 0)}
            className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Escrow fee (%)</label>
          <input type="number" min={0} max={100} step="0.1" value={+(form.escrowFeeRate * 100).toFixed(2)}
            onChange={(e) => field("escrowFeeRate")(parseFloat(e.target.value) / 100 || 0)}
            className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Min fee ($)</label>
          <input type="number" min={0} step="0.5" value={form.minFee}
            onChange={(e) => field("minFee")(parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm" />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">Plan color</label>
        <div className="flex gap-2">
          {PRESET_COLORS.map((c) => (
            <ColorDot key={c.value} color={c.value} selected={form.color === c.value} onClick={() => field("color")(c.value)} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Toggle label="Active" value={form.isActive} onChange={(v) => field("isActive")(v)} />
        <Toggle label="Mark as Popular" value={form.isPopular} onChange={(v) => field("isPopular")(v)} />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition">
          {saving ? "Creating…" : "Create Plan"}
        </button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PricingAdminClient({ initialPlans }: { initialPlans: PlanData[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanData[]>(initialPlans);
  const [showCreate, setShowCreate] = useState(initialPlans.length === 0);

  const totalSubscribers = plans.reduce((s, p) => s + p.subscribers, 0);
  const activePlans = plans.filter((p) => p.isActive).length;
  const mrr = plans.reduce((s, p) => s + p.priceMonthly * p.subscribers, 0);

  const handleSave = useCallback(async (id: string, data: Partial<PlanData>) => {
    const res = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plans: [{ id, ...data }] }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Save failed"); return; }
    toast.success("Plan saved");
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)));
    router.refresh();
  }, [router]);

  const handleDelete = useCallback((id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleCreated = useCallback((plan: PlanData) => {
    setPlans((prev) => [...prev, plan]);
    setShowCreate(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
          <p className="mt-1 text-sm text-muted">Manage plans, pricing, features, and limits</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition"
        >
          {showCreate ? "✕ Cancel" : "+ New Plan"}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Plans" value={plans.length} sub={`${activePlans} active`} />
        <StatCard label="Total Subscribers" value={totalSubscribers} />
        <StatCard label="Estimated MRR" value={`$${mrr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="based on monthly prices" />
        <StatCard label="Plans with Trials" value={plans.filter((p) => p.trialDays > 0).length} />
      </div>

      {/* Create form */}
      {showCreate && (
        <CreatePlanForm onCreated={handleCreated} />
      )}

      {/* Info */}
      {plans.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Price changes apply to <strong>new subscriptions immediately</strong>. Existing subscribers keep their rate until renewal.
          Deactivating a plan hides it from new sign-ups but does not cancel existing subscribers.
        </div>
      )}

      {/* Plan list */}
      <div className="flex flex-col gap-4">
        {plans
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
          .map((plan) => (
            <PlanCard key={plan.id} plan={plan} onSave={handleSave} onDelete={handleDelete} />
          ))}
        {plans.length === 0 && !showCreate && (
          <div className="rounded-2xl border border-dashed border-surface-border bg-surface p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
              <svg className="h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <p className="font-semibold text-foreground">No subscription plans yet</p>
            <p className="mt-1 text-sm text-muted">Create your first plan to start offering subscriptions to users.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition"
            >
              + Create First Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
