"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Template {
  id: string;
  slug: string;
  subject: string;
  html: string;
  updatedAt: Date | string;
}

interface Props {
  initialTemplates: Template[];
}

const DEFAULT_SLUGS = [
  "welcome",
  "deposit_confirmed",
  "escrow_created",
  "escrow_completed",
  "listing_approved",
  "listing_rejected",
  "kyc_approved",
  "kyc_rejected",
  "subscription_activated",
  "new_message",
  "password_changed",
  "password_reset",
  "dispute_outcome",
];

export function EmailTemplateEditor({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [activeSlug, setActiveSlug] = useState<string>(templates[0]?.slug ?? DEFAULT_SLUGS[0]);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const allSlugs = Array.from(new Set([...DEFAULT_SLUGS, ...templates.map((t) => t.slug)]));

  function selectSlug(slug: string) {
    setActiveSlug(slug);
    const t = templates.find((x) => x.slug === slug);
    setSubject(t?.subject ?? "");
    setHtml(t?.html ?? "");
    setPreview(false);
  }

  async function save() {
    if (!subject.trim() || !html.trim()) { toast.error("Subject and HTML required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeSlug, subject, html }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setTemplates((prev) => {
        const idx = prev.findIndex((t) => t.slug === activeSlug);
        if (idx >= 0) { const next = [...prev]; next[idx] = data.template; return next; }
        return [...prev, data.template];
      });
      toast.success("Saved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex gap-4">
      {/* Slug list */}
      <div className="w-48 shrink-0 flex flex-col gap-1">
        {allSlugs.map((slug) => (
          <button key={slug}
            onClick={() => selectSlug(slug)}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              activeSlug === slug ? "bg-brand-500 text-white" : "text-muted hover:bg-surface-border"
            }`}
          >
            {slug}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col gap-3">
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject…" />
        <div className="flex gap-2 items-center">
          <button onClick={() => setPreview(false)} className={`text-sm font-medium ${!preview ? "text-brand-600 underline" : "text-muted"}`}>Edit</button>
          <button onClick={() => setPreview(true)} className={`text-sm font-medium ${preview ? "text-brand-600 underline" : "text-muted"}`}>Preview</button>
        </div>
        {preview ? (
          <div className="min-h-64 rounded-xl border border-surface-border bg-white dark:bg-surface p-4">
            <iframe
              srcDoc={html}
              title="Email preview"
              className="w-full min-h-64 border-0"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <Textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={18}
            placeholder="<html>…</html>"
            className="font-mono text-xs"
          />
        )}
        <div className="flex gap-2 items-center flex-wrap">
          <Button size="sm" isLoading={loading} onClick={save}>Save template</Button>
          <Input
            placeholder="test@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="w-48"
          />
          <Button size="sm" variant="outline" onClick={async () => {
            if (!testEmail) { toast.error("Enter a recipient email address"); return; }
            if (!subject.trim() || !html.trim()) { toast.error("Save the template first"); return; }
            setLoading(true);
            try {
              const res = await fetch("/api/admin/email-templates/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: testEmail, subject, html }),
              });
              if (!res.ok) throw new Error((await res.json()).error ?? "Send failed");
              toast.success(`Test email sent to ${testEmail}`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Send failed");
            } finally { setLoading(false); }
          }}>
            Send test
          </Button>
        </div>
      </div>
    </div>
  );
}
