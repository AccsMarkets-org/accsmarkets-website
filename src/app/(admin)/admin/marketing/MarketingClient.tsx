"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface StatusResponse {
  configured: boolean;
  eligibleCount: number;
}

interface SendResult {
  ok: boolean;
  sent: number;
  failed: number;
  errors: { userId: string; error: string }[];
}

function useCampaignStatus(endpoint: string) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      if (res.ok) setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  return { status, loading, reload: load };
}

function WhatsAppTab() {
  const { status, loading: loadingStatus } = useCampaignStatus("/api/admin/marketing/whatsapp");
  const [templateName, setTemplateName] = useState("");
  const [languageCode, setLanguageCode] = useState("en_US");
  const [bodyParamsRaw, setBodyParamsRaw] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState<SendResult | null>(null);

  async function send() {
    if (!status) return;
    setSending(true);
    setLastResult(null);
    try {
      const bodyParams = bodyParamsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
      const res = await fetch("/api/admin/marketing/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateName, languageCode, bodyParams, confirmCount: status.eligibleCount }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Send failed"); return; }
      setLastResult(data);
      toast.success(`Sent to ${data.sent} recipient${data.sent === 1 ? "" : "s"}${data.failed ? `, ${data.failed} failed` : ""}`);
    } catch {
      toast.error("Send failed");
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-base font-semibold text-foreground">WhatsApp campaigns</h2>
      <p className="mb-4 text-sm text-muted">
        Sends via the official WhatsApp Business Cloud API (Meta) to opted-in users with a verified phone
        number. Marketing sends require a pre-approved message template from Meta Business Manager —
        freeform text isn&apos;t supported for business-initiated messages.
      </p>

      {loadingStatus ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : !status?.configured ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          Not configured. Set <code className="font-mono">WHATSAPP_ACCESS_TOKEN</code> and{" "}
          <code className="font-mono">WHATSAPP_PHONE_NUMBER_ID</code> (from Meta Business Manager) to enable sending.
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm">
          <span className="font-semibold text-foreground">{status.eligibleCount}</span>{" "}
          <span className="text-muted">eligible recipient{status.eligibleCount === 1 ? "" : "s"} (opted in, verified phone, not banned)</span>
        </div>
      )}

      {status?.configured && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Approved template name</label>
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. weekly_deals_promo" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Template language code</label>
            <Input value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} placeholder="en_US" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Body variables (one per line, in template order — use <code className="font-mono">{"{{name}}"}</code> for the recipient&apos;s name)
            </label>
            <textarea
              value={bodyParamsRaw}
              onChange={(e) => setBodyParamsRaw(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500"
              placeholder={"{{name}}\n20% off this week"}
            />
          </div>

          {!confirming ? (
            <Button type="button" disabled={!templateName || status.eligibleCount === 0} onClick={() => setConfirming(true)} className="self-start">
              Review &amp; send
            </Button>
          ) : (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
              <p className="mb-3 text-sm font-medium text-foreground">
                Send &quot;{templateName}&quot; to {status.eligibleCount} recipient{status.eligibleCount === 1 ? "" : "s"} now?
              </p>
              <div className="flex gap-2">
                <Button type="button" onClick={send} disabled={sending}>{sending ? "Sending..." : "Confirm send"}</Button>
                <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={sending}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {lastResult && (
        <div className="mt-4 rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm">
          <p className="font-medium text-foreground">{lastResult.sent} sent, {lastResult.failed} failed</p>
          {lastResult.errors.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-muted">
              {lastResult.errors.map((e, i) => <li key={i}>{e.userId}: {e.error}</li>)}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function EmailTab() {
  const { status, loading: loadingStatus } = useCampaignStatus("/api/admin/marketing/email");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState<SendResult | null>(null);

  async function send() {
    if (!status) return;
    setSending(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/marketing/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, htmlContent, confirmCount: status.eligibleCount }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Send failed"); return; }
      setLastResult(data);
      toast.success(`Sent to ${data.sent} recipient${data.sent === 1 ? "" : "s"}${data.failed ? `, ${data.failed} failed` : ""}`);
    } catch {
      toast.error("Send failed");
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-base font-semibold text-foreground">Email campaigns</h2>
      <p className="mb-4 text-sm text-muted">
        Sends via Brevo to opted-in users. Unlike WhatsApp, no template pre-approval is required — write
        your subject and HTML content directly below.
      </p>

      {loadingStatus ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : !status?.configured ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          Not configured. Set <code className="font-mono">BREVO_API_KEY</code> (from app.brevo.com/settings/keys/api) to enable sending.
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm">
          <span className="font-semibold text-foreground">{status.eligibleCount}</span>{" "}
          <span className="text-muted">eligible recipient{status.eligibleCount === 1 ? "" : "s"} (opted in, not banned)</span>
        </div>
      )}

      {status?.configured && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. 20% off all listings this week" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              HTML content — use <code className="font-mono">{"{{name}}"}</code> for the recipient&apos;s name
            </label>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-surface-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-brand-500"
              placeholder={"<p>Hi {{name}},</p><p>Check out this week's deals...</p>"}
            />
          </div>

          {!confirming ? (
            <Button type="button" disabled={!subject || !htmlContent || status.eligibleCount === 0} onClick={() => setConfirming(true)} className="self-start">
              Review &amp; send
            </Button>
          ) : (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
              <p className="mb-3 text-sm font-medium text-foreground">
                Send &quot;{subject}&quot; to {status.eligibleCount} recipient{status.eligibleCount === 1 ? "" : "s"} now?
              </p>
              <div className="flex gap-2">
                <Button type="button" onClick={send} disabled={sending}>{sending ? "Sending..." : "Confirm send"}</Button>
                <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={sending}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {lastResult && (
        <div className="mt-4 rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm">
          <p className="font-medium text-foreground">{lastResult.sent} sent, {lastResult.failed} failed</p>
          {lastResult.errors.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-muted">
              {lastResult.errors.map((e, i) => <li key={i}>{e.userId}: {e.error}</li>)}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

export function MarketingClient() {
  const [tab, setTab] = useState<"whatsapp" | "email">("whatsapp");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 rounded-xl border border-surface-border bg-surface p-1 self-start">
        {(["whatsapp", "email"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition",
              tab === t ? "bg-brand-500 text-white" : "text-muted hover:text-foreground",
            )}
          >
            {t === "whatsapp" ? "WhatsApp" : "Email"}
          </button>
        ))}
      </div>

      {tab === "whatsapp" ? <WhatsAppTab /> : <EmailTab />}
    </div>
  );
}
