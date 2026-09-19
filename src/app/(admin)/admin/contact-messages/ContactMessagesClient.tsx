"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  ip: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface Props {
  messages: ContactMessage[];
}

export function ContactMessagesClient({ messages: initial }: Props) {
  const [messages, setMessages] = useState(initial);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Reply compose state
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const unreadCount = messages.filter((m) => !m.isRead).length;

  const filtered = messages.filter((m) => {
    if (filter === "unread" && m.isRead) return false;
    if (filter === "read" && !m.isRead) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function markRead(id: string) {
    startTransition(async () => {
      await fetch(`/api/admin/contact-messages/${id}/read`, { method: "PATCH" });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isRead: true, readAt: m.readAt ?? new Date().toISOString() } : m)),
      );
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, isRead: true } : null));
      }
    });
  }

  async function markAllRead() {
    startTransition(async () => {
      await fetch("/api/admin/contact-messages/read-all", { method: "PATCH" });
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true, readAt: m.readAt ?? new Date().toISOString() })));
    });
  }

  function openMessage(msg: ContactMessage) {
    setSelected(msg);
    setReplyOpen(false);
    setReplyBody("");
    setReplySuccess(false);
    setReplyError(null);
    if (!msg.isRead) markRead(msg.id);
  }

  function openReply() {
    setReplyOpen(true);
    setReplySuccess(false);
    setReplyError(null);
  }

  async function sendReply() {
    if (!selected || !replyBody.trim()) return;
    setReplySending(true);
    setReplyError(null);
    try {
      const res = await fetch(`/api/admin/contact-messages/${selected.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setReplySuccess(true);
      setReplyOpen(false);
      setReplyBody("");
      // Mark read in local state
      setMessages((prev) =>
        prev.map((m) => (m.id === selected.id ? { ...m, isRead: true } : m)),
      );
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setReplySending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem-3rem)] gap-0 overflow-hidden rounded-2xl border border-surface-border bg-background shadow-sm">
      {/* Left panel */}
      <div className="flex w-80 shrink-0 flex-col border-r border-surface-border">
        {/* Header */}
        <div className="border-b border-surface-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-base font-semibold text-foreground">
              Contact Inbox
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </h1>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={isPending}
                className="text-xs text-brand-500 hover:text-brand-400 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search messages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
          />

          {/* Filter tabs */}
          <div className="flex gap-1 rounded-lg bg-surface p-1">
            {(["all", "unread", "read"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 rounded-md py-1 text-xs font-medium capitalize transition",
                  filter === f ? "bg-brand-500 text-white" : "text-muted hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto divide-y divide-surface-border">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted">No messages</div>
          ) : (
            filtered.map((msg) => (
              <button
                key={msg.id}
                onClick={() => openMessage(msg)}
                className={cn(
                  "w-full p-4 text-left transition hover:bg-surface",
                  selected?.id === msg.id && "bg-brand-500/10",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {!msg.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    )}
                    <span className={cn("truncate text-sm", !msg.isRead ? "font-semibold text-foreground" : "text-muted")}>
                      {msg.name}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted">
                    {timeAgo(new Date(msg.createdAt))}
                  </span>
                </div>
                <p className={cn("mt-0.5 truncate text-xs", !msg.isRead ? "text-foreground" : "text-muted")}>
                  {msg.subject}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">{msg.message}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col min-w-0">
        {selected ? (
          <>
            {/* Thread header */}
            <div className="flex items-start justify-between border-b border-surface-border p-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selected.subject}</h2>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted">
                  <span className="font-medium text-foreground">{selected.name}</span>
                  <span className="text-brand-500">{selected.email}</span>
                  {selected.ip && <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-mono">{selected.ip}</span>}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {new Date(selected.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                {!selected.isRead && (
                  <button
                    onClick={() => markRead(selected.id)}
                    disabled={isPending}
                    className="rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background transition disabled:opacity-50"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={openReply}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition"
                >
                  Reply via email
                </button>
              </div>
            </div>

            {/* Message body + reply compose */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <div className="rounded-xl border border-surface-border bg-surface p-6">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{selected.message}</p>
              </div>

              {replySuccess && (
                <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Reply sent to {selected.email}
                </div>
              )}

              {replyOpen && (
                <div className="rounded-xl border border-surface-border bg-surface p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">
                      Reply to <span className="text-brand-500">{selected.email}</span>
                    </p>
                    <button
                      onClick={() => { setReplyOpen(false); setReplyError(null); }}
                      className="text-muted hover:text-foreground transition"
                      aria-label="Close reply"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Type your reply…"
                    rows={6}
                    className="w-full resize-none rounded-lg border border-surface-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                  />

                  {replyError && (
                    <p className="text-xs text-red-500">{replyError}</p>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setReplyOpen(false); setReplyError(null); }}
                      className="rounded-lg border border-surface-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={sendReply}
                      disabled={replySending || replyBody.trim().length < 10}
                      className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition"
                    >
                      {replySending ? "Sending…" : "Send Reply"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface">
                <svg className="h-6 w-6 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">Select a message</p>
              <p className="mt-1 text-xs text-muted">Choose a conversation from the list</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
