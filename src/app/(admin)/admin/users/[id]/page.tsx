import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, BadgeCheck, Check, CircleDollarSign, Crown, Flame, Gem, Medal,
  ShieldCheck, Sparkles, Star, Trophy, X, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { LISTING_STATUS_STYLE } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { AdminUserProfileEditor } from "@/components/admin/AdminUserProfileEditor";
import { AdminSendMessageButton } from "@/components/admin/AdminSendMessageButton";

const TABS = ["overview", "listings", "escrows", "transactions", "reviews", "audit"] as const;
type Tab = (typeof TABS)[number];

const BADGE_META: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  RISING_STAR:    { label: "Rising Star",      color: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800",         icon: Sparkles },
  POWER_SELLER:   { label: "Power Seller",     color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800", icon: Flame },
  TOP_SELLER:     { label: "Top Seller",       color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",  icon: Trophy },
  LEGEND:         { label: "Legend",           color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800", icon: Crown },
  BIG_EARNER:     { label: "Big Earner",       color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", icon: CircleDollarSign },
  WHALE:          { label: "Whale",            color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",    icon: Gem },
  FIVE_STAR_SELLER: { label: "5-Star Seller",  color: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800", icon: Star },
  FAST_RESPONDER: { label: "Fast Responder",   color: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800",    icon: Zap },
  TRUSTED_SELLER: { label: "Trusted Seller",   color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800", icon: ShieldCheck },
};

const VERIFIED_BADGE_META: Record<string, { label: string; color: string; check?: boolean }> = {
  NONE:     { label: "None",     color: "bg-surface text-muted border-surface-border" },
  BLUE:     { label: "Blue",     color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800", check: true },
  GOLD:     { label: "Gold",     color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800", check: true },
  GREY:     { label: "Grey",     color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700", check: true },
  OFFICIAL: { label: "Official", color: "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 border-brand-200 dark:border-brand-800" },
};

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const tab = (TABS.includes(searchParams.tab as Tab) ? searchParams.tab : "overview") as Tab;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      achievementBadges: true,
      listings:        { orderBy: { createdAt: "desc" }, take: 20 },
      escrowsAsBuyer:  { include: { listing: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
      escrowsAsSeller: { include: { listing: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
      transactions:    { orderBy: { createdAt: "desc" }, take: 20 },
      reviewsReceived: { include: { reviewer: { select: { username: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
      auditLogs:       { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!user) notFound();

  const avgRating =
    user.reviewsReceived.length > 0
      ? (user.reviewsReceived.reduce((s, r) => s + r.rating, 0) / user.reviewsReceived.length).toFixed(1)
      : null;

  const trustPct = Math.min(100, Math.max(0, user.trustScore));
  const trustColor = trustPct >= 70 ? "bg-success" : trustPct >= 40 ? "bg-warning" : "bg-danger";
  const badgeMeta = VERIFIED_BADGE_META[user.verifiedBadge] ?? VERIFIED_BADGE_META.NONE;
  const initials = (user.name ?? user.username ?? user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-gradient-to-br from-brand-50 via-white to-white dark:from-brand-950/30 dark:via-background dark:to-background">
        <div className="flex flex-wrap items-start gap-4 p-4 sm:p-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-2xl font-black text-white shadow-lg shadow-brand-500/20">
              {user.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={user.image} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : initials}
            </div>
            {user.isBanned && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[9px] text-white font-bold shadow" role="img" aria-label="Banned"><X className="h-3 w-3" strokeWidth={3} aria-hidden /></span>
            )}
          </div>

          {/* Name block */}
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-foreground truncate">{user.name ?? user.username ?? "—"}</h1>
              <VerifiedBadge badge={user.verifiedBadge} size={18} />
              {user.role === "ADMIN" && (
                <span className="rounded-full bg-brand-950 px-2 py-0.5 text-[10px] font-bold text-brand-100">ADMIN</span>
              )}
              {user.isBanned && (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger border border-danger/20">BANNED</span>
              )}
            </div>
            <p className="text-sm text-muted truncate">
              @{user.username ?? "no-username"} · {user.email}
            </p>
            <p className="text-xs text-muted">Joined {formatDate(user.createdAt)} · Last seen {user.lastSeenAt ? formatDate(user.lastSeenAt) : "never"}</p>

            {/* Badge row */}
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", badgeMeta.color)}>
                {badgeMeta.check && <BadgeCheck className="h-3.5 w-3.5" aria-hidden />}
                {badgeMeta.label} badge
              </span>
              <span className="flex items-center gap-1 rounded-full border border-surface-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
                KYC: {user.kycLevel}
              </span>
              <span className="flex items-center gap-1 rounded-full border border-surface-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
                {user.subscriptionPlanId ?? "Free"}
              </span>
            </div>
          </div>

          {/* Stats tiles */}
          <div className="flex shrink-0 flex-wrap gap-2">
            {[
              { label: "Balance",    value: formatCurrency(user.walletBalance.toString()), green: true },
              { label: "Listings",   value: user.listings.length },
              { label: "Reviews",    value: user.reviewsReceived.length },
              { label: "Avg rating", value: avgRating ? (
                <span className="inline-flex items-center gap-1">
                  {avgRating}
                  <Star className="h-4 w-4 fill-current text-amber-500" aria-hidden />
                </span>
              ) : "—" },
            ].map((s) => (
              <div key={s.label} className="flex min-w-[72px] flex-col items-center rounded-xl border border-surface-border bg-white dark:bg-surface px-3 py-2 text-center shadow-sm">
                <p className={cn("text-base font-black", s.green ? "text-success" : "text-foreground")}>{s.value}</p>
                <p className="text-[10px] text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust score bar */}
        <div className="border-t border-surface-border px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted w-20 shrink-0">Trust score</span>
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-surface-border">
              <div className={cn("h-full rounded-full transition-all", trustColor)} style={{ width: `${trustPct}%` }} />
            </div>
            <span className="text-xs font-bold text-foreground w-8 text-right">{trustPct}</span>
          </div>
        </div>
      </div>

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/users" className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand-200 hover:text-foreground">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          All users
        </Link>
        <AdminSendMessageButton userId={user.id} userName={user.name ?? user.username ?? user.email ?? "user"} />
        <AdminActionButtons
          endpoint={`/api/admin/users/${user.id}`}
          actions={[
            user.isBanned
              ? { label: "Unban", action: "unban", variant: "secondary" }
              : { label: "Ban", action: "ban", variant: "danger", promptReason: true, confirm: "Ban this user?" },
            { label: "Adjust balance", action: "adjust_balance", promptAmount: true, promptReason: true },
            { label: "Set badge",      action: "set_badge",      promptBadge: true },
            { label: "Award achievement", action: "award_achievement_badge", promptAchievementBadge: true },
            { label: "Revoke achievement", action: "revoke_achievement_badge", promptAchievementBadge: true },
          ]}
        />
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-surface p-1 w-fit">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/users/${user.id}?tab=${t}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition",
              t === tab ? "bg-brand-500 text-white shadow-sm" : "text-muted hover:text-foreground",
            )}
          >
            {t}
          </Link>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Profile editor */}
          <div className="lg:col-span-2">
            <AdminUserProfileEditor userId={user.id} user={{
              username: user.username,
              email: user.email,
              name: user.name,
              bio: (user as any).bio ?? null,
            }} />
          </div>

          {/* Account card */}
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-bold text-foreground">
              <svg className="h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              Account
            </h2>
            <dl className="flex flex-col gap-2.5 text-sm">
              {[
                ["ID",          user.id],
                ["Email",       user.email],
                ["Username",    user.username ?? "—"],
                ["Name",        user.name ?? "—"],
                ["KYC level",   user.kycLevel],
                ["Role",        user.role],
                ["Wallet",      formatCurrency(user.walletBalance.toString())],
                ["Plan",        user.subscriptionPlanId ?? "Free"],
                ["Sub expires", user.subscriptionExpiresAt ? formatDate(user.subscriptionExpiresAt) : "—"],
                ["Banned",      user.isBanned ? `Yes — ${user.bannedReason ?? "no reason"}` : "No"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-2">
                  <dt className="text-muted shrink-0">{k}</dt>
                  <dd className="font-medium text-right break-all max-w-[60%] text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Achievement badges */}
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-bold text-foreground">
              <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Achievement badges
            </h2>
            {user.achievementBadges.length === 0 ? (
              <p className="text-sm text-muted">No achievement badges yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.achievementBadges.map((b) => {
                  const meta = BADGE_META[b.badge];
                  const BadgeIcon = meta?.icon ?? Medal;
                  return (
                    <span key={b.badge} className={cn("flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold", meta?.color ?? "bg-surface-border text-muted")}>
                      <BadgeIcon className="h-3.5 w-3.5" aria-hidden />
                      {meta?.label ?? b.badge}
                    </span>
                  );
                })}
              </div>
            )}

            {/* All possible badges */}
            <h3 className="mt-4 mb-2 text-xs font-semibold text-muted uppercase tracking-wide">All badges</h3>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(BADGE_META).map(([key, meta]) => {
                const has = user.achievementBadges.some((b) => b.badge === key);
                return (
                  <span key={key} className={cn(
                    "flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition",
                    has ? cn(meta.color, "shadow-sm") : "border-surface-border bg-surface text-muted opacity-50",
                  )}>
                    <meta.icon className="h-3.5 w-3.5" aria-hidden />
                    {meta.label}
                    {has && (
                      <>
                        <Check className="ml-0.5 h-3 w-3" strokeWidth={3} aria-hidden />
                        <span className="sr-only">earned</span>
                      </>
                    )}
                  </span>
                );
              })}
            </div>
          </Card>

          {/* Verified badge card */}
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-bold text-foreground">
              <svg className="h-4 w-4 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 12l2 2 4-4"/><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Verified badge
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(VERIFIED_BADGE_META).map(([key, meta]) => (
                <span key={key} className={cn(
                  "flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                  user.verifiedBadge === key ? cn(meta.color, "shadow-sm ring-1 ring-current ring-offset-1") : "border-surface-border bg-surface text-muted opacity-50",
                )}>
                  {meta.label}
                  {meta.check && <BadgeCheck className="h-3.5 w-3.5" aria-hidden />}
                  {user.verifiedBadge === key && (
                    <span className="ml-0.5 inline-flex items-center gap-1 text-[9px] font-black">
                      <ArrowLeft className="h-3 w-3" aria-hidden />
                      current
                    </span>
                  )}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Use "Set badge" above to change the verified badge.</p>
          </Card>

          {/* Stats */}
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-bold text-foreground">
              <svg className="h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Stats
            </h2>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: "Total listings",   value: user.listings.length },
                { label: "Active listings",  value: user.listings.filter((l) => l.status === "ACTIVE").length },
                { label: "Avg rating",       value: avgRating ? `${avgRating} / 5` : "—" },
                { label: "Reviews received", value: user.reviewsReceived.length },
                { label: "Escrows as buyer", value: user.escrowsAsBuyer.length },
                { label: "Escrows as seller",value: user.escrowsAsSeller.length },
                { label: "Transactions",     value: user.transactions.length },
                { label: "Achievements",     value: user.achievementBadges.length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-surface-border bg-surface px-3 py-2.5">
                  <p className="text-base font-black text-foreground">{value}</p>
                  <p className="text-[10px] text-muted">{label}</p>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}

      {/* ── Listings ─────────────────────────────────────────────────────── */}
      {tab === "listings" && (
        <div className="flex flex-col gap-2">
          {user.listings.map((l) => {
            const style = LISTING_STATUS_STYLE[l.status];
            return (
              <Card key={l.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/listings/${l.id}`} className="block truncate text-sm font-medium hover:underline">{l.title}</Link>
                  <p className="text-xs text-muted">{formatCurrency(l.price.toString())} · {formatDate(l.createdAt)}</p>
                </div>
                <StatusPill label={style.label} className={style.className} />
              </Card>
            );
          })}
          {user.listings.length === 0 && <p className="text-sm text-muted">No listings.</p>}
        </div>
      )}

      {/* ── Escrows ──────────────────────────────────────────────────────── */}
      {tab === "escrows" && (
        <div className="flex flex-col gap-3">
          {[...user.escrowsAsBuyer.map((e) => ({ ...e, role: "Buyer" })), ...user.escrowsAsSeller.map((e) => ({ ...e, role: "Seller" }))]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((e) => (
              <Card key={e.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link href={`/admin/escrows/${e.id}`} className="truncate text-sm font-medium hover:underline">{e.listing.title}</Link>
                    <span className="rounded-full bg-surface-border px-2 py-0.5 text-xs">{e.role}</span>
                  </div>
                  <p className="text-xs text-muted">{formatCurrency(e.amount.toString())} · {e.status} · {formatDate(e.createdAt)}</p>
                </div>
              </Card>
            ))}
          {user.escrowsAsBuyer.length + user.escrowsAsSeller.length === 0 && (
            <p className="text-sm text-muted">No escrows.</p>
          )}
        </div>
      )}

      {/* ── Transactions ─────────────────────────────────────────────────── */}
      {tab === "transactions" && (
        <div className="flex flex-col gap-2">
          {user.transactions.map((tx) => (
            <Card key={tx.id} className="flex items-center justify-between gap-3">
              <div>
                <span className="text-sm font-medium">{tx.type}</span>
                <p className="text-xs text-muted">{tx.status} · {formatDate(tx.createdAt)}</p>
              </div>
              <span className="font-semibold">{formatCurrency(tx.amount.toString())}</span>
            </Card>
          ))}
          {user.transactions.length === 0 && <p className="text-sm text-muted">No transactions.</p>}
        </div>
      )}

      {/* ── Reviews ──────────────────────────────────────────────────────── */}
      {tab === "reviews" && (
        <div className="flex flex-col gap-2">
          {user.reviewsReceived.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-0.5 text-amber-500" role="img" aria-label={`${r.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn("h-3.5 w-3.5", n <= r.rating ? "fill-current" : "text-surface-border")}
                      aria-hidden
                    />
                  ))}
                </span>
                <span className="text-sm text-muted">by {r.reviewer.username ?? "user"} · {formatDate(r.createdAt)}</span>
              </div>
              {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
            </Card>
          ))}
          {user.reviewsReceived.length === 0 && <p className="text-sm text-muted">No reviews.</p>}
        </div>
      )}

      {/* ── Audit ────────────────────────────────────────────────────────── */}
      {tab === "audit" && (
        <div className="flex flex-col gap-2">
          {user.auditLogs.map((log) => (
            <Card key={log.id} className="flex items-center justify-between gap-3">
              <div>
                <span className="text-sm font-medium font-mono text-brand-600">{log.action}</span>
                <p className="text-xs text-muted">{log.targetType} {log.targetId.slice(-8)} · {formatDate(log.createdAt)}</p>
              </div>
            </Card>
          ))}
          {user.auditLogs.length === 0 && <p className="text-sm text-muted">No audit logs for this user.</p>}
        </div>
      )}
    </div>
  );
}
