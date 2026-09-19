"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useSocket } from "@/hooks/useSocket";
import { relativeTime, cn } from "@/lib/utils";
import type { VerifiedBadge as VerifiedBadgeEnum } from "@prisma/client";

interface ActiveEscrow {
  id: string;
  status: string;
  listing: { title: string };
}

interface Conversation {
  partner: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verifiedBadge?: VerifiedBadgeEnum;
  };
  lastMessage: { content: string; createdAt: string; fromMe: boolean };
  unreadCount: number;
  activeEscrow: ActiveEscrow | null;
  isPinned?: boolean;
}

const ESCROW_PILL: Record<string, { label: string; cls: string }> = {
  FUNDED:                { label: "Funded",       cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
  AWAITING_MANAGER_ADD:  { label: "Manager Add",  cls: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400" },
  PENDING_VERIFICATION:  { label: "Verification", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400" },
  SUBMITTED:             { label: "Review",        cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" },
  VERIFIED:              { label: "Verified",      cls: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400" },
  IN_TRANSFER:           { label: "Transferring",  cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
  DISPUTED:              { label: "Dispute",        cls: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" },
};

type Tab = "inbox" | "archived";

export function ConversationList({ basePath = "/dashboard/messages", search = "" }: { basePath?: string; search?: string }) {
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>("inbox");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState<string | null>(null);
  const socket = useSocket();

  async function load(t: Tab = tab, silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/messages?tab=${t}`);
      const data = await res.json();
      const convs: Conversation[] = data.conversations ?? [];
      setConversations([...convs].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
    } catch {
      if (!silent) toast.error("Failed to load conversations");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { load(tab, false); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket-based real-time updates — silent so the list doesn't blink
  useEffect(() => {
    if (!socket) return;
    const refresh = () => load(tab, true);
    socket.on("new_message", refresh);
    return () => { socket.off("new_message", refresh); };
  }, [socket, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling fallback — silent to avoid skeleton flash every 8s
  useEffect(() => {
    const interval = setInterval(() => load(tab, true), 8000);
    const onVisible = () => { if (document.visibilityState === "visible") load(tab, true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function archive(partnerId: string) {
    setArchiving(partnerId);
    try {
      await fetch("/api/messages/archive", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId }),
      });
      setConversations((prev) => prev.filter((c) => c.partner.id !== partnerId));
      toast.success("Conversation archived");
    } catch {
      toast.error("Failed to archive");
    } finally {
      setArchiving(null);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-surface-border">
        {(["inbox", "archived"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest transition",
              tab === t
                ? "border-b-2 border-brand-500 text-brand-600"
                : "text-muted hover:text-foreground",
            )}
          >
            {t === "inbox" ? "Direct Messages" : "Archive Messages"}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-1 p-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && conversations.length === 0 && (
        <div className="py-12 text-center px-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-xl">
            💬
          </div>
          <p className="text-sm font-medium text-foreground">
            {tab === "inbox" ? "No conversations yet" : "No archived conversations"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {tab === "inbox" ? "Messages will appear here" : ""}
          </p>
        </div>
      )}

      {/* Conversation rows */}
      {!loading && conversations.filter((conv) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const name = (conv.isPinned ? "Escrow Support" : (conv.partner.username ?? conv.partner.name ?? "")).toLowerCase();
        const msg = (conv.lastMessage.content ?? "").toLowerCase();
        return name.includes(q) || msg.includes(q);
      }).map((conv) => {
        const pill = conv.activeEscrow ? ESCROW_PILL[conv.activeEscrow.status] : null;
        const displayName = conv.isPinned
          ? "Escrow Support"
          : (conv.partner.username ?? conv.partner.name ?? "Unknown");
        const isActive = pathname === `${basePath}/${conv.partner.id}`;

        return (
          <div
            key={conv.partner.id}
            className={cn(
              "group relative flex items-center gap-3 px-4 py-3 transition-colors border-l-[3px]",
              isActive
                ? "bg-brand-500/10 border-brand-500"
                : "border-transparent hover:bg-surface/60",
            )}
          >
            <Link
              href={`${basePath}/${conv.partner.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                {conv.isPinned ? (
                  <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-brand-600 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="Escrow Support" className="h-full w-full object-cover" />
                  </span>
                ) : conv.partner.image ? (
                  <img
                    src={conv.partner.image}
                    alt={displayName}
                    className="h-11 w-11 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white shadow-sm"
                  >
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                {conv.isPinned && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-success" />
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className={cn(
                    "truncate text-sm font-semibold",
                    isActive ? "text-brand-500" : "text-foreground",
                  )}>
                    {displayName}
                  </span>
                  {conv.partner.verifiedBadge && conv.partner.verifiedBadge !== "NONE" && (
                    <VerifiedBadge badge={conv.partner.verifiedBadge} size={11} />
                  )}
                  {conv.isPinned && (
                    <span className="shrink-0 rounded-sm bg-brand-100 dark:bg-brand-900/50 px-1 text-[9px] font-black uppercase tracking-wider text-brand-600">
                      Official
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {pill && (
                    <span className={cn("shrink-0 rounded-sm px-1.5 text-[9px] font-bold uppercase", pill.cls)}>
                      {pill.label}
                    </span>
                  )}
                  <p className={cn(
                    "truncate text-xs",
                    conv.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted",
                  )}>
                    {conv.lastMessage.fromMe && (
                      <span className="mr-0.5 text-muted">You: </span>
                    )}
                    {conv.lastMessage.content}
                  </p>
                </div>
              </div>
            </Link>

            {/* Right side */}
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-[10px] text-muted whitespace-nowrap">
                {relativeTime(conv.lastMessage.createdAt)}
              </span>
              <div className="flex items-center gap-1">
                {conv.unreadCount > 0 && (
                  <span className="flex h-4.5 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-black text-white">
                    {conv.unreadCount}
                  </span>
                )}
                {tab === "inbox" && (
                  <button
                    type="button"
                    title="Archive"
                    onClick={(e) => { e.preventDefault(); archive(conv.partner.id); }}
                    disabled={archiving === conv.partner.id}
                    className="hidden h-5 w-5 items-center justify-center rounded text-[11px] text-muted hover:text-foreground group-hover:flex transition"
                  >
                    ↓
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
