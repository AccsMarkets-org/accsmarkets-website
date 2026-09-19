"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { cn, relativeTime } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import type { VerifiedBadge as VerifiedBadgeEnum } from "@prisma/client";

interface Partner {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  verifiedBadge?: VerifiedBadgeEnum | null;
  lastSeenAt: string | null;
  trustScore?: number | null;
}

interface PartnerStats {
  deals: number;
  volume: number;
  reviews: number;
  activeListings: number;
}

interface ActiveEscrow {
  id: string;
  status: string;
  listing: { title: string; platform: string };
  transferDeadline: string | null;
  countdownEndsAt: string | null;
}

const COUNTDOWN_EVENTS = ["escrow_verified", "escrow_transferring", "escrow_countdown_updated", "escrow_manager_verified"];

function countdownLabel(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "Countdown complete";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
}

interface Props {
  partnerId: string;
  isOfficialThread?: boolean;
}

const ESCROW_STATUS_COLOR: Record<string, string> = {
  FUNDED:    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  SUBMITTED: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  DISPUTED:  "bg-danger/10 text-danger",
  COMPLETED: "bg-success/10 text-success",
};

export function PartnerProfilePanel({ partnerId, isOfficialThread = false }: Props) {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [escrow, setEscrow] = useState<ActiveEscrow | null>(null);
  const [, setTick] = useState(0); // force re-render every 30s (and every 1s while a countdown is shown)
  const socket = useSocket();

  const fetchPartner = useCallback(() => {
    fetch(`/api/messages/${partnerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.partner) setPartner(d.partner);
        if (d.partnerStats) setStats(d.partnerStats);
        setEscrow(d.activeEscrow ?? null);
      })
      .catch(() => null);
  }, [partnerId]);

  useEffect(() => {
    fetchPartner();
    // Re-poll every 30s so online status / escrow state stays fresh
    const poll = setInterval(fetchPartner, 30_000);
    // Re-render every 30s to update "last seen X minutes ago" text
    const ticker = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => { clearInterval(poll); clearInterval(ticker); };
  }, [fetchPartner]);

  // Live updates: refetch immediately when the counterparty's escrow changes
  // (verified, transfer started, admin adjusted the countdown, etc.)
  useEffect(() => {
    if (!socket) return;
    function onUpdate() { fetchPartner(); }
    for (const event of COUNTDOWN_EVENTS) socket.on(event, onUpdate);
    return () => { for (const event of COUNTDOWN_EVENTS) socket.off(event, onUpdate); };
  }, [socket, fetchPartner]);

  // Tick every second while an active countdown is visible so it stays accurate.
  useEffect(() => {
    const activeDeadline = escrow?.countdownEndsAt ?? escrow?.transferDeadline;
    if (!activeDeadline) return;
    const interval = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [escrow?.countdownEndsAt, escrow?.transferDeadline]);

  const isOnline = partner?.lastSeenAt
    ? Date.now() - new Date(partner.lastSeenAt).getTime() < 5 * 60 * 1000
    : false;

  const displayName = isOfficialThread
    ? "Escrow Support"
    : (partner?.username ?? partner?.name ?? "…");

  if (!partner) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-2 text-center">
        {partner.image ? (
          <img
            src={partner.image}
            alt={displayName}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <div className="flex items-center justify-center gap-1.5">
            <p className="font-semibold">{displayName}</p>
            {partner.verifiedBadge && partner.verifiedBadge !== "NONE" && (
              <VerifiedBadge badge={partner.verifiedBadge} size={14} />
            )}
          </div>
          <div className="mt-0.5 flex items-center justify-center gap-1.5 text-xs text-muted">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                isOnline ? "bg-success" : "bg-muted/40",
              )}
            />
            {isOnline
              ? "Online"
              : partner.lastSeenAt
                ? `Last seen ${relativeTime(partner.lastSeenAt)}`
                : "Offline"}
          </div>
        </div>
        {!isOfficialThread && (
          <Link
            href={`/seller/${partner.username ?? partner.id}`}
            className="mt-1 flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition"
          >
            View Profile
          </Link>
        )}
      </div>

      <hr className="border-surface-border" />

      {/* Trust score */}
      {stats && !isOfficialThread && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Trust Score</p>
          <div className="rounded-xl border border-surface-border bg-surface p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">{stats.deals}</p>
                <p className="text-[10px] uppercase text-muted">Deals</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  ${stats.volume >= 1000 ? `${(stats.volume / 1000).toFixed(1)}k` : stats.volume.toFixed(0)}
                </p>
                <p className="text-[10px] uppercase text-muted">Volume</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{stats.reviews}</p>
                <p className="text-[10px] uppercase text-muted">Reviews</p>
              </div>
            </div>
            {stats.deals === 0 && (
              <p className="mt-2 text-center text-[11px] text-muted">No reviews yet</p>
            )}
          </div>
        </div>
      )}

      {/* Active listings */}
      {stats && !isOfficialThread && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Active Listings
            <span className="ml-1.5 rounded-full bg-brand-500/10 px-1.5 py-0.5 text-[10px] text-brand-600">
              {stats.activeListings}
            </span>
          </p>
          {stats.activeListings === 0 ? (
            <p className="text-xs text-muted">No active listings</p>
          ) : (
            <Link
              href={`/listings?seller=${partner.username ?? partner.id}`}
              className="text-xs text-brand-600 hover:underline"
            >
              View listings →
            </Link>
          )}
        </div>
      )}

      {/* Active escrow */}
      {escrow && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Active Escrow</p>
          <Link
            href={`/dashboard/escrows/${escrow.id}`}
            className="block rounded-xl border border-surface-border bg-surface p-3 hover:bg-brand-500/8 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium truncate">{escrow.listing.title}</p>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  ESCROW_STATUS_COLOR[escrow.status] ?? "bg-muted/10 text-muted",
                )}
              >
                {escrow.status}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted">{escrow.listing.platform}</p>
            {(escrow.countdownEndsAt ?? escrow.transferDeadline) && (
              <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
                {countdownLabel((escrow.countdownEndsAt ?? escrow.transferDeadline)!)}
              </p>
            )}
          </Link>
        </div>
      )}

    </div>
  );
}
