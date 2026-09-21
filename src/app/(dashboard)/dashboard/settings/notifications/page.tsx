"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";

interface Pref {
  type: string;
  email: boolean;
  inApp: boolean;
}

const NOTIFICATION_TYPES: { type: string; label: string; desc: string }[] = [
  { type: "MESSAGE",          label: "Messages",           desc: "New direct messages from other users" },
  { type: "OFFER",            label: "Offers",             desc: "New offers on your listings" },
  { type: "ESCROW",           label: "Escrow updates",     desc: "Status changes on active escrows" },
  { type: "LISTING_APPROVED", label: "Listing approved",   desc: "Your listing was approved by an admin" },
  { type: "LISTING_REJECTED", label: "Listing rejected",   desc: "Your listing was rejected by an admin" },
  { type: "PAYMENT",          label: "Payments",           desc: "Withdrawals, deposits, and balance changes" },
  { type: "DEPOSIT_CONFIRMED",label: "Deposits confirmed", desc: "Crypto deposit confirmed on-chain" },
  { type: "DISPUTE",          label: "Disputes",           desc: "Activity on disputes involving you" },
  { type: "SECURITY",         label: "Security alerts",    desc: "Login from new device or suspicious activity" },
  { type: "SYSTEM",           label: "System notices",     desc: "Platform announcements and maintenance" },
];

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setPushSupported(true);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushSubscribed(Boolean(sub)))
      .catch(() => {});
  }, []);

  async function togglePush() {
    setPushBusy(true);
    try {
      if (pushSubscribed) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setPushSubscribed(false);
        toast.success("Push notifications turned off");
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notification permission was denied");
          return;
        }
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) { toast.error("Push notifications aren't configured"); return; }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey });
        const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, keys }),
        });
        setPushSubscribed(true);
        toast.success("Push notifications enabled");
      }
    } catch {
      toast.error("Failed to update push notifications");
    } finally {
      setPushBusy(false);
    }
  }

  // Independent of the prefs state above (own endpoint, own save action) —
  // a single global flag rather than a per-type email/inApp pair.
  const [marketingOptOut, setMarketingOptOut] = useState(false);
  const [marketingSaving, setMarketingSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/marketing-emails")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setMarketingOptOut(d.optOut); })
      .catch(() => {});
  }, []);

  async function toggleMarketing() {
    const next = !marketingOptOut;
    setMarketingSaving(true);
    try {
      const res = await fetch("/api/settings/marketing-emails", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optOut: next }),
      });
      if (!res.ok) throw new Error();
      setMarketingOptOut(next);
      toast.success(next ? "You won't receive promotional emails anymore" : "Promotional emails re-enabled");
    } catch {
      toast.error("Failed to update preference");
    } finally {
      setMarketingSaving(false);
    }
  }

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => {
        const map = new Map<string, Pref>((d.prefs ?? []).map((p: Pref) => [p.type, p]));
        setPrefs(
          NOTIFICATION_TYPES.map((nt) =>
            map.get(nt.type) ?? { type: nt.type, email: true, inApp: true },
          ),
        );
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  function toggle(type: string, channel: "email" | "inApp") {
    setPrefs((prev) =>
      prev.map((p) => (p.type === type ? { ...p, [channel]: !p[channel] } : p)),
    );
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Notification preferences saved");
      setDirty(false);
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="py-10 text-center text-sm text-muted">Loading…</p>;
  if (loadError) return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
        Failed to load your notification preferences. Please refresh the page.
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Notifications</h1>

      <Card className="p-0 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_56px_56px] sm:grid-cols-[1fr_80px_80px] gap-2 border-b border-surface-border px-4 sm:px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
          <span>Event</span>
          <span className="text-center">Email</span>
          <span className="text-center"><span className="sm:hidden">App</span><span className="hidden sm:inline">In-app</span></span>
        </div>

        {NOTIFICATION_TYPES.map((nt) => {
          const pref = prefs.find((p) => p.type === nt.type);
          return (
            <div key={nt.type} className="grid grid-cols-[1fr_56px_56px] sm:grid-cols-[1fr_80px_80px] items-center gap-2 border-b border-surface-border last:border-0 px-4 sm:px-5 py-3.5">
              <div>
                <p className="text-sm font-medium">{nt.label}</p>
                <p className="text-xs text-muted">{nt.desc}</p>
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={pref?.email ?? true}
                  onChange={() => toggle(nt.type, "email")}
                />
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={pref?.inApp ?? true}
                  onChange={() => toggle(nt.type, "inApp")}
                />
              </div>
            </div>
          );
        })}
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} isLoading={saving} disabled={!dirty}>
          Save preferences
        </Button>
      </div>

      {pushSupported && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Push notifications</p>
              <p className="text-xs text-muted">
                Get notified in your browser even when AccsMarkets isn&apos;t open.
              </p>
            </div>
            <Toggle checked={pushSubscribed} onChange={togglePush} disabled={pushBusy} />
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Promotional emails</p>
            <p className="text-xs text-muted">
              Occasional tips and re-engagement emails (e.g. reminders about listings or offers).
              Separate from the account/security emails above, which always send.
            </p>
          </div>
          <Toggle
            checked={!marketingOptOut}
            onChange={toggleMarketing}
            disabled={marketingSaving}
          />
        </div>
      </Card>
    </div>
  );
}

