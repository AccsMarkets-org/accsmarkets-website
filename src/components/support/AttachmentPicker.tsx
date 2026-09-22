"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Paperclip, X, Loader2 } from "lucide-react";
import { MAX_TICKET_ATTACHMENTS, type TicketAttachment } from "./constants";

interface Props {
  value: TicketAttachment[];
  onChange: (next: TicketAttachment[]) => void;
  max?: number;
  disabled?: boolean;
}

/** Uploads via the existing message-upload endpoint (JPG/PNG/GIF/WEBP/PDF, 10 MB). */
export function AttachmentPicker({ value, onChange, max = MAX_TICKET_ATTACHMENTS, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const full = value.length >= max;

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const room = max - value.length;
    if (room <= 0) return;
    setUploading(true);
    const added: TicketAttachment[] = [];
    try {
      for (const file of files.slice(0, room)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/message", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        added.push({ url: data.url, name: data.name ?? file.name });
      }
      onChange([...value, ...added]);
    } catch (err) {
      if (added.length > 0) onChange([...value, ...added]);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((a, i) => (
            <li key={`${a.url}-${i}`} className="flex max-w-full items-center gap-1.5 rounded-lg border border-surface-border bg-surface px-2.5 py-1 text-xs text-foreground">
              <Paperclip className="h-3 w-3 shrink-0 text-muted" aria-hidden />
              <span className="truncate">{a.name}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="ml-0.5 rounded p-0.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                aria-label={`Remove ${a.name}`}
                disabled={disabled}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          className="hidden"
          onChange={handleFiles}
          disabled={disabled || uploading || full}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading || full}
          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand-300 hover:bg-brand-500/8 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Paperclip className="h-3.5 w-3.5" aria-hidden />}
          {uploading ? "Uploading…" : "Attach file"}
        </button>
        <span className="text-[11px] text-muted">
          {value.length}/{max} · JPG, PNG, GIF, WEBP or PDF up to 10 MB
        </span>
      </div>
    </div>
  );
}
