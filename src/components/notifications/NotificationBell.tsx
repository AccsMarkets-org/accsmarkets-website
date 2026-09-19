"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn, relativeTime } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";

// Shared AudioContext — created once after first user gesture so it's never suspended.
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!sharedCtx) sharedCtx = new AC();
    if (sharedCtx.state === "suspended") sharedCtx.resume();
    return sharedCtx;
  } catch {
    return null;
  }
}

// Prime the AudioContext on the first user interaction so it is never blocked.
if (typeof window !== "undefined") {
  const prime = () => { getAudioContext(); };
  window.addEventListener("click", prime, { once: true, passive: true });
  window.addEventListener("keydown", prime, { once: true, passive: true });
  window.addEventListener("touchstart", prime, { once: true, passive: true });
}

async function playChime(type: "notification" | "message") {
  try {
    if (typeof window === "undefined") return;
    const muted = localStorage.getItem("accs_sound_muted") === "true";
    if (muted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    // Wait for context to be running — critical when tab regains focus
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.55, ctx.currentTime);
    masterGain.connect(ctx.destination);

    function playTone(freq: number, startTime: number, duration: number) {
      const osc = ctx!.createOscillator();
      const env = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      env.gain.setValueAtTime(0, startTime);
      env.gain.linearRampToValueAtTime(1.0, startTime + 0.012);
      env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(env);
      env.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    }

    const t = ctx.currentTime;
    if (type === "notification") {
      // Ascending two-tone chime: C5 → E5
      playTone(523.25, t,        0.30);
      playTone(659.25, t + 0.17, 0.35);
    } else {
      // Ascending three-tone chime: C5 → E5 → G5
      playTone(523.25, t,        0.22);
      playTone(659.25, t + 0.14, 0.22);
      playTone(783.99, t + 0.28, 0.32);
    }
  } catch {
    // AudioContext not available
  }
}

export { playChime };

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundMuted, setSoundMuted] = useState(false);
  useEffect(() => {
    setSoundMuted(localStorage.getItem("accs_sound_muted") === "true");
  }, []);
  const ref = useRef<HTMLDivElement>(null);
  const socket = useSocket();

  function toggleMute() {
    const next = !soundMuted;
    setSoundMuted(next);
    localStorage.setItem("accs_sound_muted", String(next));
  }

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications);
    setUnreadCount(data.unreadCount);
  }

  useEffect(() => {
    load();
    // Fallback poll in case the socket connection drops — DB is always the source of truth.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    function onNotification(payload: NotificationItem) {
      setItems((prev) => [{ ...payload, isRead: false }, ...prev].slice(0, 30));
      setUnreadCount((c) => c + 1);
      playChime("notification");
    }
    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [socket]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markAllRead() {
    const prevItems = items;
    const prevCount = unreadCount;
    setUnreadCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      const res = await fetch("/api/notifications", { method: "PUT" });
      if (!res.ok) throw new Error();
    } catch {
      // Roll back so the badge doesn't drift from DB truth on a failed request.
      setItems(prevItems);
      setUnreadCount(prevCount);
    }
  }

  async function markOneRead(id: string) {
    const prevItems = items;
    const prevCount = unreadCount;
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error();
    } catch {
      setItems(prevItems);
      setUnreadCount(prevCount);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-surface text-muted hover:text-foreground"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-surface-border bg-background shadow-card">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-muted hover:text-foreground transition-colors" title={soundMuted ? "Unmute sounds" : "Mute sounds"}>
                {soundMuted ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                )}
              </button>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted">No notifications yet.</p>
            )}
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.link ?? "#"}
                onClick={() => { setOpen(false); if (!n.isRead) markOneRead(n.id); }}
                className={cn(
                  "block border-b border-surface-border px-4 py-3 text-sm last:border-0 hover:bg-brand-500/8",
                  !n.isRead && "bg-brand-500/10",
                )}
              >
                <p className="font-medium text-foreground">{n.title}</p>
                <p className="mt-0.5 text-muted">{n.body}</p>
                <p className="mt-1 text-xs text-muted">{relativeTime(n.createdAt)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
