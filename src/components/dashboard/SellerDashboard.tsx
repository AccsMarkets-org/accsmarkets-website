import Link from "next/link";
import Image from "next/image";
import { Decimal } from "@prisma/client/runtime/library";
import { formatCurrency, countryName } from "@/lib/utils";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { Card } from "@/components/ui/Card";
import { getTrustTier } from "@/lib/constants";
import {
  AnimatedSection,
  AnimatedKpiCard,
  NotificationFeed,
  GoalProgress,
  DateRangePicker,
} from "@/app/(dashboard)/dashboard/DashboardClient";
import { ListingViewsChart } from "@/components/ui/ListingViewsChart";
import { ArrowRight, Eye, Globe, Handshake, KeyRound, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";

// ── Local helpers ─────────────────────────────────────────────────────────────

const PLATFORM_LABEL: Record<string, string> = {
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  FACEBOOK: "Facebook",
  TELEGRAM: "Telegram",
  TWITTER_X: "Twitter/X",
  SNAPCHAT: "Snapchat",
  PINTEREST: "Pinterest",
  LINKEDIN: "LinkedIn",
  WEBSITE: "Website",
};

const PLATFORM_COLOR: Record<string, string> = {
  YOUTUBE: "#FF0000",
  INSTAGRAM: "#E1306C",
  TIKTOK: "#010101",
  FACEBOOK: "#1877F2",
  TELEGRAM: "#2AABEE",
  TWITTER_X: "#000000",
  SNAPCHAT: "#FFFC00",
  PINTEREST: "#E60023",
  LINKEDIN: "#0077B5",
  WEBSITE: "#10B981",
};

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "bg-success/10 text-success",
    COMPLETED: "bg-success/10 text-success",
    PENDING: "bg-warning/10 text-warning",
    DRAFT: "bg-surface-border text-muted",
    SUSPENDED: "bg-danger/10 text-danger",
    REJECTED: "bg-danger/10 text-danger",
    FUNDED: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400",
    IN_TRANSFER: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400",
    SUBMITTED: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400",
    VERIFIED: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400",
  };
  return map[status] ?? "bg-surface-border text-muted";
}

function txSign(type: string): string {
  return ["DEPOSIT", "ESCROW_RELEASE", "WALLET_CREDIT", "REFUND"].includes(type) ? "+" : "−";
}

function txColor(type: string): string {
  if (["DEPOSIT", "ESCROW_RELEASE", "WALLET_CREDIT", "REFUND"].includes(type)) return "text-success";
  if (["WITHDRAWAL", "PLATFORM_FEE", "ESCROW_PAYMENT", "WALLET_DEBIT"].includes(type)) return "text-danger";
  return "text-muted";
}

