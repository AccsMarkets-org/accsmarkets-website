"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { EscrowStepper } from "@/components/escrow/EscrowStepper";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import { playChime } from "@/components/notifications/NotificationBell";
import type { EscrowStatus, TransferModel } from "@prisma/client";
import { ArrowRight, Check, ClipboardList, ShieldCheck, TriangleAlert, X } from "lucide-react";

interface ChatOfferData {
  _type: "chat_offer";
  offerId: string;
  listingId: string;
  listingTitle: string;
  price: number;
  note: string | null;
  expiresAt: string;
  buyerId?: string;
}

interface ThreadMessage {
  id: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
  isRead: boolean;
  listingId?: string | null;
  chatOfferId?: string | null;
  chatOffer?: { id: string; status: string; amount: number; expiresAt: string } | null;
  sender: { id: string; username: string | null; name: string | null; image?: string | null };
}

interface Partner {
  id: string;
  username: string | null;
  name: string | null;
  image?: string | null;
  lastSeenAt: string | null;
}

interface CannedResponse {
  id: string;
  title: string;
  body: string;
}

interface ActiveEscrow {
  id: string;
  status: string;
  transferModel: string | null;
  totalCharged: number | null;
  transferDeadline: string | null;
  countdownEndsAt: string | null;
  listing: { title: string; platform: string };
}

interface PinnedEscrowMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; username: string | null; name: string | null };
}

