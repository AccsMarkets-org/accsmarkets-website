"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Shield, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AttachmentPicker } from "./AttachmentPicker";
import { TICKET_CATEGORIES, type TicketAttachment } from "./constants";
import type { SupportTicketCategory } from "@prisma/client";

interface LinkedEscrow { id: string; title: string; status: string }
interface LinkedListing { id: string; title: string; status: string }

interface Props {
  escrow?: LinkedEscrow | null;
  listing?: LinkedListing | null;
  defaultCategory?: SupportTicketCategory;
}

export function NewTicketForm({ escrow, listing, defaultCategory }: Props) {
  const router = useRouter();
  const [subject, setSubject] = useState(escrow ? `Help with escrow: ${escrow.title}` : listing ? `Help with listing: ${listing.title}` : "");
  const [category, setCategory] = useState<SupportTicketCategory>(defaultCategory ?? (escrow ? "ESCROW" : listing ? "LISTING" : "OTHER"));
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [linkEscrow, setLinkEscrow] = useState(!!escrow);
  const [linkListing, setLinkListing] = useState(!!listing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectOk = subject.trim().length >= 5;
  const messageOk = message.trim().length >= 20;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectOk || !messageOk) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          message: message.trim(),
          attachments,
          escrowId: linkEscrow && escrow ? escrow.id : null,
          listingId: linkListing && listing ? listing.id : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not open ticket");
      toast.success(`Ticket #${data.ticket.number} opened`);
      router.push(`/dashboard/support/${data.ticket.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {(escrow || listing) && (
        <div className="flex flex-col gap-2">
          {escrow && linkEscrow && (
            <LinkedChip
              icon={<Shield className="h-3.5 w-3.5" aria-hidden />}
              label="Escrow"
              title={escrow.title}
              href={`/dashboard/escrows/${escrow.id}`}
              onRemove={() => setLinkEscrow(false)}
            />
          )}
          {listing && linkListing && (
            <LinkedChip
              icon={<Tag className="h-3.5 w-3.5" aria-hidden />}
              label="Listing"
              title={listing.title}
              href={`/listings/${listing.id}`}
              onRemove={() => setLinkListing(false)}
            />
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Category</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {TICKET_CATEGORIES.map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500"
                    : "border-surface-border bg-background hover:border-brand-300"
                }`}
                aria-pressed={active}
              >
                <p className={`text-sm font-semibold ${active ? "text-brand-600 dark:text-brand-400" : "text-foreground"}`}>{c.label}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted">{c.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      <Input
        id="ticket-subject"
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Briefly, what do you need help with?"
        maxLength={150}
        required
        error={subject.length > 0 && !subjectOk ? "At least 5 characters" : undefined}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ticket-message" className="text-sm font-medium text-foreground">Describe the issue</label>
        <textarea
          id="ticket-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          maxLength={5000}
          required
          placeholder="Include what happened, when, and anything you've already tried. Never share passwords or 2FA codes."
          className="w-full resize-y rounded-xl border border-surface-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-sm"
        />
        <div className="flex justify-between text-[11px] text-muted">
          <span>{message.length > 0 && !messageOk ? "At least 20 characters" : ""}</span>
          <span>{message.length}/5000</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Attachments <span className="font-normal text-muted">(optional)</span></label>
        <AttachmentPicker value={attachments} onChange={setAttachments} disabled={submitting} />
      </div>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-surface-border pt-4">
        <Link href="/dashboard/support" className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition hover:text-foreground">
          Cancel
        </Link>
        <Button type="submit" isLoading={submitting} disabled={!subjectOk || !messageOk}>
          Open ticket
        </Button>
      </div>
    </form>
  );
}

function LinkedChip({ icon, label, title, href, onRemove }: { icon: React.ReactNode; label: string; title: string; href: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm dark:border-brand-900/50 dark:bg-brand-950/30">
      <span className="text-brand-600 dark:text-brand-400">{icon}</span>
      <span className="text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">{label}</span>
      <Link href={href} className="min-w-0 flex-1 truncate font-medium text-foreground hover:underline">{title}</Link>
      <button type="button" onClick={onRemove} className="rounded p-0.5 text-muted transition hover:text-danger" aria-label={`Unlink ${label.toLowerCase()}`}>
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
