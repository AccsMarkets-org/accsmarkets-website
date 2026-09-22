"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AttachmentPicker } from "./AttachmentPicker";
import type { TicketAttachment } from "./constants";

interface Props {
  ticketId: string;
  /** When true the ticket is RESOLVED and a reply will reopen it. */
  reopens?: boolean;
  disabled?: boolean;
}

export function TicketReplyBox({ ticketId, reopens, disabled }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && attachments.length === 0) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() || "(attachment)", attachments }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setBody("");
      setAttachments([]);
      toast.success(reopens ? "Ticket reopened" : "Reply sent");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-4">
      {reopens && (
        <p className="text-xs text-muted">This ticket is resolved. Sending a reply will reopen it for our team.</p>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply…"
        rows={4}
        disabled={disabled || sending}
        className="w-full resize-y rounded-xl border border-surface-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-sm"
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <AttachmentPicker value={attachments} onChange={setAttachments} disabled={disabled || sending} />
        <Button type="submit" size="sm" isLoading={sending} disabled={disabled || (!body.trim() && attachments.length === 0)}>
          <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {reopens ? "Reply & reopen" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
