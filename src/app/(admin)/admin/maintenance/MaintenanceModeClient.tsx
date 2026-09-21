"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import toast from "react-hot-toast";
import { ArrowRight } from "lucide-react";

interface Props {
  initialMode: boolean;
  initialTitle: string | null;
  initialMessage: string | null;
  initialEndTime: string | null;
  initialAllowAdmins: boolean;
}

const PRESET_MESSAGES = [
  {
    title: "Scheduled Maintenance",
    message: "We're performing scheduled maintenance to improve our services. We'll be back shortly!",
  },
  {
    title: "System Upgrade",
    message: "We're upgrading our systems to serve you better. Thank you for your patience.",
  },
  {
    title: "Emergency Maintenance",
    message: "We're experiencing technical difficulties and are working to resolve them as quickly as possible.",
  },
  {
    title: "Database Optimization",
    message: "We're optimizing our database for better performance. The platform will be available again soon.",
  },
];

export function MaintenanceModeClient({ initialMode, initialTitle, initialMessage, initialEndTime, initialAllowAdmins }: Props) {
  const [enabled, setEnabled] = useState(initialMode);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [endTime, setEndTime] = useState(initialEndTime ? initialEndTime.slice(0, 16) : "");
  const [allowAdmins, setAllowAdmins] = useState(initialAllowAdmins);
  const [saving, setSaving] = useState(false);
  const [quickEnabling, setQuickEnabling] = useState(false);

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenanceMode: enabled,
          maintenanceTitle: title || null,
          maintenanceMessage: message || null,
          maintenanceEndTime: endTime ? new Date(endTime).toISOString() : null,
          maintenanceAllowAdmins: allowAdmins,
        }),
      });
      if (res.ok) {
        toast.success(enabled ? "Maintenance mode enabled" : "Maintenance mode disabled");
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function quickToggle(enable: boolean) {
    setQuickEnabling(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenanceMode: enable,
          maintenanceTitle: enable ? (title || "Maintenance in Progress") : title,
          maintenanceMessage: enable ? (message || "We'll be back shortly. Thank you for your patience.") : message,
          maintenanceEndTime: endTime ? new Date(endTime).toISOString() : null,
          maintenanceAllowAdmins: allowAdmins,
        }),
      });
      if (res.ok) {
        setEnabled(enable);
        if (enable && !title) setTitle("Maintenance in Progress");
        if (enable && !message) setMessage("We'll be back shortly. Thank you for your patience.");
        toast.success(enable ? "Maintenance mode ENABLED" : "Site is now LIVE");
      } else {
        toast.error("Failed to toggle");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setQuickEnabling(false);
    }
  }

  function applyPreset(preset: typeof PRESET_MESSAGES[0]) {
    setTitle(preset.title);
    setMessage(preset.message);
    toast.success("Preset applied");
  }

  function setEndTimePreset(minutes: number) {
    const date = new Date(Date.now() + minutes * 60 * 1000);
    setEndTime(date.toISOString().slice(0, 16));
  }

  return (
    <div className="space-y-6">
      {/* Quick Toggle Card */}
      <Card className={`relative overflow-hidden ${enabled ? "border-warning" : "border-success/50"}`}>
        <div className={`absolute inset-0 ${enabled ? "bg-warning/5" : "bg-success/5"}`} />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                enabled ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
              }`}>
                {enabled ? (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {enabled ? "Maintenance Mode Active" : "Site is Live"}
                </h2>
                <p className="text-sm text-muted">
                  {enabled
                    ? "Users cannot access the platform right now"
                    : "All users can access the platform normally"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {enabled ? (
                <button
                  onClick={() => quickToggle(false)}
                  disabled={quickEnabling}
                  className="flex items-center gap-2 rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-white hover:bg-success/90 disabled:opacity-50 transition shadow-sm"
                >
                  {quickEnabling ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M5 3l14 9-14 9V3z" />
                    </svg>
                  )}
                  Go Live Now
                </button>
              ) : (
                <button
                  onClick={() => quickToggle(true)}
                  disabled={quickEnabling}
                  className="flex items-center gap-2 rounded-xl bg-warning px-5 py-2.5 text-sm font-semibold text-white hover:bg-warning/90 disabled:opacity-50 transition shadow-sm"
                >
                  {quickEnabling ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  Enable Maintenance
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Status Toggle */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Maintenance Status</h3>
            <p className="text-sm text-muted">Toggle maintenance mode on or off</p>
          </div>
          <Toggle checked={enabled} onChange={setEnabled} activeColor="bg-warning" />
        </div>
      </Card>

      {/* Message Configuration */}
      <Card>
        <h3 className="font-semibold text-foreground mb-1">Maintenance Message</h3>
        <p className="text-sm text-muted mb-4">Customize the message users see during maintenance</p>

        {/* Presets */}
        <div className="mb-4">
          <p className="text-xs font-medium text-muted mb-2">Quick presets:</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_MESSAGES.map((preset, i) => (
              <button
                key={i}
                onClick={() => applyPreset(preset)}
                className="rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand-300 hover:bg-brand-500/8 transition"
              >
                {preset.title}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Maintenance in Progress"
              className="w-full rounded-xl border border-surface-border bg-background px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="We'll be back shortly. Thank you for your patience."
              rows={3}
              className="w-full rounded-xl border border-surface-border bg-background px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none sm:text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Timing */}
      <Card>
        <h3 className="font-semibold text-foreground mb-1">Estimated End Time</h3>
        <p className="text-sm text-muted mb-4">Show users when maintenance is expected to end (optional)</p>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-foreground mb-1.5">End time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-background px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEndTimePreset(30)}
              className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:border-brand-300 transition"
            >
              +30m
            </button>
            <button
              type="button"
              onClick={() => setEndTimePreset(60)}
              className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:border-brand-300 transition"
            >
              +1h
            </button>
            <button
              type="button"
              onClick={() => setEndTimePreset(120)}
              className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:border-brand-300 transition"
            >
              +2h
            </button>
            <button
              type="button"
              onClick={() => setEndTimePreset(240)}
              className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:border-brand-300 transition"
            >
              +4h
            </button>
            {endTime && (
              <button
                type="button"
                onClick={() => setEndTime("")}
                className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Admin Access */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Allow Admin Access</h3>
            <p className="text-sm text-muted">Admins can still access the site during maintenance</p>
          </div>
          <Toggle checked={allowAdmins} onChange={setAllowAdmins} />
        </div>
      </Card>

      {/* Preview */}
      <Card>
        <h3 className="font-semibold text-foreground mb-4">Preview</h3>
        <div className="rounded-2xl border border-surface-border bg-gradient-to-br from-surface to-surface/50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/20">
            <svg className="h-8 w-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {title || "Maintenance in Progress"}
          </h2>
          <p className="text-sm text-muted max-w-md mx-auto mb-4">
            {message || "We'll be back shortly. Thank you for your patience."}
          </p>
          {endTime && (
            <div className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm">
              <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span className="text-muted">Expected back:</span>
              <span className="font-medium text-foreground">
                {new Date(endTime).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Admin bypass info */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-200/60 bg-brand-50/60 px-4 py-3.5">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
        <div className="text-xs text-brand-700 dark:text-brand-400 space-y-1">
          <p className="font-semibold">Admin bypass is active</p>
          <p>You can still access the site while maintenance is on. To verify it&apos;s working, open the maintenance preview in an incognito / private window.</p>
        </div>
        <a
          href="/maintenance"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
        >
          Preview
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition"
        >
          {saving ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </>
          )}
        </button>
        <p className="text-xs text-muted">
          Changes take effect immediately when saved
        </p>
      </div>
    </div>
  );
}