const TX_LABEL: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  ESCROW_PAYMENT: "Escrow held",
  ESCROW_RELEASE: "Escrow released",
  PLATFORM_FEE: "Platform fee",
  REFUND: "Refund",
  WALLET_CREDIT: "Credit",
  WALLET_DEBIT: "Debit",
  PROMOTION: "Promotion",
  BUMP: "Bump",
  SUBSCRIPTION: "Subscription",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface SellerDashboardProps {
  userId: string;
  user: {
    name: string | null;
    image: string | null;
    walletBalance: Decimal;
    trustScore: number;
    primaryIntent: string | null;
    createdAt: Date;
    kycLevel: string;
  };
  walletValue: number;
  earned: number;
  e30: number;
  earnTrend: number | null;
  viewTrend: number | null;
  totalViews: number;
  views7d: number;
  viewSeries: number[];
  dayKeys: string[];
  countryRows: Array<{ code: string; count: number }>;
  topCountry: { code: string; count: number } | null;
  activeListings: number;
  totalListings: number;
  completedEscrows: number;
  totalOffers: number;
  platforms: Array<{ key: string; label: string; color: string; count: number; pct: number }>;
  recentListings: Array<{
    id: string;
    title: string;
    platform: string;
    price: Decimal;
    status: string;
    viewCount: number;
    createdAt: Date;
  }>;
  recentEscrows: Array<{
    id: string;
    status: string;
    amount: Decimal;
    createdAt: Date;
    listing: { title: string; platform: string };
    buyer: { id: string; name: string | null };
    seller: { id: string; name: string | null };
  }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    status: string;
    amount: Decimal;
    createdAt: Date;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    body: string | null;
    type: string;
    createdAt: Date;
  }>;
  pendingOffers: number | bigint;
  activeEscrows: number | bigint;
  unreadMessages: number | bigint;
  unreadNotifications: number | bigint;
  followerCount: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SellerDashboard({
  userId,
  user,
  walletValue,
  earned,
  e30,
  earnTrend,
  viewTrend,
  totalViews,
  views7d,
  viewSeries,
  dayKeys,
  countryRows,
  topCountry,
  activeListings,
  totalListings,
  completedEscrows,
  totalOffers,
  platforms,
  recentListings,
  recentEscrows,
  recentTransactions,
  notifications,
  pendingOffers,
  activeEscrows,
  unreadMessages,
  unreadNotifications,
  followerCount,
}: SellerDashboardProps) {
  const now = new Date();
  const memberDays = Math.floor((now.getTime() - new Date(user.createdAt).getTime()) / 86400_000);
  const tier = getTrustTier(user.trustScore);
  const maxCountryCount = countryRows[0]?.count ?? 1;
  const nextDealMilestone =
    completedEscrows < 5
      ? 5
      : completedEscrows < 10
      ? 10
      : completedEscrows < 25
      ? 25
      : 50;
  const needsKyc =
    (user.primaryIntent === "SELLER" || user.primaryIntent === "BOTH") &&
    (user.kycLevel === "NONE" || user.kycLevel === "EMAIL");

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* ── Seller KYC banner ───────────────────────────────────────────────── */}
      {needsKyc && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <KeyRound className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-300">Complete KYC verification to start selling</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed dark:text-amber-400">
                Your account is registered as a <strong>Seller</strong>. Verify your phone + ID to post
                listings and accept escrow payments. Buyers can skip this step.
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-amber-700 dark:text-amber-400">
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Email verified
                </span>
                <span className="flex items-center gap-1 opacity-50">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Phone — pending
                </span>
                <span className="flex items-center gap-1 opacity-50">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  ID — pending
                </span>
              </div>
            </div>
          </div>
          <a
            href="/dashboard/settings/verification"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition"
          >
            Verify now
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <AnimatedSection delay={0}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {user.image ? (
              <Image
                src={user.image}
                alt="avatar"
                width={52}
                height={52}
                className="h-13 w-13 rounded-full object-cover border-2 border-surface-border shrink-0"
              />
            ) : (
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-600 dark:bg-brand-900/50 dark:text-brand-400">
                {user.name?.slice(0, 1).toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold leading-tight text-foreground">
                {user.name?.split(" ")[0] ?? "Welcome back"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className={`font-semibold ${tier.className}`}>{tier.label}</span>
                <span>·</span>
                <span>{user.trustScore}/100 trust</span>
                <span>·</span>
                <span>{memberDays}d member</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(Number(unreadMessages) > 0 || Number(unreadNotifications) > 0) && (
              <div className="flex items-center gap-2">
                {Number(unreadMessages) > 0 && (
                  <Link
                    href="/dashboard/messages"
                    className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand-300 transition"
                  >
                    <svg
                      className="h-3.5 w-3.5 text-brand-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    {Number(unreadMessages)} unread
                  </Link>
                )}
                {Number(unreadNotifications) > 0 && (
                  <Link
                    href="/dashboard/notifications"
                    className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand-300 transition"
                  >
                    <svg
                      className="h-3.5 w-3.5 text-brand-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                    {Number(unreadNotifications)} new
                  </Link>
                )}
              </div>
            )}
            <Link
              href="/dashboard/listings/new"
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition shadow-sm"
            >
              + New listing
            </Link>
          </div>
        </div>
      </AnimatedSection>

      {/* ── KPI Row 1: animated counter cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Link href="/dashboard/wallet">
          <AnimatedKpiCard
            label="Wallet balance"
            value={walletValue}
            prefix="$"
            sub="Available funds"
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <path d="M1 10h22" />
              </svg>
            }
            color="text-brand-600 dark:text-brand-400"
            bg="bg-brand-500/10"
            delay={0.05}
          />
        </Link>
        <Link href="/dashboard/wallet">
          <AnimatedKpiCard
            label="Total earned"
            value={earned}
            prefix="$"
            sub={
              earnTrend !== null
                ? `${earnTrend >= 0 ? "+" : "-"}${Math.abs(earnTrend)}% vs last 30d`
                : "All-time escrow releases"
            }
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
            color="text-green-600 dark:text-green-400"
            bg="bg-green-50 dark:bg-green-950/40"
            trend={earnTrend}
            delay={0.1}
          />
        </Link>
        <Link href="/dashboard/listings">
          <AnimatedKpiCard
            label="Active listings"
            value={activeListings}
            suffix={` / ${totalListings}`}
            sub="Active / total"
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="9" y1="16" x2="13" y2="16" />
              </svg>
            }
            color="text-amber-600 dark:text-amber-400"
            bg="bg-amber-50 dark:bg-amber-950/40"
            delay={0.15}
          />
        </Link>
        <Link href="/dashboard/escrows">
          <AnimatedKpiCard
            label="Deals closed"
            value={completedEscrows}
            sub={`${totalOffers} total offers`}
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
            color="text-purple-600 dark:text-purple-400"
            bg="bg-purple-50 dark:bg-purple-950/40"
            delay={0.2}
          />
        </Link>
        {/* Followers KPI card */}
        <div>
          <AnimatedKpiCard
            label="Followers"
            value={followerCount}
            sub="your seller followers"
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
            color="text-rose-600 dark:text-rose-400"
            bg="bg-rose-50 dark:bg-rose-950/40"
            delay={0.25}
          />
        </div>
      </div>

      {/* ── KPI Row 2: urgency tiles ────────────────────────────────────────── */}
      <AnimatedSection delay={0.15}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              label: "Pending offers",
              value: pendingOffers,
              href: "/dashboard/offers",
              urgent: Number(pendingOffers) > 0,
              icon: Handshake,
            },
            {
              label: "Active escrows",
              value: activeEscrows,
              href: "/dashboard/escrows",
              urgent: Number(activeEscrows) > 0,
              icon: ShieldCheck,
            },
            {
              label: "Listing views (30d)",
              value: totalViews,
              href: "/dashboard/listings",
              urgent: false,
              icon: Eye,
              trend: viewTrend,
            },
          ].map((item) => (
            <Link key={item.label} href={item.href}>
              <div
                className={`flex items-center gap-3 rounded-2xl border p-4 transition hover:shadow-sm ${
                  item.urgent ? "border-warning/40 bg-warning/5" : "border-surface-border bg-surface"
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.urgent ? "bg-warning/15 text-warning" : "bg-brand-500/10 text-brand-600 dark:text-brand-400"}`}>
                  <item.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none text-foreground">
                    {Number(item.value).toLocaleString()}
                    {"trend" in item && item.trend !== null && item.trend !== undefined && (
                      <span
                        className={`ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium ${
                          item.trend >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {item.trend >= 0 ? <TrendingUp className="h-3 w-3" aria-hidden /> : <TrendingDown className="h-3 w-3" aria-hidden />}
                        {Math.abs(item.trend)}%
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">{item.label}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </AnimatedSection>

      {/* ── Main 3-col grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* LEFT — listing views chart + recent listings */}
        <div className="flex flex-col gap-6 lg:col-span-2">

          {/* Listing Analytics card */}
          <AnimatedSection delay={0.2}>
            <div className="rounded-2xl border border-surface-border bg-background overflow-hidden shadow-sm">
              {/* Card header */}
              <div className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-200 dark:border-brand-800">
                    <svg
                      className="h-[18px] w-[18px] text-brand-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Listing Analytics</p>
                    <p className="text-xs text-muted">Unique visitor views per listing</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Last 30 days
                </div>
              </div>

              {/* Stats boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-surface-border border-b border-surface-border">
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Total Views</p>
                  <p className="text-3xl font-black leading-none text-foreground">
                    {totalViews.toLocaleString()}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted">all time unique</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Last 7 Days</p>
                  <p className="text-3xl font-black leading-none text-foreground">
                    {views7d.toLocaleString()}
                  </p>
                  {viewTrend !== null ? (
                    <p
                      className={`mt-1.5 text-[11px] font-semibold flex items-center gap-1 ${
                        viewTrend >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        {viewTrend >= 0 ? <TrendingUp className="h-3 w-3" aria-hidden /> : <TrendingDown className="h-3 w-3" aria-hidden />}
                        {Math.abs(viewTrend)}%
                      </span>
                      <span className="font-normal text-muted">vs prev 7d</span>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-muted">vs prev week</p>
                  )}
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Top Country</p>
                  {topCountry ? (
                    <>
                      <p className="text-xl font-black leading-none text-foreground flex items-center gap-1.5">
                        <CountryFlag code={topCountry.code} className="w-7 h-auto rounded-sm shadow-sm" />
                        {countryName(topCountry.code)}
                      </p>
                      <p className="mt-1.5 text-[11px] text-muted">{topCountry.count} views</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-black leading-none text-muted">—</p>
                      <p className="mt-1.5 text-[11px] text-muted">tracking new visits</p>
                    </>
                  )}
                </div>
              </div>

              {/* Chart + country breakdown */}
              <div className="flex">
                {/* Area chart */}
                <div className="flex-1 min-w-0 px-3 py-3">
                  <ListingViewsChart points={viewSeries} days={dayKeys} />
                </div>

                {/* Country breakdown — hidden on mobile to avoid crushing the chart */}
                <div className="hidden md:block w-56 shrink-0 border-l border-surface-border px-5 py-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">
                    Visitors by Country
                  </p>
                  {countryRows.length > 0 ? (
                    <div className="flex flex-col gap-2.5">
                      {countryRows.map((row) => (
                        <div key={row.code} className="flex items-center gap-2">
                          <CountryFlag code={row.code} className="w-6 h-auto rounded-sm shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-semibold text-foreground truncate">
                                {countryName(row.code)}
                              </span>
                              <span className="text-[11px] font-bold text-foreground ml-1.5 shrink-0">
                                {row.count}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                              <div
                                className="h-1.5 rounded-full bg-brand-500 transition-all"
                                style={{
                                  width: `${Math.round((row.count / maxCountryCount) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {[90, 65, 42, 25, 14].map((w, i) => (
                        <div key={i} className="flex items-center gap-2 opacity-40">
                          <Globe className="h-5 w-6 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
                          <div className="flex-1 min-w-0">
                            <div className="mb-1 h-2 rounded bg-surface-border" style={{ width: `${w}%` }} />
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border" />
                          </div>
                        </div>
                      ))}
                      <p className="mt-1 text-[10px] text-muted leading-snug">
                        Country data populates as visitors arrive from new locations
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer: earned */}
              <div className="flex items-center justify-between border-t border-surface-border bg-surface/50 px-5 py-3">
                <p className="text-xs text-muted">Revenue this period</p>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-muted mr-2">Earned (30d)</span>
                    <span className={`text-sm font-bold ${e30 > 0 ? "text-success" : "text-foreground"}`}>
                      {formatCurrency(String(e30))}
                    </span>
                  </div>
                  {earnTrend !== null && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                        earnTrend >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {earnTrend >= 0 ? <TrendingUp className="h-3 w-3" aria-hidden /> : <TrendingDown className="h-3 w-3" aria-hidden />}
                      {Math.abs(earnTrend)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Revenue breakdown */}
          <AnimatedSection delay={0.25}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card className="flex flex-col items-center gap-1.5 text-center">
                <p className="text-xs text-muted">Earned (30d)</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(String(e30))}</p>
                <p className="text-[10px] text-muted">from completed escrows</p>
              </Card>
              <Card className="flex flex-col items-center gap-1.5 text-center">
                <p className="text-xs text-muted">All-time earnings</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(String(earned))}</p>
                <p className="text-[10px] text-muted">{completedEscrows} deals released</p>
              </Card>
              <Card className="flex flex-col items-center gap-1.5 text-center">
                <p className="text-xs text-muted">Net balance</p>
                <p className="text-2xl font-bold text-brand-600">{formatCurrency(String(walletValue))}</p>
                <p className="text-[10px] text-muted">available to withdraw</p>
              </Card>
            </div>
          </AnimatedSection>

          {/* Recent listings table */}
          <AnimatedSection delay={0.3}>
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">Your listings</h2>
                  <p className="text-xs text-muted">
                    {totalListings} total · {activeListings} active
                  </p>
                </div>
                <Link
                  href="/dashboard/listings"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand-300 hover:text-brand-600 transition"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>

              {recentListings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-surface-border py-12 text-center">
                  <p className="text-sm text-muted">No listings yet.</p>
                  <Link
                    href="/dashboard/listings/new"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
                  >
                    Create your first listing
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-surface-border">
                  {recentListings.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 py-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
                        style={{
                          backgroundColor: PLATFORM_COLOR[l.platform] ?? "#888",
                        }}
                      >
                        {(PLATFORM_LABEL[l.platform] ?? l.platform).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/dashboard/listings/${l.id}/edit`}
                          className="truncate text-sm font-medium text-foreground hover:text-brand-600 transition block"
                        >
                          {l.title}
                        </Link>
                        <p className="text-[11px] text-muted">
                          {l.viewCount} views ·{" "}
                          {new Date(l.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(l.price.toString())}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(l.status)}`}
                        >
                          {l.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </AnimatedSection>

          {/* Recent escrows */}
          {recentEscrows.length > 0 && (
            <AnimatedSection delay={0.35}>
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold text-foreground">Recent escrows</h2>
                  <Link
                    href="/dashboard/escrows"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand-300 hover:text-brand-600 transition"
                  >
                    View all
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
                <div className="flex flex-col divide-y divide-surface-border">
                  {recentEscrows.map((e) => {
                    const isBuyer = e.buyer.id === userId;
                    return (
                      <div key={e.id} className="flex items-center gap-3 py-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            isBuyer ? "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400" : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                          }`}
                        >
                          {isBuyer ? "B" : "S"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{e.listing.title}</p>
                          <p className="text-[11px] text-muted">
                            {isBuyer ? `Seller: ${e.seller.name ?? "Unknown"}` : `Buyer: ${e.buyer.name ?? "Unknown"}`} ·{" "}
                            {new Date(e.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <p className="text-sm font-bold text-foreground">
                            {formatCurrency(e.amount.toString())}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(e.status)}`}
                          >
                            {e.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </AnimatedSection>
          )}
        </div>

        {/* RIGHT — sidebar cards */}
        <div className="flex flex-col gap-6">

          {/* Notification feed */}
          <AnimatedSection delay={0.2}>
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Notifications</h2>
                <Link href="/dashboard/notifications" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
              <NotificationFeed
                items={notifications.map((n) => ({
                  id: n.id,
                  title: n.title,
                  body: n.body ?? "",
                  type: n.type,
                  createdAt: n.createdAt.toISOString(),
                }))}
              />
            </Card>
          </AnimatedSection>

          {/* Goal progress / milestones */}
          <AnimatedSection delay={0.25}>
            <Card>
              <h2 className="mb-3 font-semibold text-foreground">Milestones</h2>
              <div className="flex flex-col gap-4">
                <GoalProgress
                  label={`${nextDealMilestone} Deals badge`}
                  current={completedEscrows}
                  target={nextDealMilestone}
                  icon={
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  }
                />
                <GoalProgress
                  label="Trust score 80+"
                  current={user.trustScore}
                  target={80}
                  icon={
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  }
                />
                <GoalProgress
                  label="100 listing views"
                  current={Math.min(totalViews, 100)}
                  target={100}
                  icon={
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  }
                />
                <GoalProgress
                  label="10 seller followers"
                  current={Math.min(followerCount, 10)}
                  target={10}
                  icon={
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  }
                />
              </div>
            </Card>
          </AnimatedSection>

          {/* Quick actions */}
          <AnimatedSection delay={0.3}>
            <Card>
              <h2 className="mb-3 font-semibold text-foreground">Quick actions</h2>
              <div className="flex flex-col gap-2">
                <Link
                  href="/dashboard/listings/new"
                  className="rounded-xl bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600 transition shadow-sm"
                >
                  + Create listing
                </Link>
                <Link
                  href="/listings"
                  className="rounded-xl border border-surface-border px-4 py-2.5 text-center text-sm font-medium text-foreground hover:border-brand-300 hover:bg-brand-500/8 transition"
                >
                  Browse marketplace
                </Link>
                <Link
                  href="/dashboard/wallet/deposit"
                  className="rounded-xl border border-surface-border px-4 py-2.5 text-center text-sm font-medium text-foreground hover:border-brand-300 hover:bg-brand-500/8 transition"
                >
                  Add funds
                </Link>
                <Link
                  href="/dashboard/wallet/withdraw"
                  className="rounded-xl border border-surface-border px-4 py-2.5 text-center text-sm font-medium text-foreground hover:border-brand-300 hover:bg-brand-500/8 transition"
                >
                  Withdraw earnings
                </Link>
                <Link
                  href="/dashboard/wanted"
                  className="rounded-xl border border-surface-border px-4 py-2.5 text-center text-sm font-medium text-foreground hover:border-brand-300 hover:bg-brand-500/8 transition"
                >
                  Post wanted
                </Link>
                <Link
                  href="/dashboard/referrals"
                  className="rounded-xl border border-surface-border px-4 py-2.5 text-center text-sm font-medium text-foreground hover:border-brand-300 hover:bg-brand-500/8 transition"
                >
                  Invite &amp; earn
                </Link>
              </div>
            </Card>
          </AnimatedSection>

          {/* Platform breakdown */}
          {platforms.length > 0 && (
            <AnimatedSection delay={0.35}>
              <Card>
                <h2 className="mb-3 font-semibold text-foreground">Listings by platform</h2>
                <div className="flex flex-col gap-3">
                  {platforms.map((p) => (
                    <div key={p.key}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{p.label}</span>
                        <span className="text-muted">
                          {p.count} ({p.pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${p.pct}%`, backgroundColor: p.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </AnimatedSection>
          )}

          {/* Account health */}
          <AnimatedSection delay={0.4}>
            <Card>
              <h2 className="mb-3 font-semibold text-foreground">Account health</h2>
              <div className="flex flex-col gap-3">
                {/* Trust score */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">Trust score</span>
                    <span className={`font-bold ${tier.className}`}>
                      {user.trustScore}/100 · {tier.label}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        user.trustScore >= 70
                          ? "bg-success"
                          : user.trustScore >= 40
                          ? "bg-warning"
                          : "bg-danger"
                      }`}
                      style={{ width: `${user.trustScore}%` }}
                    />
                  </div>
                </div>
                {/* Deals completed */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">Deals completed</span>
                    <span className="font-medium text-foreground">{completedEscrows}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                    <div
                      className="h-1.5 rounded-full bg-brand-500 transition-all"
                      style={{ width: `${Math.min(completedEscrows * 5, 100)}%` }}
                    />
                  </div>
                </div>
                {/* Listing utilization */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">Listing utilization</span>
                    <span className="font-medium text-foreground">
                      {totalListings === 0
                        ? "0%"
                        : `${Math.round((activeListings / totalListings) * 100)}%`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                    <div
                      className="h-1.5 rounded-full bg-amber-500 transition-all"
                      style={{
                        width:
                          totalListings === 0
                            ? "0%"
                            : `${Math.round((activeListings / totalListings) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                {/* Followers */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">Seller followers</span>
                    <span className="font-medium text-foreground">
                      {followerCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                    <div
                      className="h-1.5 rounded-full bg-rose-400 transition-all"
                      style={{ width: `${Math.min(followerCount * 2, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <Link
                href="/dashboard/settings/verification"
                className="mt-4 flex items-center justify-between rounded-xl border border-surface-border px-3 py-2 text-xs text-muted hover:border-brand-300 hover:text-foreground transition"
              >
                <span>Verification &amp; badges</span>
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </Card>
          </AnimatedSection>

          {/* Recent transactions */}
          <AnimatedSection delay={0.45}>
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Transactions</h2>
                <Link href="/dashboard/wallet" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                  Wallet
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
              {recentTransactions.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">No transactions yet.</p>
              ) : (
                <div className="flex flex-col divide-y divide-surface-border">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-2.5 py-2.5">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface text-xs font-bold ${txColor(tx.type)}`}
                      >
                        {txSign(tx.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground leading-tight">
                          {TX_LABEL[tx.type] ?? tx.type}
                        </p>
                        <p className="text-[10px] text-muted">
                          {new Date(tx.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <p className={`shrink-0 text-sm font-bold ${txColor(tx.type)}`}>
                        {txSign(tx.type)}
                        {formatCurrency(tx.amount.toString())}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </AnimatedSection>

        </div>
      </div>
    </div>
  );
}
