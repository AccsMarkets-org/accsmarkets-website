"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { ConversationList } from "@/components/messages/ConversationList";

export default function AdminMessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasActiveThread = pathname !== "/admin/messages";
  const [search, setSearch] = useState("");

  return (
    <div
      // h-full instead of a hardcoded 100vh calc — the parent <main> already
      // resolves its own height correctly via flexbox, so this fills it exactly
      // regardless of header height or device safe-area insets.
      className="-m-4 md:-m-6 flex h-[calc(100%+2rem)] overflow-hidden border-t border-surface-border bg-background md:h-[calc(100%+3rem)]"
    >
      {/* ── LEFT: Conversation sidebar ───────────────────────────────────── */}
      <div
        className={`flex flex-col border-r border-surface-border bg-background ${
          hasActiveThread ? "hidden md:flex w-72 shrink-0" : "flex w-full md:w-72 md:shrink-0"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-surface-border px-4 shrink-0">
          <h1 className="text-base font-bold text-foreground">Messages</h1>
          <Link
            href="/admin"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface hover:text-foreground transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Admin
          </Link>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 shrink-0">
          <div className="flex h-9 items-center gap-2 rounded-full border border-surface-border bg-surface px-3.5 focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-400 transition">
            <svg className="h-3.5 w-3.5 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted sm:text-xs"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-muted hover:text-foreground transition">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={
            <div className="flex flex-col gap-1 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          }>
            <ConversationList basePath="/admin/messages" search={search} />
          </Suspense>
        </div>
      </div>

      {/* ── CENTER + RIGHT ────────────────────────────────────────────────── */}
      <div className={`flex min-w-0 flex-1 ${hasActiveThread ? "flex" : "hidden md:flex"}`}>
        {children}
      </div>
    </div>
  );
}
