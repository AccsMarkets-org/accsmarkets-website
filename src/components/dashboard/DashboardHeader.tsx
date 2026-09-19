"use client";

import Image from "next/image";
import Link from "next/link";
import { DashboardViewToggle } from "./DashboardViewToggle";

interface DashboardHeaderProps {
  name: string | null;
  image: string | null;
  trustScore: number;
  tierLabel: string;
  tierClassName: string;
  memberDays: number;
  subscriptionPlanId: string | null;
  unreadMessages: number;
  unreadNotifications: number;
  showPrimaryIntent: string | null;
  showViewToggle: boolean;
  defaultView?: "BUYER" | "SELLER";
}

function TrustScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex h-10 w-10 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="40" height="40" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-surface-border"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-brand-500 transition-all duration-500"
        />
      </svg>
      <span className="relative text-[10px] font-bold text-foreground">{clamped}</span>
    </div>
  );
}

function Initials({ name }: { name: string | null }) {
  if (!name) return <span className="text-sm font-bold text-brand-500">?</span>;
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  return <span className="text-sm font-bold text-brand-500">{initials}</span>;
}

const PLAN_LABEL: Record<string, { label: string; className: string }> = {
  STARTER:  { label: "Starter",  className: "bg-surface-border text-muted" },
  PRO:      { label: "Pro",      className: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400" },
  BUSINESS: { label: "Business", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
};

export function DashboardHeader({
  name,
  image,
  trustScore,
  tierLabel,
  tierClassName,
  memberDays,
  subscriptionPlanId,
  unreadMessages,
  unreadNotifications,
  showPrimaryIntent,
  showViewToggle,
  defaultView,
}: DashboardHeaderProps) {
  const plan = subscriptionPlanId ? (PLAN_LABEL[subscriptionPlanId] ?? null) : null;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: avatar + name + meta */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative h-12 w-12 flex-shrink-0">
          {image ? (
            <Image
              src={image}
              alt={name ?? "Avatar"}
              fill
              className="rounded-full object-cover ring-2 ring-brand-500/20"
              sizes="48px"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 ring-2 ring-brand-500/20">
              <Initials name={name} />
            </div>
          )}
          {/* Online dot */}
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-success" />
        </div>

        {/* Name + badges */}
        <div className="min-w-0">
          <p className="text-xs text-muted">
            {greeting}
            {showPrimaryIntent ? `, ${showPrimaryIntent}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="truncate text-base font-bold text-foreground leading-tight">
              {name ?? "User"}
            </h1>

            {/* Tier badge */}
            <span
              className={[
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                tierClassName,
              ].join(" ")}
            >
              {tierLabel}
            </span>

            {/* Subscription plan badge */}
            {plan && (
              <span
                className={[
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  plan.className,
                ].join(" ")}
              >
                {plan.label}
              </span>
            )}
          </div>

          {/* Member days + trust score inline */}
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
            <span>
              Member{" "}
              {memberDays < 365
                ? `${memberDays}d`
                : `${Math.floor(memberDays / 365)}y`}
            </span>
            <span className="text-muted">·</span>
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Trust {trustScore}
            </span>
          </div>
        </div>

        {/* Trust score ring (desktop only) */}
        <div className="hidden sm:block ml-1">
          <TrustScoreRing score={trustScore} />
        </div>
      </div>

      {/* Right: view toggle + notification badges */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Unread messages badge */}
        {unreadMessages > 0 && (
          <Link
            href="/dashboard/messages"
            className="relative flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-brand-500/8 hover:text-brand-600 transition"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span className="hidden sm:inline">Messages</span>
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
              {unreadMessages > 99 ? "99+" : unreadMessages}
            </span>
          </Link>
        )}

        {/* Unread notifications badge */}
        {unreadNotifications > 0 && (
          <Link
            href="/dashboard/notifications"
            className="relative flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-brand-500/8 hover:text-brand-600 transition"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span className="hidden sm:inline">Alerts</span>
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </span>
          </Link>
        )}

        {/* View toggle */}
        {showViewToggle && defaultView && (
          <DashboardViewToggle defaultView={defaultView} />
        )}
      </div>
    </div>
  );
}
