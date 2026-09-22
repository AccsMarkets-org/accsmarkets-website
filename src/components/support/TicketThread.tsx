import Image from "next/image";
import { FileText, Lock, ShieldCheck } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { parseAttachments } from "./constants";

export interface ThreadMessage {
  id: string;
  body: string;
  isStaff: boolean;
  isInternal: boolean;
  attachments: unknown;
  createdAt: string | Date;
  author: { id: string; name: string | null; username: string | null; image: string | null };
}

interface Props {
  messages: ThreadMessage[];
  /** The viewer's user id — their own messages align right. */
  viewerId: string;
  /** Admin view: show staff names; user view: staff appear as "AccsMarkets Support". */
  staffView?: boolean;
}

function isImage(url: string): boolean {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
}

export function TicketThread({ messages, viewerId, staffView = false }: Props) {
  if (messages.length === 0) {
    return <p className="py-8 text-center text-sm italic text-muted">No messages yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {messages.map((m) => {
        const mine = m.author.id === viewerId;
        const attachments = parseAttachments(m.attachments);
        const displayName = m.isStaff && !staffView
          ? "AccsMarkets Support"
          : (m.author.username ?? m.author.name ?? "User");

        if (m.isInternal) {
          return (
            <li key={m.id} className="mx-2 flex flex-col gap-1 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                <Lock className="h-3 w-3" aria-hidden />
                Internal note · {m.author.username ?? m.author.name ?? "Staff"}
                <span className="ml-auto font-normal normal-case tracking-normal text-amber-700/70 dark:text-amber-400/70">{formatDate(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground">{m.body}</p>
              {attachments.length > 0 && <AttachmentList items={attachments} />}
            </li>
          );
        }

        return (
          <li key={m.id} className={cn("flex gap-3", mine ? "flex-row-reverse" : "flex-row")}>
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-border text-xs font-bold text-muted">
              {m.isStaff && !staffView ? (
                <ShieldCheck className="h-4 w-4 text-brand-500" aria-hidden />
              ) : m.author.image ? (
                <Image src={m.author.image} alt="" width={32} height={32} className="h-8 w-8 object-cover" unoptimized />
              ) : (
                displayName.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className={cn("flex max-w-[85%] flex-col gap-1", mine ? "items-end" : "items-start")}>
              <div className={cn("flex items-center gap-2 text-[11px] text-muted", mine && "flex-row-reverse")}>
                <span className={cn("font-semibold", m.isStaff ? "text-brand-600 dark:text-brand-400" : "text-foreground")}>{displayName}</span>
                {m.isStaff && <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-900/50 dark:text-brand-400">Staff</span>}
                <span>{formatDate(m.createdAt)}</span>
              </div>
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  mine
                    ? "rounded-tr-sm bg-brand-500 text-white"
                    : "rounded-tl-sm border border-surface-border bg-surface text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
              {attachments.length > 0 && <AttachmentList items={attachments} align={mine ? "end" : "start"} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function AttachmentList({ items, align = "start" }: { items: { url: string; name: string }[]; align?: "start" | "end" }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", align === "end" && "justify-end")}>
      {items.map((a, i) => (
        <li key={`${a.url}-${i}`}>
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-surface-border bg-background p-1.5 text-xs text-foreground transition hover:border-brand-300"
          >
            {isImage(a.url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt={a.name} className="h-12 w-12 rounded object-cover" loading="lazy" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded bg-surface text-muted"><FileText className="h-5 w-5" aria-hidden /></span>
            )}
            <span className="max-w-[140px] truncate pr-1">{a.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
