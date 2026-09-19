"use client";

import { useState } from "react";

export function AdminSendMessageButton({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to send message.");
        return;
      }
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setMessage("");
      }, 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand-300 hover:bg-brand-500/8 hover:text-brand-700"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Message user
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white dark:bg-surface shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
              <div>
                <h2 className="font-bold text-foreground">Send message</h2>
                <p className="text-xs text-muted">To: {userName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message to this user..."
                rows={5}
                className="w-full resize-none rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-base text-foreground placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:text-sm"
                disabled={loading || sent}
                autoFocus
              />
              <p className="mt-1 text-right text-[11px] text-muted">{message.length}/2000</p>

              {error && (
                <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-surface-border px-5 py-4">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={!message.trim() || loading || sent}
                className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {sent ? (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                    Sent!
                  </>
                ) : loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Send message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