interface CompletedOrder {
  id: string;
  amount: number;
  completedAt: string | null;
  role: "buyer" | "seller";
  listing: { title: string; platform: string };
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatFullDateTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) {
    return `Today ${formatTime(iso)}`;
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${formatTime(iso)}`;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + formatTime(iso);
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

/* ─── Read-receipt ticks (WhatsApp-style) ─────────────────────────────────── */
function Ticks({ read, hasEscrow }: { read: boolean; hasEscrow: boolean }) {
  // Single grey tick = sent; double blue/dark tick = read
  if (!read) {
    return (
      <svg className="ml-1 inline-block shrink-0" width="14" height="10" viewBox="0 0 14 10" fill="none">
        <path d="M1.5 5L5.5 9L12.5 1" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  const color = hasEscrow ? "#111827" : "#3b82f6";
  return (
    <svg className="ml-1 inline-block shrink-0" width="18" height="10" viewBox="0 0 18 10" fill="none">
      <path d="M1 5L5 9L12 1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 5L10 9L17 1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─── Countdown timer ─────────────────────────────────────────────────────── */
function Countdown({ deadline }: { deadline: string }) {
  const [parts, setParts] = useState<{ d: number; h: number; m: number } | null>(null);

  useEffect(() => {
    function tick() {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setParts({ d: 0, h: 0, m: 0 }); return; }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setParts({ d, h, m });
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!parts) return null;
  if (parts.d === 0 && parts.h === 0 && parts.m === 0)
    return <span className="font-bold text-white text-sm">Expired</span>;
  return (
    <div className="flex items-end gap-1.5">
      {parts.d > 0 && (
        <span className="flex flex-col items-center">
          <span className="font-mono font-bold text-white text-base leading-none">{parts.d}</span>
          <span className="text-[9px] text-blue-200 uppercase tracking-wide">d</span>
        </span>
      )}
      <span className="flex flex-col items-center">
        <span className="font-mono font-bold text-white text-base leading-none">{String(parts.h).padStart(2, "0")}</span>
        <span className="text-[9px] text-blue-200 uppercase tracking-wide">hr</span>
      </span>
      <span className="flex flex-col items-center">
        <span className="font-mono font-bold text-white text-base leading-none">{String(parts.m).padStart(2, "0")}</span>
        <span className="text-[9px] text-blue-200 uppercase tracking-wide">min</span>
      </span>
    </div>
  );
}

/* ─── Date separator ──────────────────────────────────────────────────────── */
function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-surface-border" />
      <span className="rounded-full bg-surface border border-surface-border px-3 py-0.5 text-[11px] font-medium text-muted">
        {label}
      </span>
      <div className="h-px flex-1 bg-surface-border" />
    </div>
  );
}

/* ─── Common emoji set ────────────────────────────────────────────────────── */
const QUICK_EMOJIS = [
  "👍","❤️","😂","😮","😢","🙏","🔥","✅","💯","🎉",
  "😊","👋","🤝","💬","✨","🚀","💪","😎","🙌","😁",
  "😍","🤔","👀","💡","⭐","🎯","💰","🛡️","🏆","💎",
];

/* ─── Listing context banner ──────────────────────────────────────────────── */
function ListingContextBanner({ listingId }: { listingId: string }) {
  const [listing, setListing] = useState<{ title: string; price: string | null; platform: string | null } | null>(null);

  useEffect(() => {
    fetch(`/api/listings/${listingId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.listing) {
          setListing({
            title: d.listing.title,
            price: d.listing.price != null ? String(d.listing.price) : null,
            platform: d.listing.platform ?? null,
          });
        }
      })
      .catch(() => null);
  }, [listingId]);

  if (!listing) return null;

  return (
    <div className="shrink-0 border-b border-surface-border bg-gradient-to-r from-brand-50 to-surface px-4 py-2.5 dark:from-brand-950/30">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeWidth={2.5}/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">Asking about listing</p>
            {listing.platform && (
              <span className="rounded-sm bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 uppercase tracking-wide dark:bg-brand-900/50 dark:text-brand-400">
                {listing.platform}
              </span>
            )}
          </div>
          <p className="truncate text-sm font-semibold text-foreground">{listing.title}</p>
        </div>
        {listing.price && (
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted">Price</p>
            <p className="text-sm font-bold text-foreground">{listing.price}</p>
          </div>
        )}
        <Link
          href={`/listings/${listingId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-brand-300 bg-brand-500/10 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition dark:border-brand-700 dark:text-brand-400 dark:hover:bg-brand-900/50"
        >
          View
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/* ─── Chat offer card ─────────────────────────────────────────────────────── */
function ChatOfferCard({
  offerData,
  liveStatus,
  isMine,
  myId,
  onStatusChange,
}: {
  offerData: ChatOfferData;
  liveStatus: string;
  isMine: boolean;
  myId: string;
  onStatusChange: (offerId: string, status: string) => void;
}) {
  const [acting, setActing] = useState(false);
  const expired = new Date(offerData.expiresAt) < new Date();
  const effectiveStatus = expired && liveStatus === "PENDING" ? "EXPIRED" : liveStatus;
  // Offers can now come from either the seller (pitching a listing) or the buyer
  // (proposing a price) — checkout only ever applies to whichever party is the buyer.
  const viewerIsBuyer = offerData.buyerId ? offerData.buyerId === myId : !isMine;

  async function act(action: "accept" | "decline") {
    setActing(true);
    try {
      const res = await fetch(`/api/messages/chat-offer/${offerData.offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onStatusChange(offerData.offerId, action === "accept" ? "ACCEPTED" : "DECLINED");
      if (action === "accept" && viewerIsBuyer) {
        window.location.href = `/checkout/${offerData.listingId}?offerId=${offerData.offerId}`;
      } else if (action === "accept") {
        toast.success("Offer accepted — the buyer can now check out.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActing(false);
    }
  }

  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
    ACCEPTED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
    DECLINED: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
    EXPIRED: "bg-surface text-muted border-surface-border",
    CANCELLED: "bg-surface text-muted border-surface-border",
  };

  return (
    <div className={cn(
      "rounded-2xl border p-4 shadow-sm w-full max-w-[280px]",
      isMine ? "bg-brand-600 border-brand-700 text-white" : "bg-surface border-surface-border",
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isMine ? "bg-brand-700" : "bg-brand-100",
        )}>
          <svg className={cn("h-4 w-4", isMine ? "text-white" : "text-brand-600")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-[11px] font-bold uppercase tracking-wide", isMine ? "text-brand-200" : "text-brand-500")}>
            Price Offer
          </p>
          <p className={cn("text-xs truncate font-medium", isMine ? "text-brand-100" : "text-muted")}>
            {offerData.listingTitle}
          </p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-3">
        <p className={cn("text-2xl font-bold leading-none", isMine ? "text-white" : "text-foreground")}>
          ${offerData.price.toFixed(2)}
        </p>
        {offerData.note && (
          <p className={cn("mt-1 text-xs leading-relaxed", isMine ? "text-brand-200" : "text-muted")}>
            {offerData.note}
          </p>
        )}
      </div>

      {/* Status badge */}
      {effectiveStatus !== "PENDING" && (
        <div className={cn("mb-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", statusColor[effectiveStatus] ?? statusColor.EXPIRED)}>
          {effectiveStatus === "ACCEPTED" ? <><Check className="h-3 w-3" aria-hidden />Accepted</> : effectiveStatus === "DECLINED" ? <><X className="h-3 w-3" aria-hidden />Declined</> : "Expired"}
        </div>
      )}

      {/* Buyer action buttons */}
      {effectiveStatus === "PENDING" && !isMine && (
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            disabled={acting}
            onClick={() => act("accept")}
            className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition disabled:opacity-50"
          >
            {acting ? "…" : viewerIsBuyer ? "Accept & Buy" : "Accept Offer"}
          </button>
          <button
            type="button"
            disabled={acting}
            onClick={() => act("decline")}
            className="flex-1 rounded-xl border border-surface-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface transition disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}

      {/* Accepted — checkout link (only the buyer side ever checks out) */}
      {effectiveStatus === "ACCEPTED" && viewerIsBuyer && (
        <Link
          href={`/checkout/${offerData.listingId}?offerId=${offerData.offerId}`}
          className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
        >
          Go to Checkout
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}

      {/* Expiry */}
      {effectiveStatus === "PENDING" && (
        <p className={cn("mt-2 text-[10px]", isMine ? "text-brand-300" : "text-muted")}>
          Expires {new Date(offerData.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}

/* ─── Send Offer modal ────────────────────────────────────────────────────── */
interface MyListing { id: string; title: string; price: number; platform: string; }

function SendOfferModal({
  recipientId,
  onClose,
  onSent,
}: {
  recipientId: string;
  onClose: () => void;
  onSent: (message: ThreadMessage) => void;
}) {
  const [listings, setListings] = useState<MyListing[]>([]);
  const [mode, setMode] = useState<"sell" | "buy">("sell");
  const [loadingListings, setLoadingListings] = useState(true);
  const [selectedListing, setSelectedListing] = useState<MyListing | null>(null);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/listings/mine")
      .then((r) => r.json())
      .then((d) => {
        const mine: MyListing[] = d.listings ?? [];
        if (mine.length > 0) {
          setListings(mine);
          setMode("sell");
          setLoadingListings(false);
          return;
        }
        // No listings of your own — fall back to making a purchase offer on
        // one of the chat partner's active listings instead.
        setMode("buy");
        return fetch(`/api/listings/mine?sellerId=${recipientId}`)
          .then((r) => r.json())
          .then((d2) => setListings(d2.listings ?? []))
          .finally(() => setLoadingListings(false));
      })
      .catch(() => setLoadingListings(false));
  }, [recipientId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedListing) { toast.error(mode === "sell" ? "Select one of your listings first." : "Select a listing first."); return; }
    const p = parseFloat(price);
    if (!p || p <= 0) { toast.error("Enter a valid price."); return; }
    setSending(true);
    try {
      const res = await fetch("/api/messages/chat-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, listingId: selectedListing.id, price: p, note: note.trim() || null }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === "PHONE_VERIFICATION_REQUIRED") {
        router.push(`/dashboard/verify-whatsapp?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to send offer");
      onSent(data.message);
      onClose();
      toast.success("Offer sent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-background border border-surface-border shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Send Price Offer</h3>
            <p className="text-xs text-muted">
              {mode === "sell" ? "Propose a custom price directly in this conversation" : "Make a purchase offer on one of their listings"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground transition p-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {/* Listing picker */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              {mode === "sell" ? "Your Listing" : "Their Listing"}
            </label>
            {loadingListings ? (
              <div className="flex items-center gap-2 text-xs text-muted py-1">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                </svg>
                Loading listings…
              </div>
            ) : listings.length === 0 ? (
              <p className="rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-xs text-muted">
                {mode === "sell"
                  ? "You have no active listings. Create a listing first to send offers."
                  : "This user has no active listings to make an offer on right now."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
                {listings.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => { setSelectedListing(l); setPrice(String(l.price)); }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      selectedListing?.id === l.id
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-surface-border bg-surface text-foreground hover:border-brand-300",
                    )}
                  >
                    {l.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Offer Price (USD)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-surface-border bg-surface pl-7 pr-4 py-2.5 text-sm font-semibold focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Note (optional)</label>
            <textarea
              rows={2}
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Includes 30-day support…"
              className="w-full resize-none rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            />
          </div>
          <p className="text-[11px] text-muted">
            {mode === "sell"
              ? "Offer expires in 48 hours. Once accepted, the buyer proceeds to secure escrow checkout."
              : "Offer expires in 72 hours. If accepted, you'll be able to proceed to secure escrow checkout."}
          </p>
          <button
            type="submit"
            disabled={sending || !price || !selectedListing}
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send Offer"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function MessageThread({
  partnerId,
  isOfficialThread = false,
}: {
  partnerId: string;
  isOfficialThread?: boolean;
}) {
  const { data: session } = useSession();
  const socket = useSocket();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [activeEscrow, setActiveEscrow] = useState<ActiveEscrow | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [escrowPinnedMessages, setEscrowPinnedMessages] = useState<PinnedEscrowMessage[]>([]);
  const [showEscrowPinned, setShowEscrowPinned] = useState(false);
  const [orderHistory, setOrderHistory] = useState<CompletedOrder[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  // track live offer status updates without re-fetching all messages
  const [offerStatuses, setOfferStatuses] = useState<Record<string, string>>({});
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const PAGE_SIZE = 50; // matches the API route's `take: 50`
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAdmin = session?.user?.role === "ADMIN";
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myId = session?.user?.id;
  const pathname = usePathname();
  const router = useRouter();
  const backHref = pathname?.startsWith("/admin/messages") ? "/admin/messages" : "/dashboard/messages";

  // Listing context: from URL params (buyer) or from the first message in thread (seller)
  const urlListingId = searchParams.get("listingId");
  const threadListingId = messages.find((m) => m.listingId)?.listingId ?? null;
  const ctxListingId = urlListingId ?? threadListingId;

  // Track whether current user is the seller of the listing in context
  const [listingSellerId, setListingSellerId] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState<string>("Listing");
  useEffect(() => {
    if (!ctxListingId) { setListingSellerId(null); return; }
    fetch(`/api/listings/${ctxListingId}`)
      .then((r) => r.json())
      .then((d) => {
        setListingSellerId(d.listing?.sellerId ?? null);
        setListingTitle(d.listing?.title ?? "Listing");
      })
      .catch(() => null);
  }, [ctxListingId]);
  const iAmSeller = !!myId && listingSellerId === myId;

  useEffect(() => {
    if (!isOfficialThread || !isAdmin) return;
    fetch("/api/admin/canned-responses")
      .then((r) => r.json())
      .then((d) => setCannedResponses(d.responses ?? []))
      .catch(() => null);
  }, [isOfficialThread, isAdmin]);

  useEffect(() => {
    const ctx = searchParams.get("context");
    if (ctx && isOfficialThread) {
      setInput(`Re: ${ctx.replace("escrow_", "Escrow #")}\n`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isOnline = partner?.lastSeenAt
    ? Date.now() - new Date(partner.lastSeenAt).getTime() < 5 * 60 * 1000
    : false;

  const load = useCallback(async (merge = false) => {
    try {
      const res = await fetch(`/api/messages/${partnerId}`);
      const data = await res.json();
      const incoming: ThreadMessage[] = data.messages ?? [];
      if (merge) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = incoming.filter((m) => !existingIds.has(m.id));
          if (!fresh.length) return prev;
          return [...prev, ...fresh];
        });
      } else {
        setMessages(incoming);
        setHasMoreOlder(incoming.length >= PAGE_SIZE);
      }
      setPartner(data.partner ?? null);
      setOrderHistory(data.orderHistory ?? []);
      const esc = data.activeEscrow ?? null;
      setActiveEscrow(esc);
      if (esc) {
        fetch(`/api/escrows/${esc.id}/messages`)
          .then((r) => r.json())
          .then((d) => setEscrowPinnedMessages(d.pinned ?? []))
          .catch(() => null);
      }
    } catch {
      toast.error("Failed to load messages");
    }
  }, [partnerId]);

  useEffect(() => { load(); }, [load]);

  // Cursor-paginate further back — the API already supports ?before=<id>,
  // this was previously never called, so any thread past 50 messages had
  // permanently inaccessible history.
  const loadOlder = useCallback(async () => {
    if (loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    try {
      const oldestId = messages[0].id;
      const res = await fetch(`/api/messages/${partnerId}?before=${oldestId}`);
      const data = await res.json();
      const older: ThreadMessage[] = data.messages ?? [];
      setMessages((prev) => [...older, ...prev]);
      setHasMoreOlder(older.length >= PAGE_SIZE);
      // Preserve scroll position — prepending content otherwise yanks the
      // viewport down to whatever was at the old scrollTop offset.
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
      });
    } catch {
      toast.error("Failed to load older messages");
    } finally {
      setLoadingOlder(false);
    }
  }, [partnerId, messages, loadingOlder]);

  useEffect(() => {
    // Slow down polling since socket handles real-time; polling is just a fallback
    const interval = setInterval(() => load(true), 10000);
    const onVisible = () => { if (document.visibilityState === "visible") load(true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!socket || !myId) return;
    const convId = [myId, partnerId].sort().join("_");
    socket.emit("join_conversation", convId);

    function onMessage({ message }: { message: ThreadMessage & { sender: { id: string } } }) {
      if (message.sender.id !== partnerId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        playChime("message");
        return [...prev, message];
      });
    }
    function onRead({ conversationId: cid }: { conversationId: string }) {
      if (cid !== convId) return;
      setMessages((prev) => prev.map((m) => (m.sender.id === myId ? { ...m, isRead: true } : m)));
    }
    function onTyping({ userId }: { userId: string }) {
      if (userId === partnerId) setPartnerTyping(true);
    }
    function onStopTyping({ userId }: { userId: string }) {
      if (userId === partnerId) setPartnerTyping(false);
    }
    // An escrow between us just completed (either side can trigger it) — refetch so it
    // drops out of the active-escrow banner and appears in Order History for both parties.
    function onEscrowCompleted() {
      load(false);
    }

    socket.on("new_message", onMessage);
    socket.on("messages_read", onRead);
    socket.on("user_typing", onTyping);
    socket.on("user_stopped_typing", onStopTyping);
    socket.on("escrow_completed", onEscrowCompleted);
    return () => {
      socket.off("new_message", onMessage);
      socket.off("messages_read", onRead);
      socket.off("user_typing", onTyping);
      socket.off("user_stopped_typing", onStopTyping);
      socket.off("escrow_completed", onEscrowCompleted);
    };
  }, [socket, myId, partnerId, load]);

  // Only auto-scroll when a message is appended at the end (new send/receive)
  // — not when loadOlder() prepends older history, which would otherwise
  // fight that function's own scroll-position preservation and yank the
  // view back down to the bottom every time you load older messages.
  const lastMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? null;
    if (lastId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastId;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, partnerTyping]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  // Close emoji picker on click outside
  useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-emoji-picker]")) setEmojiOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [emojiOpen]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/message", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setPendingFile({ url: data.url, name: data.name ?? file.name });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleInputChange(value: string) {
    setInput(value);
    if (!socket || !myId) return;
    const convId = [myId, partnerId].sort().join("_");
    socket.emit("typing_start", { conversationId: convId, recipientId: partnerId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing_stop", { conversationId: convId, recipientId: partnerId });
    }, 1500);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && !pendingFile) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: partnerId,
          content: input,
          ...(pendingFile ? { attachmentUrl: pendingFile.url, attachmentName: pendingFile.name } : {}),
          // Attach listingId on first message so seller also sees the listing banner
          ...(ctxListingId && messages.length === 0 ? { listingId: ctxListingId } : {}),
        }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === "PHONE_VERIFICATION_REQUIRED") {
        router.push(`/dashboard/verify-whatsapp?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      setInput("");
      setPendingFile(null);
      if (data.linkStripped) {
        toast("Links are not allowed in chats and were removed.", { icon: <TriangleAlert className="h-4 w-4 text-warning" aria-hidden /> });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  const displayName = isOfficialThread ? "Escrow Support" : (partner?.username ?? partner?.name ?? "…");
  const shortId = activeEscrow ? `EC-${activeEscrow.id.slice(-8).toUpperCase()}` : null;

  // Build filtered messages for search
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // Group messages with date separators + consecutive-sender grouping
  type RenderItem =
    | { kind: "separator"; label: string; key: string }
    | { kind: "message"; msg: ThreadMessage; isFirst: boolean; isLast: boolean };

  const renderItems: RenderItem[] = [];
  let lastDate = "";
  let lastSenderId = "";
  for (let i = 0; i < filteredMessages.length; i++) {
    const msg = filteredMessages[i];
    const dl = dateLabel(msg.createdAt);
    if (dl !== lastDate) {
      renderItems.push({ kind: "separator", label: dl, key: `sep-${dl}` });
      lastDate = dl;
      lastSenderId = "";
    }
    const nextMsg = filteredMessages[i + 1];
    const isFirst = msg.sender.id !== lastSenderId;
    const isLast = !nextMsg || nextMsg.sender.id !== msg.sender.id || dateLabel(nextMsg.createdAt) !== dl;
    renderItems.push({ kind: "message", msg, isFirst, isLast });
    lastSenderId = msg.sender.id;
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-surface-border bg-background px-4 py-3 shrink-0">
        {/* Mobile-only back to conversation list — the sidebar is hidden on small
            screens once a thread is open, so this is the only in-app way back. */}
        <Link
          href={backHref}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-foreground md:hidden"
          aria-label="Back to conversations"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        {isOfficialThread ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Escrow Support" className="h-full w-full object-cover" />
          </span>
        ) : partner?.image ? (
          <img
            src={partner.image}
            alt={displayName}
            className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white shadow-sm">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate text-foreground">{displayName}</p>
            <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", isOnline ? "bg-success" : "bg-muted/30")} />
          </div>
          <p className="text-xs text-muted truncate">
            {partnerTyping ? (
              <span className="text-brand-500 font-medium">typing…</span>
            ) : isOnline ? (
              "Online now"
            ) : partner?.lastSeenAt ? (
              `Last seen ${formatFullDateTime(partner.lastSeenAt)}`
            ) : (
              "Offline"
            )}
          </p>
        </div>

        {/* Search toggle */}
        <button
          type="button"
          onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setSearchQuery(""); }}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition",
            searchOpen ? "bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400" : "text-muted hover:text-foreground hover:bg-surface",
          )}
          aria-label="Search messages"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* Escrow chip — compact icon+id on mobile, full status detail from sm: up */}
        {activeEscrow && (
          <Link
            href={isAdmin ? `/admin/escrows/${activeEscrow.id}` : `/dashboard/escrows/${activeEscrow.id}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-surface-border bg-surface px-3 py-1 transition hover:border-brand-300"
          >
            <svg className="h-3 w-3 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="text-xs font-bold text-foreground">{shortId}</span>
            <span className="hidden text-[10px] text-muted sm:inline">·</span>
            <span className="hidden text-[10px] font-semibold text-brand-600 uppercase tracking-wide sm:inline">
              {activeEscrow.status === "IN_TRANSFER" ? "TRANSFERRING" : activeEscrow.status.replace(/_/g, " ")}
            </span>
            <ArrowRight className="hidden h-3.5 w-3.5 text-brand-600 sm:inline" aria-hidden />
          </Link>
        )}
      </div>

      {/* ── Listing context banner (when user came from a listing page) ──────── */}
      {ctxListingId && !activeEscrow && (
        <ListingContextBanner listingId={ctxListingId} />
      )}

      {/* ── Search bar (collapses in) ───────────────────────────────────────── */}
      {searchOpen && (
        <div className="shrink-0 border-b border-surface-border bg-surface px-4 py-2">
          <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-background px-3 py-2">
            <svg className="h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="text-muted hover:text-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-1 text-[11px] text-muted">
              {filteredMessages.length} result{filteredMessages.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* ── Escrow Progress ───────────────────────────────────────────────────── */}
      {activeEscrow && (
        <div className="shrink-0 border-b border-surface-border bg-surface">
          <div className="px-5 pt-4 pb-2">
            <EscrowStepper
              status={activeEscrow.status as EscrowStatus}
              transferModel={activeEscrow.transferModel as TransferModel | null}
            />
          </div>
          <div className="mx-4 mb-4 flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldCheck className="h-6 w-6 shrink-0 text-white" strokeWidth={1.75} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{activeEscrow.listing.title}</p>
                <p className="text-xs text-blue-200 mt-0.5">
                  {activeEscrow.listing.platform}
                  {activeEscrow.totalCharged != null && (
                    <> · <strong className="text-white">${Number(activeEscrow.totalCharged).toFixed(2)}</strong></>
                  )}
                  {" · "}Protected 7-Day Buyer Guarantee Active
                </p>
              </div>
            </div>
            {(activeEscrow.countdownEndsAt ?? activeEscrow.transferDeadline) && (
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-200 mb-0.5">
                  {activeEscrow.status === "IN_TRANSFER" ? "Countdown" : "Deadline"}
                </p>
                <Countdown deadline={(activeEscrow.countdownEndsAt ?? activeEscrow.transferDeadline)!} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Escrow Pinned Messages bar (admin only) ──────────────────────────── */}
      {isAdmin && activeEscrow && escrowPinnedMessages.length > 0 && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <button
            onClick={() => setShowEscrowPinned((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-amber-100 transition dark:hover:bg-amber-900/30"
          >
            <svg className="h-3.5 w-3.5 shrink-0 text-amber-600" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="#f97316"/>
              <path d="M8 31 L16 9 L24 31" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M11 23 L21 23" stroke="white" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
              <path d="M22 31 L22 11 L26 21 L30 11 L30 31" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span className="text-xs font-semibold text-amber-800">
              {escrowPinnedMessages.length} pinned {escrowPinnedMessages.length === 1 ? "message" : "messages"}
            </span>
            <svg className={cn("ml-auto h-3 w-3 text-amber-600 transition-transform", showEscrowPinned && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showEscrowPinned && (
            <div className="divide-y divide-amber-100 px-4 pb-2 dark:divide-amber-800/50">
              {escrowPinnedMessages.map((p) => (
                <div key={p.id} className="py-2">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    {p.sender.name ?? p.sender.username ?? "Support"} · {new Date(p.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-900 line-clamp-2 dark:text-amber-300">{p.content}</p>
                </div>
              ))}
              <div className="pt-2">
                <Link
                  href={`/admin/escrows/${activeEscrow.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                >
                  Open full escrow chat
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Order History (completed escrows between these two people) ───────── */}
      {!isOfficialThread && orderHistory.length > 0 && (
        <div className="shrink-0 border-b border-surface-border bg-surface">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-brand-500/8 transition"
          >
            <svg className="h-3.5 w-3.5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-foreground">
              {orderHistory.length} completed {orderHistory.length === 1 ? "order" : "orders"} together
            </span>
            <svg className={cn("ml-auto h-3 w-3 shrink-0 text-muted transition-transform", showHistory && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showHistory && (
            <div className="max-h-56 divide-y divide-surface-border overflow-y-auto px-4 pb-2">
              {orderHistory.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/escrows/${order.id}`}
                  className="-mx-1 flex items-center justify-between gap-3 rounded-lg px-1 py-2.5 transition hover:bg-brand-500/8"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{order.listing.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {order.listing.platform}
                      {order.completedAt && <> · {formatFullDateTime(order.completedAt)}</>}
                      {" · "}You {order.role === "buyer" ? "bought" : "sold"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-foreground">${order.amount.toFixed(2)}</p>
                    <span className="text-[10px] font-semibold text-success">Completed</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3">
        {hasMoreOlder && (
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingOlder}
              className="rounded-full border border-surface-border bg-surface px-4 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:border-brand-400 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingOlder ? "Loading…" : "Load older messages"}
            </button>
          </div>
        )}

        {isOfficialThread && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            <strong>Security notice:</strong> AccsMarkets staff will never ask for your password,
            2FA codes, or payment outside this platform.
          </div>
        )}

        {messages.length === 0 && !partnerTyping && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface border border-surface-border">
              <svg className="h-7 w-7 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">No messages yet</p>
              <p className="mt-1 text-sm text-muted">
                {ctxListingId
                  ? "Ask about this listing to get started."
                  : "Send a message to start the conversation."}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-0.5">
          {renderItems.map((item) => {
            if (item.kind === "separator") {
              return <DateSeparator key={item.key} label={item.label} />;
            }

            const { msg: m, isFirst, isLast } = item;
            const mine = m.sender.id === myId;
            const incomingLabel = isOfficialThread
              ? "Escrow Support"
              : (m.sender.username ?? m.sender.name ?? "User");
            const avatarLetter = incomingLabel.slice(0, 1).toUpperCase();

            // Bubble corner radius: first/last of group get sharper corners
            const bubbleRoundClass = mine
              ? cn(
                  "rounded-2xl",
                  isFirst && !isLast ? "rounded-tr-sm" : "",
                  !isFirst && isLast ? "rounded-tr-sm" : "",
                  !isFirst && !isLast ? "rounded-tr-sm rounded-br-sm" : "",
                  isLast ? "rounded-br-sm" : "",
                )
              : cn(
                  "rounded-2xl",
                  isFirst && !isLast ? "rounded-tl-sm" : "",
                  !isFirst && isLast ? "rounded-tl-sm" : "",
                  !isFirst && !isLast ? "rounded-tl-sm rounded-bl-sm" : "",
                  isLast ? "rounded-bl-sm" : "",
                );

            return (
              <div
                key={m.id}
                className={cn(
                  "flex items-end gap-2",
                  mine ? "flex-row-reverse" : "flex-row",
                  isLast ? "mb-2" : "mb-0.5",
                )}
              >
                {/* Avatar — only for last message in a group (incoming only) */}
                {!mine ? (
                  isLast ? (
                    isOfficialThread ? (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Escrow Support" className="h-full w-full object-cover" />
                      </span>
                    ) : m.sender.image ? (
                      <img
                        src={m.sender.image}
                        alt={incomingLabel}
                        className="h-7 w-7 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                        {avatarLetter}
                      </span>
                    )
                  ) : (
                    <span className="w-7 shrink-0" />
                  )
                ) : null}

                <div className={cn("flex max-w-[70%] flex-col", mine ? "items-end" : "items-start")}>
                  {/* Sender name — only first message in group, for incoming in non-official threads */}
                  {!mine && isFirst && !isOfficialThread && (
                    <span className="mb-1 px-1 text-[10px] font-semibold text-brand-500">
                      {incomingLabel}
                    </span>
                  )}
                  {!mine && isFirst && isOfficialThread && (
                    <span className="mb-1 px-1 text-[10px] font-bold text-brand-500 uppercase tracking-wide">
                      {incomingLabel}
                    </span>
                  )}

                  {/* Chat offer card */}
                  {m.chatOfferId && (() => {
                    let offerData: ChatOfferData | null = null;
                    try { offerData = JSON.parse(m.content) as ChatOfferData; } catch { /* ignore */ }
                    if (offerData?._type === "chat_offer" && myId) {
                      const liveStatus = offerStatuses[m.chatOfferId] ?? m.chatOffer?.status ?? "PENDING";
                      return (
                        <ChatOfferCard
                          offerData={offerData}
                          liveStatus={liveStatus}
                          isMine={mine}
                          myId={myId}
                          onStatusChange={(id, status) => setOfferStatuses((prev) => ({ ...prev, [id]: status }))}
                        />
                      );
                    }
                    return null;
                  })()}

                  {/* Normal bubble (skip for offer messages) */}
                  {!m.chatOfferId && <div
                    className={cn(
                      "px-3.5 py-2.5 text-sm shadow-sm",
                      bubbleRoundClass,
                      mine
                        ? "bg-brand-500 text-white"
                        : "bg-surface text-foreground border border-surface-border",
                    )}
                  >
                    {m.attachmentUrl && (
                      <div className="mb-2">
                        {/\.(jpe?g|png|gif|webp)$/i.test(m.attachmentUrl) || m.attachmentUrl.includes("/image/") ? (
                          <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.attachmentUrl}
                              alt={m.attachmentName ?? "attachment"}
                              className="max-h-48 max-w-full rounded-xl object-cover"
                            />
                          </a>
                        ) : (
                          <a
                            href={m.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition",
                              mine ? "bg-brand-600 hover:bg-brand-700 text-white" : "bg-surface-border hover:bg-surface text-foreground",
                            )}
                          >
                            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="truncate max-w-[160px]">{m.attachmentName ?? "File"}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {m.content && (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {searchQuery
                          ? m.content.split(new RegExp(`(${searchQuery})`, "gi")).map((part, i) =>
                              part.toLowerCase() === searchQuery.toLowerCase()
                                ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/40 text-foreground rounded px-0.5">{part}</mark>
                                : part
                            )
                          : m.content}
                      </p>
                    )}
                  </div>}

                  {/* Time + tick — only on last message in group */}
                  {isLast && (
                    <div className={cn("mt-1 flex items-center gap-1 px-1", mine ? "flex-row-reverse" : "flex-row")}>
                      <span
                        className="text-[10px] leading-none text-muted whitespace-nowrap"
                        title={formatFullDateTime(m.createdAt)}
                      >
                        {formatTime(m.createdAt)}
                      </span>
                      {mine && <Ticks read={m.isRead} hasEscrow={activeEscrow !== null} />}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {partnerTyping && (
          <div className="mt-2 flex items-end gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
            <div className="rounded-2xl rounded-bl-sm border border-surface-border bg-surface px-4 py-2.5">
              <div className="flex gap-1 items-center h-4">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Compose ────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSend} className="shrink-0 border-t border-surface-border bg-background px-4 py-3">
        {isOfficialThread && isAdmin && cannedResponses.length > 0 && (
          <div className="relative mb-2">
            <button
              type="button"
              onClick={() => setCannedOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-2.5 py-1 text-xs text-muted hover:text-foreground transition"
            >
              <ClipboardList className="h-3.5 w-3.5" aria-hidden />
              Insert canned response
            </button>
            {cannedOpen && (
              <div className="absolute bottom-full left-0 mb-1 z-20 w-72 rounded-xl border border-surface-border bg-background shadow-lg overflow-hidden">
                {cannedResponses.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setInput((prev) => (prev ? `${prev}\n${r.body}` : r.body));
                      setCannedOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-brand-500/8 transition border-b border-surface-border last:border-0"
                  >
                    <p className="font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted truncate">{r.body.slice(0, 60)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* File attachment preview */}
        {pendingFile && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2">
            <svg className="h-4 w-4 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="flex-1 truncate text-xs text-foreground">{pendingFile.name}</span>
            <button type="button" onClick={() => setPendingFile(null)} className="text-muted hover:text-foreground transition">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Send Offer — any seller, any chat (not official support thread) */}
          {!isOfficialThread && (
            <button
              type="button"
              onClick={() => setShowOfferModal(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-brand-300 bg-brand-500/10 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900 sm:w-auto sm:px-3"
              title="Send price offer"
              aria-label="Send price offer"
            >
              <svg className="h-4 w-4 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="hidden sm:inline">Send Offer</span>
            </button>
          )}

          {/* Attachment */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface text-muted hover:text-foreground transition disabled:opacity-50"
            title="Attach file"
          >
            {uploading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 1 0 2.828 2.828l6.414-6.586a4 4 0 0 0-5.656-5.656l-6.415 6.585a6 6 0 1 0 8.486 8.486L20.5 13" />
              </svg>
            )}
          </button>

          {/* Emoji picker */}
          <div className="relative shrink-0" data-emoji-picker>
            <button
              type="button"
              onClick={() => setEmojiOpen((v) => !v)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border transition",
                emojiOpen
                  ? "border-brand-400 bg-brand-500/10 text-brand-600"
                  : "border-surface-border bg-surface text-muted hover:text-foreground",
              )}
              title="Emoji"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" strokeWidth={2.5}/>
                <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" strokeWidth={2.5}/>
              </svg>
            </button>
            {emojiOpen && (
              <div className="absolute bottom-full mb-2 left-0 z-30 rounded-2xl border border-surface-border bg-background shadow-2xl overflow-hidden" style={{ width: "220px" }}>
                <div className="border-b border-surface-border bg-surface px-3 py-2">
                  <p className="text-[11px] font-semibold text-muted">Quick emojis</p>
                </div>
                <div className="grid grid-cols-6 gap-0 p-2">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onMouseDown={(e) => {
                        // Use mousedown to prevent blur before click
                        e.preventDefault();
                        setInput((prev) => prev + emoji);
                        setEmojiOpen(false);
                        textareaRef.current?.focus();
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-brand-500/8 transition select-none"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Growing textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent); }
            }}
            placeholder="Type a message…"
            className="flex-1 resize-none rounded-2xl border border-surface-border bg-surface px-4 py-2.5 text-sm leading-relaxed focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 max-h-[120px] overflow-y-auto"
            style={{ height: "40px" }}
          />

          {/* Send */}
          <button
            type="submit"
            disabled={(!input.trim() && !pendingFile) || sending || uploading}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition shadow-sm",
              (input.trim() || pendingFile) && !sending && !uploading
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "bg-surface border border-surface-border text-muted cursor-not-allowed",
            )}
            title="Send"
          >
            {sending ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted/50">Enter to send · Shift+Enter for new line</p>
      </form>

      {/* ── Send Offer modal ──────────────────────────────────────────────── */}
      {showOfferModal && (
        <SendOfferModal
          recipientId={partnerId}
          onClose={() => setShowOfferModal(false)}
          onSent={(msg) => setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))}
        />
      )}
    </div>
  );
}
