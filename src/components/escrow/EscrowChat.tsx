"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { useSocket } from "@/hooks/useSocket";
import { cn, relativeTime } from "@/lib/utils";

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  isPinned?: boolean;
  pinnedAt?: string | null;
  sender: { id: string; username: string | null; name: string | null; role: string };
}

export function EscrowChat({ escrowId }: { escrowId: string }) {
  const { data: session } = useSession();
  const socket = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinned, setPinned] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pinning, setPinning] = useState<string | null>(null);
  const [showPinned, setShowPinned] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    fetch(`/api/escrows/${escrowId}/messages`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages ?? []);
        setPinned(data.pinned ?? []);
      })
      .catch(() => toast.error("Failed to load messages"));
  }, [escrowId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join_escrow", escrowId);

    function onMessage({ message }: { message: ChatMessage }) {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    }
    function onPinned({ message }: { message: ChatMessage }) {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
      setPinned((prev) => {
        const without = prev.filter((m) => m.id !== message.id);
        return message.isPinned ? [...without, message] : without;
      });
    }

    socket.on("new_escrow_message", onMessage);
    socket.on("message_pinned", onPinned);
    return () => {
      socket.off("new_escrow_message", onMessage);
      socket.off("message_pinned", onPinned);
    };
  }, [socket, escrowId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/escrows/${escrowId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      setInput("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  async function togglePin(messageId: string) {
    setPinning(messageId);
    try {
      const res = await fetch(`/api/escrows/${escrowId}/messages/${messageId}/pin`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const updated = data.message as ChatMessage;
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setPinned((prev) => {
        const without = prev.filter((m) => m.id !== updated.id);
        return updated.isPinned ? [...without, updated] : without;
      });
      toast.success(updated.isPinned ? "Message pinned" : "Message unpinned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pin");
    } finally {
      setPinning(null);
    }
  }

  const myId = session?.user?.id;

  return (
    <div className="flex flex-col rounded-2xl border border-surface-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-2.5">
        <span className="text-sm font-semibold">Escrow chat</span>
        {pinned.length > 0 && (
          <button
            onClick={() => setShowPinned((s) => !s)}
            className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 transition dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/></svg>
            {pinned.length} pinned
          </button>
        )}
      </div>

      {/* Pinned messages bar */}
      {showPinned && pinned.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50/60 px-4 py-2 space-y-1.5 dark:border-amber-800 dark:bg-amber-950/30">
          {pinned.map((p) => (
            <div key={p.id} className="flex items-start gap-2">
              {/* AM logo mark */}
              <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect width="40" height="40" rx="8" fill="#f97316"/>
                <path d="M8 31 L16 9 L24 31" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M11 23 L21 23" stroke="white" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
                <path d="M22 31 L22 11 L26 21 L30 11 L30 31" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <p className="text-xs text-amber-900 leading-relaxed line-clamp-2 dark:text-amber-200">
                <span className="font-semibold">{p.sender.name ?? p.sender.username ?? "Admin"}: </span>
                {p.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="h-80 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            No messages yet. Coordinate the handover here — never off-platform.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender.id === myId;
          const isSenderAdmin = m.sender.role === "ADMIN";
          return (
            <div key={m.id} className={cn("group flex items-end gap-1", mine ? "justify-end" : "justify-start")}>
              {/* Pin button for admins (shown on hover) */}
              {isAdmin && !mine && (
                <button
                  onClick={() => togglePin(m.id)}
                  disabled={pinning === m.id}
                  title={m.isPinned ? "Unpin" : "Pin message"}
                  className={cn(
                    "invisible shrink-0 group-hover:visible rounded-full p-1 transition",
                    m.isPinned ? "text-amber-500 hover:text-amber-600" : "text-muted hover:text-amber-500",
                  )}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/>
                  </svg>
                </button>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                  m.isPinned ? "ring-1 ring-amber-300" : "",
                  mine
                    ? "rounded-br-md bg-brand-500 text-white"
                    : isSenderAdmin
                      ? "rounded-bl-md border border-info/30 bg-info/10 text-foreground"
                      : "rounded-bl-md bg-background text-foreground",
                )}
              >
                {!mine && (
                  <p className={cn("mb-0.5 text-[11px] font-semibold", isSenderAdmin ? "text-info" : "text-brand-600")}>
                    {isSenderAdmin ? "⚡ Admin" : m.sender.username ?? m.sender.name}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-muted")}>
                  {relativeTime(m.createdAt)}
                  {m.isPinned && <span className="ml-1 text-amber-500">📌</span>}
                </p>
              </div>
              {/* Pin button for my own messages (admins) */}
              {isAdmin && mine && (
                <button
                  onClick={() => togglePin(m.id)}
                  disabled={pinning === m.id}
                  title={m.isPinned ? "Unpin" : "Pin message"}
                  className={cn(
                    "invisible shrink-0 group-hover:visible rounded-full p-1 transition",
                    m.isPinned ? "text-amber-500 hover:text-amber-600" : "text-muted hover:text-amber-500",
                  )}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/>
                  </svg>
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-surface-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="h-10 flex-1 rounded-xl border border-surface-border bg-background px-3 text-sm focus:border-brand-400 focus:outline-none"
        />
        <Button type="submit" isLoading={sending} disabled={!input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
