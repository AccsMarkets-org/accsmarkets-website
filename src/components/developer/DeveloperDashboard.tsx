"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string;
  enabled: boolean;
  createdAt: string;
  _count: { deliveries: number };
}

interface AppListing {
  id: string;
  name: string;
  description: string;
  status: string;
  iconUrl: string | null;
  websiteUrl: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

const ALL_EVENTS = [
  "ESCROW_CREATED", "ESCROW_FUNDED", "ESCROW_COMPLETED", "ESCROW_DISPUTED",
  "OFFER_RECEIVED", "OFFER_ACCEPTED", "LISTING_SOLD", "PAYMENT_RECEIVED",
];

export function DeveloperDashboard({
  initialKeys,
  initialWebhooks,
}: {
  initialKeys: ApiKey[];
  initialWebhooks: WebhookEndpoint[];
}) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(initialWebhooks);
  const [apps, setApps] = useState<AppListing[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  // App creation form
  const [appName, setAppName] = useState("");
  const [appDesc, setAppDesc] = useState("");
  const [appWebsite, setAppWebsite] = useState("");
  const [appLoading, setAppLoading] = useState(false);

  useEffect(() => {
    fetch("/api/apps?mine=true")
      .then((r) => r.json())
      .then((d) => setApps(d.apps ?? []))
      .catch(() => {});
  }, []);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/developer/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim(), scopes: ["read"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreatedKey(data.key);
      setNewKeyName("");
      // Refresh list
      const listRes = await fetch("/api/developer/api-keys");
      const listData = await listRes.json();
      setKeys(listData.keys ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey(id: string) {
    if (revokingId) return;
    setRevokingId(id);
    try {
      const res = await fetch(`/api/developer/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys((k) => k.filter((x) => x.id !== id));
        toast.success("API key revoked");
      } else {
        toast.error("Failed to revoke key");
      }
    } finally {
      setRevokingId(null);
    }
  }

  async function createWebhook() {
    if (!newWebhookUrl || selectedEvents.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/developer/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newWebhookUrl, events: selectedEvents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWebhookSecret(data.secret ?? null);
      setNewWebhookUrl("");
      setSelectedEvents([]);
      const listRes = await fetch("/api/developer/webhooks");
      const listData = await listRes.json();
      setWebhooks(listData.endpoints ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create webhook");
    } finally {
      setLoading(false);
    }
  }

  async function toggleWebhook(id: string, enabled: boolean) {
    const res = await fetch(`/api/developer/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    if (res.ok) {
      setWebhooks((wh) => wh.map((w) => (w.id === id ? { ...w, enabled: !enabled } : w)));
    } else {
      toast.error("Failed to update webhook");
    }
  }

  async function deleteWebhook(id: string) {
    const res = await fetch(`/api/developer/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWebhooks((wh) => wh.filter((w) => w.id !== id));
      toast.success("Webhook deleted");
    } else {
      toast.error("Failed to delete webhook");
    }
  }

  function toggleEvent(ev: string) {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* API Keys */}
      <Card>
        <h2 className="mb-3 font-semibold">API Keys</h2>

        {createdKey && (
          <div className="mb-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
            <p className="mb-1 text-xs font-semibold text-green-800 dark:text-green-300">
              Copy your key now — it will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-green-100 dark:bg-green-900/40 px-2 py-1 text-xs font-mono text-green-900 dark:text-green-300">
                {createdKey}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdKey);
                  toast.success("Copied!");
                }}
                className="shrink-0 rounded-lg bg-green-700 px-3 py-1 text-xs text-white hover:bg-green-800"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="mt-2 text-xs text-green-700 dark:text-green-400 underline"
            >
              I&apos;ve saved it
            </button>
          </div>
        )}

        <div className="mb-4 flex gap-2">
          <input
            placeholder="Key name (e.g. My Integration)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 rounded-xl border border-surface-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={createKey}
            disabled={loading || !newKeyName.trim()}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>

        {keys.length === 0 ? (
          <p className="text-sm text-muted">No active API keys.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-xl border border-surface-border px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{k.name}</p>
                  <p className="text-xs text-muted font-mono">{k.keyPrefix}…</p>
                  <p className="text-xs text-muted">
                    Created {formatDate(new Date(k.createdAt))}
                    {k.lastUsedAt && ` · Last used ${formatDate(new Date(k.lastUsedAt))}`}
                    {k.expiresAt && ` · Expires ${formatDate(new Date(k.expiresAt))}`}
                  </p>
                </div>
                <button
                  onClick={() => revokeKey(k.id)}
                  disabled={revokingId !== null}
                  className="text-xs text-danger hover:underline disabled:opacity-40"
                >
                  {revokingId === k.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Webhook secret banner (persistent until dismissed) */}
      {webhookSecret && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
          <p className="mb-1 text-xs font-semibold text-blue-800 dark:text-blue-300">
            Copy your webhook secret now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-blue-100 dark:bg-blue-900/40 px-2 py-1 text-xs font-mono text-blue-900 dark:text-blue-300">
              {webhookSecret}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(webhookSecret);
                toast.success("Copied!");
              }}
              className="shrink-0 rounded-lg bg-blue-700 px-3 py-1 text-xs text-white hover:bg-blue-800"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setWebhookSecret(null)}
            className="mt-2 text-xs text-blue-700 dark:text-blue-400 underline"
          >
            I&apos;ve saved it
          </button>
        </div>
      )}

      {/* Webhooks */}
      <Card>
        <h2 className="mb-3 font-semibold">Webhook Endpoints</h2>

        <div className="mb-4 flex flex-col gap-3">
          <input
            placeholder="https://example.com/webhook"
            value={newWebhookUrl}
            onChange={(e) => setNewWebhookUrl(e.target.value)}
            className="rounded-xl border border-surface-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {ALL_EVENTS.map((ev) => (
              <label key={ev} className="flex cursor-pointer items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(ev)}
                  onChange={() => toggleEvent(ev)}
                  className="accent-brand-600"
                />
                {ev.replace(/_/g, " ")}
              </label>
            ))}
          </div>
          <button
            onClick={createWebhook}
            disabled={loading || !newWebhookUrl || selectedEvents.length === 0}
            className="self-start rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Add endpoint
          </button>
        </div>

        {webhooks.length === 0 ? (
          <p className="text-sm text-muted">No webhook endpoints yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {webhooks.map((w) => (
              <div
                key={w.id}
                className="flex items-start justify-between rounded-xl border border-surface-border px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-foreground">{w.url}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Events: {w.events.replace(/,/g, ", ")} · {w._count.deliveries} deliveries
                  </p>
                  <p className="text-xs text-muted">Added {formatDate(new Date(w.createdAt))}</p>
                </div>
                <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                  <button
                    onClick={() => toggleWebhook(w.id, w.enabled)}
                    className={`text-xs ${w.enabled ? "text-muted hover:text-danger" : "text-brand-600 hover:underline"}`}
                  >
                    {w.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => deleteWebhook(w.id)}
                    className="text-xs text-danger hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {/* App Directory */}
      <Card>
        <h2 className="mb-3 font-semibold">My Apps</h2>

        {/* Create app form */}
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-4">
          <p className="text-sm font-medium">Register a new app</p>
          <input
            placeholder="App name"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="rounded-xl border border-surface-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <textarea
            placeholder="Description (min 10 chars)"
            rows={3}
            value={appDesc}
            onChange={(e) => setAppDesc(e.target.value)}
            className="rounded-xl border border-surface-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            placeholder="Website URL (optional)"
            value={appWebsite}
            onChange={(e) => setAppWebsite(e.target.value)}
            className="rounded-xl border border-surface-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            disabled={appLoading || appName.trim().length < 2 || appDesc.trim().length < 10}
            onClick={async () => {
              setAppLoading(true);
              try {
                const res = await fetch("/api/apps", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: appName.trim(),
                    description: appDesc.trim(),
                    websiteUrl: appWebsite.trim() || undefined,
                    apiScopesRequested: ["listings:read"],
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setApps((a) => [data.app, ...a]);
                setAppName("");
                setAppDesc("");
                setAppWebsite("");
                toast.success("App created as draft");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to create app");
              } finally {
                setAppLoading(false);
              }
            }}
            className="self-start rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {appLoading ? "Creating…" : "Create app"}
          </button>
        </div>

        {apps.length === 0 ? (
          <p className="text-sm text-muted">No apps registered yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {apps.map((app) => (
              <div
                key={app.id}
                className="flex items-start justify-between rounded-xl border border-surface-border px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{app.name}</p>
                  <p className="truncate text-xs text-muted">{app.description}</p>
                  {app.rejectionReason && (
                    <p className="mt-0.5 text-xs text-danger">Rejected: {app.rejectionReason}</p>
                  )}
                  <p className="text-xs text-muted">Created {formatDate(new Date(app.createdAt))}</p>
                </div>
                <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    app.status === "APPROVED" ? "bg-success/10 text-success"
                    : app.status === "SUBMITTED" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    : app.status === "REJECTED" ? "bg-danger/10 text-danger"
                    : "bg-muted/10 text-muted"
                  }`}>
                    {app.status}
                  </span>
                  {(app.status === "DRAFT" || app.status === "REJECTED") && (
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/apps/${app.id}`, { method: "POST" });
                        const data = await res.json();
                        if (res.ok) {
                          setApps((a) => a.map((x) => x.id === app.id ? { ...x, status: "SUBMITTED" } : x));
                          toast.success("App submitted for review");
                        } else {
                          toast.error(data.error ?? "Failed to submit");
                        }
                      }}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Submit for review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
