"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function CreateAnnouncementForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("INFO");
  const [audience, setAudience] = useState("ALL");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!message.trim()) { toast.error("Message required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          type,
          targetAudience: audience,
          linkUrl: linkUrl || null,
          linkText: linkText || null,
          isActive: true,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("Announcement created");
      setMessage(""); setLinkUrl(""); setLinkText(""); setOpen(false);
      router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  if (!open) return <Button onClick={() => setOpen(true)} className="self-start">New announcement</Button>;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">New announcement</h2>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base sm:text-sm">
            <option>INFO</option><option>WARNING</option><option>SUCCESS</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">Audience</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-base sm:text-sm">
            <option>ALL</option><option>BUYER</option><option>SELLER</option>
          </select>
        </div>
      </div>
      <Textarea label="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Announcement text…" />
      <Input label="Link URL (optional)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
      <Input label="Link text (optional)" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Learn more" />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" isLoading={loading} onClick={submit}>Publish</Button>
      </div>
    </Card>
  );
}
