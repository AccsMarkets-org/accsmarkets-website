"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  rolloutPct: number;
  createdAt: Date | string;
}

export function FeatureFlagManager({ initialFlags }: { initialFlags: FeatureFlag[] }) {
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  // Draft rollout values — committed on mouseup/blur only (prevents one PATCH per tick)
  const [draftRollout, setDraftRollout] = useState<Record<string, number>>({});

  async function toggle(flag: FeatureFlag) {
    const res = await fetch(`/api/admin/feature-flags/${flag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !flag.enabled }),
    });
    if (res.ok) {
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, enabled: !flag.enabled } : f)));
    }
  }

  function handleRolloutChange(flag: FeatureFlag, pct: number) {
    setDraftRollout((prev) => ({ ...prev, [flag.id]: pct }));
  }

  async function commitRollout(flag: FeatureFlag) {
    const pct = draftRollout[flag.id] ?? flag.rolloutPct;
    if (pct === flag.rolloutPct) return;
    await fetch(`/api/admin/feature-flags/${flag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rolloutPct: pct }),
    });
    setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, rolloutPct: pct } : f)));
    setDraftRollout((prev) => { const next = { ...prev }; delete next[flag.id]; return next; });
  }

  async function deleteFlag(id: string) {
    const res = await fetch(`/api/admin/feature-flags/${id}`, { method: "DELETE" });
    if (res.ok) {
      setFlags((prev) => prev.filter((f) => f.id !== id));
      toast.success("Flag deleted");
    }
  }

  async function createFlag() {
    if (!newKey.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim(), description: newDesc.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFlags((prev) => [...prev, data.flag]);
      setNewKey("");
      setNewDesc("");
      toast.success("Flag created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Create form */}
      <div className="flex gap-2 flex-wrap">
        <input
          placeholder="flag_key (snake_case)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="rounded-xl border border-surface-border bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 w-40 sm:text-sm"
        />
        <input
          placeholder="Description (optional)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="flex-1 rounded-xl border border-surface-border bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm"
        />
        <button
          onClick={createFlag}
          disabled={creating || !newKey.trim()}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Create
        </button>
      </div>

      {flags.length === 0 ? (
        <p className="text-sm text-muted">No feature flags defined yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {flags.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm font-semibold text-foreground">{f.key}</code>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      f.enabled ? "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400" : "bg-surface-border text-muted"
                    }`}
                  >
                    {f.enabled ? "ON" : "OFF"}
                  </span>
                </div>
                {f.description && <p className="text-xs text-muted mt-0.5">{f.description}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted">
                  Rollout
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={draftRollout[f.id] ?? f.rolloutPct}
                    onChange={(e) => handleRolloutChange(f, Number(e.target.value))}
                    onMouseUp={() => commitRollout(f)}
                    onBlur={() => commitRollout(f)}
                    className="w-24 accent-brand-600"
                  />
                  <span className="w-8 text-foreground">{draftRollout[f.id] ?? f.rolloutPct}%</span>
                </label>

                <button
                  onClick={() => toggle(f)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium ${
                    f.enabled
                      ? "bg-surface-border text-muted hover:bg-red-100 dark:hover:bg-red-950/40 hover:text-danger"
                      : "bg-brand-600 text-white hover:bg-brand-700"
                  }`}
                >
                  {f.enabled ? "Disable" : "Enable"}
                </button>

                <button
                  onClick={() => deleteFlag(f.id)}
                  className="text-xs text-danger hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
