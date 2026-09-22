"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  ArrowLeft, ExternalLink, Lock, MessageSquareText, Paperclip, RefreshCw, Search, Send, ShieldCheck, Tag, UserCheck, UserMinus, X,
} from "lucide-react";
import { cn, formatCurrency, formatDate, relativeTime } from "@/lib/utils";
import { getTrustTier } from "@/lib/constants";
import { TicketThread, type ThreadMessage } from "@/components/support/TicketThread";
import { AttachmentPicker } from "@/components/support/AttachmentPicker";
import {
  CATEGORY_LABEL, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_PRIORITY_STYLE, TICKET_STATUSES, TICKET_STATUS_STYLE,
  type TicketAttachment,
} from "@/components/support/constants";
import type { KycLevel, SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";

// ─── Types (mirror the JSON returned by /api/admin/support/tickets[/id]) ─────

interface ListTicket {
  id: string;
  number: number;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  escrowId: string | null;
  listingId: string | null;
  lastReplyAt: string;
  createdAt: string;
  assigneeId: string | null;
  user: { id: string; username: string | null; name: string | null; email: string | null; image: string | null };
  assignee: { id: string; username: string | null; name: string | null } | null;
  lastMessage: { isStaff: boolean; body: string; createdAt: string } | null;
}

interface DetailTicket extends Omit<ListTicket, "user" | "lastMessage"> {
  resolvedAt: string | null;
  user: ListTicket["user"] & { kycLevel: KycLevel; trustScore: number; isBanned: boolean; createdAt: string };
  userStats: { openEscrows: number; ticketCount: number };
  escrow: { id: string; status: string; amount: string; role: "buyer" | "seller"; listing: { title: string }; dispute: { id: string; status: string } | null } | null;
  listing: { id: string; title: string; status: string; platform: string } | null;
  messages: ThreadMessage[];
}

interface Props {
  meId: string;
  cannedResponses: { id: string; title: string; body: string }[];
  initialTicketId: string | null;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "OPEN", label: "Open" },
  { value: "AWAITING_STAFF", label: "Awaiting staff" },
  { value: "AWAITING_USER", label: "Awaiting user" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
  { value: "all", label: "All" },
];

const KYC_LABEL: Record<KycLevel, string> = { NONE: "No KYC", EMAIL: "Email", PHONE: "Phone", ID_VERIFIED: "ID verified" };

const selectClass =
  "rounded-lg border border-surface-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

export function SupportAdminClient({ meId, cannedResponses, initialTicketId }: Props) {
  // ── list state
  const [tickets, setTickets] = useState<ListTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Partial<Record<SupportTicketStatus, number>>>({});
  const [page, setPage] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [status, setStatus] = useState("active");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState<"all" | "me" | "unassigned">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── detail state
  const [selectedId, setSelectedId] = useState<string | null>(initialTicketId);
  const [detail, setDetail] = useState<DetailTicket | null>(null);
  const [acting, setActing] = useState(false);

  // ── reply state
  const [replyBody, setReplyBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadList = useCallback(async (nextPage: number, append: boolean) => {
    setListLoading(true);
    try {
      const params = new URLSearchParams({ status, assignee, page: String(nextPage) });
      if (category) params.set("category", category);
      if (priority) params.set("priority", priority);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/admin/support/tickets?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load tickets");
      setTickets((prev) => (append ? [...prev, ...data.tickets] : data.tickets));
      setTotal(data.total);
      setStatusCounts(data.statusCounts ?? {});
      setPage(nextPage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setListLoading(false);
    }
  }, [status, assignee, category, priority, debouncedSearch]);

  useEffect(() => { loadList(0, false); }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/support/tickets/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load ticket");
      setDetail(data.ticket);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load ticket");
      setSelectedId(null);
      setDetail(null);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setReplyBody("");
    setAttachments([]);
    setIsInternal(false);
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [detail?.messages.length]);

  /** Merge a freshly loaded detail back into the list row so the left pane stays in sync. */
  function syncListRow(t: DetailTicket) {
    setTickets((prev) => prev.map((row) => (row.id === t.id
      ? { ...row, status: t.status, priority: t.priority, assigneeId: t.assigneeId, assignee: t.assignee, lastReplyAt: t.lastReplyAt }
      : row)));
  }

  async function patchTicket(body: Record<string, unknown>, successMsg?: string) {
    if (!detail) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setDetail(data.ticket);
      syncListRow(data.ticket);
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActing(false);
    }
  }

  async function sendReply() {
    if (!detail || !replyBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${detail.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody.trim(), isInternal, attachments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setReplyBody("");
      setAttachments([]);
      toast.success(isInternal ? "Internal note added" : "Reply sent to user");
      setIsInternal(false);
      await loadDetail(detail.id);
      loadList(0, false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  function insertCanned(id: string) {
    const c = cannedResponses.find((r) => r.id === id);
    if (!c) return;
    setReplyBody((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${c.body}` : c.body));
  }

  const needsReply = (statusCounts.OPEN ?? 0) + (statusCounts.AWAITING_STAFF ?? 0);

  return (
    <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-top)-2rem)] md:h-[calc(100dvh-3.5rem-env(safe-area-inset-top)-3rem)] gap-0 overflow-hidden rounded-2xl border border-surface-border bg-background shadow-sm">
      {/* ── Left: list ─────────────────────────────────────────────────── */}
      <div className={cn("w-full md:w-[22rem] shrink-0 flex-col md:border-r border-surface-border", selectedId ? "hidden md:flex" : "flex")}>
        <div className="border-b border-surface-border p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-base font-semibold text-foreground">
              Support Tickets
              {needsReply > 0 && (
                <span className="ml-2 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{needsReply}</span>
              )}
            </h1>
            <button onClick={() => loadList(0, false)} disabled={listLoading} className="rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-50" aria-label="Refresh">
              <RefreshCw className={cn("h-3.5 w-3.5", listLoading && "animate-spin")} aria-hidden />
            </button>
          </div>

          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="text"
              placeholder="Search #number, subject, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface py-2 pl-8 pr-3 text-base text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass} aria-label="Status">
              {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass} aria-label="Category">
              <option value="">Any category</option>
              {TICKET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClass} aria-label="Priority">
              <option value="">Any priority</option>
              {TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{TICKET_PRIORITY_STYLE[p].label}</option>)}
            </select>
          </div>

          <div className="mt-2 flex gap-1 rounded-lg bg-surface p-1">
            {(["all", "me", "unassigned"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAssignee(a)}
                className={cn("flex-1 rounded-md py-1 text-xs font-medium capitalize transition", assignee === a ? "bg-brand-500 text-white" : "text-muted hover:text-foreground")}
              >
                {a === "me" ? "Mine" : a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-surface-border">
          {tickets.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted">{listLoading ? "Loading…" : "No tickets match"}</div>
          ) : (
            tickets.map((t) => {
              const st = TICKET_STATUS_STYLE[t.status];
              const needs = t.status === "OPEN" || t.status === "AWAITING_STAFF";
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn("w-full p-3.5 text-left transition hover:bg-surface", selectedId === t.id && "bg-brand-500/10")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {needs && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden />}
                      <span className="shrink-0 font-mono text-[11px] font-bold text-muted">#{t.number}</span>
                      <span className={cn("truncate text-sm", needs ? "font-semibold text-foreground" : "text-foreground")}>{t.subject}</span>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted">{relativeTime(t.lastReplyAt)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", st.className)}>{st.label}</span>
                    {t.priority !== "NORMAL" && (
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", TICKET_PRIORITY_STYLE[t.priority].className)}>{TICKET_PRIORITY_STYLE[t.priority].label}</span>
                    )}
                    <span className="text-[10px] text-muted">{CATEGORY_LABEL[t.category]}</span>
                    {t.assignee && <span className="ml-auto text-[10px] text-muted">→ {t.assigneeId === meId ? "me" : (t.assignee.username ?? t.assignee.name)}</span>}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">
                    <span className="font-medium text-foreground/80">{t.user.username ?? t.user.email}</span>
                    {t.lastMessage && <> · {t.lastMessage.isStaff ? "Staff: " : ""}{t.lastMessage.body}</>}
                  </p>
                </button>
              );
            })
          )}
          {tickets.length < total && (
            <div className="p-3">
              <button onClick={() => loadList(page + 1, true)} disabled={listLoading} className="w-full rounded-lg border border-surface-border bg-surface py-2 text-xs font-medium text-foreground transition hover:bg-background disabled:opacity-50">
                {listLoading ? "Loading…" : `Load more (${total - tickets.length} more)`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: detail ──────────────────────────────────────────────── */}
      <div className={cn("flex-1 flex-col min-w-0", selectedId ? "flex" : "hidden md:flex")}>
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface">
                <MessageSquareText className="h-6 w-6 text-muted" aria-hidden />
              </div>
              <p className="text-sm font-medium text-foreground">Select a ticket</p>
              <p className="mt-1 text-xs text-muted">Choose a conversation from the list</p>
            </div>
          </div>
        ) : !detail ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted">Loading ticket…</div>
        ) : (
          <>
            <div className="md:hidden border-b border-surface-border px-4 py-2">
              <button onClick={() => setSelectedId(null)} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Back
              </button>
            </div>

            {/* Header + controls */}
            <div className="border-b border-surface-border p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-muted">#{detail.number}</span>
                    <h2 className="text-lg font-semibold text-foreground">{detail.subject}</h2>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", TICKET_STATUS_STYLE[detail.status].className)}>{TICKET_STATUS_STYLE[detail.status].label}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", TICKET_PRIORITY_STYLE[detail.priority].className)}>{TICKET_PRIORITY_STYLE[detail.priority].label}</span>
                    <span className="rounded-md bg-surface px-1.5 py-0.5 font-medium">{CATEGORY_LABEL[detail.category]}</span>
                    <span>· Opened {formatDate(detail.createdAt)}</span>
                    {detail.assignee && <span>· Assigned to {detail.assigneeId === meId ? "you" : (detail.assignee.username ?? detail.assignee.name)}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={detail.priority}
                    onChange={(e) => patchTicket({ priority: e.target.value }, "Priority updated")}
                    disabled={acting}
                    className={selectClass}
                    aria-label="Priority"
                  >
                    {TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{TICKET_PRIORITY_STYLE[p].label}</option>)}
                  </select>
                  <select
                    value={detail.status}
                    onChange={(e) => patchTicket({ status: e.target.value }, "Status updated")}
                    disabled={acting}
                    className={selectClass}
                    aria-label="Status"
                  >
                    {TICKET_STATUSES.map((s) => <option key={s} value={s}>{TICKET_STATUS_STYLE[s].label}</option>)}
                  </select>
                  {detail.assigneeId === meId ? (
                    <button onClick={() => patchTicket({ assigneeId: null }, "Unassigned")} disabled={acting} className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-background disabled:opacity-50">
                      <UserMinus className="h-3.5 w-3.5" aria-hidden /> Unassign
                    </button>
                  ) : (
                    <button onClick={() => patchTicket({ assigneeId: "me" }, "Assigned to you")} disabled={acting} className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-background disabled:opacity-50">
                      <UserCheck className="h-3.5 w-3.5" aria-hidden /> Assign to me
                    </button>
                  )}
                  {detail.status !== "CLOSED" && (
                    <button onClick={() => patchTicket({ status: "CLOSED" }, "Ticket closed")} disabled={acting} className="inline-flex items-center gap-1 rounded-lg bg-danger/10 px-2.5 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/20 disabled:opacity-50">
                      <X className="h-3.5 w-3.5" aria-hidden /> Close
                    </button>
                  )}
                </div>
              </div>

              {/* User card + links */}
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface px-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-border text-xs font-bold text-muted">
                    {detail.user.image
                      ? <Image src={detail.user.image} alt="" width={36} height={36} className="h-9 w-9 object-cover" unoptimized />
                      : (detail.user.username ?? detail.user.email ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <Link href={`/admin/users/${detail.user.id}`} className="truncate text-sm font-semibold text-foreground hover:text-brand-500 hover:underline">
                        {detail.user.username ?? detail.user.name ?? "User"}
                      </Link>
                      <span className="truncate text-xs text-brand-500">{detail.user.email}</span>
                      {detail.user.isBanned && <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-danger">Banned</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" aria-hidden />{KYC_LABEL[detail.user.kycLevel]}</span>
                      <span>Trust <strong className={getTrustTier(detail.user.trustScore).className}>{detail.user.trustScore}</strong> · {getTrustTier(detail.user.trustScore).label}</span>
                      <span>{detail.userStats.openEscrows} open escrow{detail.userStats.openEscrows !== 1 ? "s" : ""}</span>
                      <span>{detail.userStats.ticketCount} ticket{detail.userStats.ticketCount !== 1 ? "s" : ""}</span>
                      <span>Joined {formatDate(detail.user.createdAt)}</span>
                    </div>
                  </div>
                  <Link href={`/admin/users/${detail.user.id}`} className="shrink-0 rounded-lg p-1.5 text-muted transition hover:bg-background hover:text-foreground" aria-label="Open user">
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </Link>
                </div>

                {(detail.escrow || detail.listing) && (
                  <div className="flex flex-col gap-1.5">
                    {detail.escrow && (
                      <Link href={`/admin/escrows/${detail.escrow.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand-300">
                        <ShieldCheck className="h-3.5 w-3.5 text-brand-500" aria-hidden />
                        <span className="max-w-[200px] truncate">Escrow · {detail.escrow.listing.title}</span>
                        <span className="text-muted">{formatCurrency(detail.escrow.amount)} · {detail.escrow.status} · {detail.escrow.role}</span>
                        {detail.escrow.dispute && <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-danger">Disputed</span>}
                      </Link>
                    )}
                    {detail.listing && (
                      <Link href={`/admin/listings/${detail.listing.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand-300">
                        <Tag className="h-3.5 w-3.5 text-brand-500" aria-hidden />
                        <span className="max-w-[200px] truncate">Listing · {detail.listing.title}</span>
                        <span className="text-muted">{detail.listing.status}</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <TicketThread messages={detail.messages} viewerId={meId} staffView />
              <div ref={threadEndRef} />
            </div>

            {/* Reply box */}
            <div className={cn("border-t border-surface-border p-3 sm:p-4", isInternal ? "bg-amber-50/60 dark:bg-amber-950/10" : "bg-surface/50")}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-foreground">
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="h-3.5 w-3.5 rounded border-surface-border accent-amber-500" />
                  <Lock className="h-3 w-3 text-amber-600" aria-hidden />
                  Internal note
                </label>
                {cannedResponses.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => { insertCanned(e.target.value); e.target.value = ""; }}
                    className={cn(selectClass, "ml-auto max-w-[220px]")}
                    aria-label="Insert canned response"
                  >
                    <option value="">Insert canned response…</option>
                    {cannedResponses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                )}
              </div>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={isInternal ? "Internal note — the user will never see this…" : "Reply to the user…"}
                rows={4}
                disabled={sending}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") sendReply(); }}
                className={cn(
                  "w-full resize-y rounded-lg border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-1 sm:text-sm",
                  isInternal ? "border-amber-300 focus:border-amber-500 focus:ring-amber-500" : "border-surface-border focus:border-brand-500 focus:ring-brand-500",
                )}
              />
              <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                <AttachmentPicker value={attachments} onChange={setAttachments} disabled={sending} />
                <div className="flex items-center gap-2">
                  {detail.status === "CLOSED" && !isInternal && <span className="text-[11px] text-muted">Replying will reopen this ticket</span>}
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyBody.trim()}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50",
                      isInternal ? "bg-amber-600 hover:bg-amber-700" : "bg-brand-500 hover:bg-brand-600",
                    )}
                  >
                    {isInternal ? <Lock className="h-3.5 w-3.5" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}
                    {sending ? "Sending…" : isInternal ? "Add note" : "Send reply"}
                  </button>
                </div>
              </div>
              {attachments.length === 0 && (
                <p className="mt-1 text-[10px] text-muted"><Paperclip className="mr-0.5 inline h-3 w-3" aria-hidden />Ctrl/⌘+Enter to send</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
