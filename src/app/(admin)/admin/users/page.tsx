import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { AdminPagination } from "@/components/ui/AdminPagination";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getTrustTier } from "@/lib/constants";
import { CountryFlag } from "@/components/ui/CountryFlag";
import type { KycLevel, Role } from "@prisma/client";

const PAGE_SIZE = 30;

const KYC_LABEL: Record<KycLevel, { label: string; className: string }> = {
  NONE:        { label: "No KYC",     className: "bg-muted/10 text-muted" },
  EMAIL:       { label: "Email",      className: "bg-brand-500/10 text-brand-700 dark:text-brand-400" },
  PHONE:       { label: "Phone",      className: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" },
  ID_VERIFIED: { label: "ID Verified", className: "bg-success/10 text-success" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; role?: string; status?: string; kyc?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(0, Number(searchParams.page ?? 0));
  const roleFilter = (["ADMIN", "USER"].includes(searchParams.role ?? "") ? searchParams.role as Role : undefined);
  const bannedFilter = searchParams.status === "banned" ? true : searchParams.status === "active" ? false : undefined;
  const kycFilter = (["NONE", "EMAIL", "PHONE", "ID_VERIFIED"].includes(searchParams.kyc ?? "") ? searchParams.kyc as KycLevel : undefined);

  const where = {
    ...(q ? { OR: [{ email: { contains: q } }, { username: { contains: q } }, { name: { contains: q } }] } : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(bannedFilter != null ? { isBanned: bannedFilter } : {}),
    ...(kycFilter ? { kycLevel: kycFilter } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: { _count: { select: { listings: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  const hasMore = users.length > PAGE_SIZE;
  const pageUsers = hasMore ? users.slice(0, PAGE_SIZE) : users;

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Users"
        subtitle={`${total.toLocaleString()} users`}
        badge={total}
      />

      {/* Search + filters */}
      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search email / username / name"
          className="h-9 min-w-[240px] flex-1 rounded-xl border border-surface-border bg-surface px-3 text-base focus:border-brand-400 focus:outline-none sm:text-sm"
        />
        <select name="role" defaultValue={searchParams.role ?? ""} className="h-9 rounded-xl border border-surface-border bg-surface px-3 text-base focus:outline-none sm:text-sm">
          <option value="">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
        </select>
        <select name="status" defaultValue={searchParams.status ?? ""} className="h-9 rounded-xl border border-surface-border bg-surface px-3 text-base focus:outline-none sm:text-sm">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
        <select name="kyc" defaultValue={searchParams.kyc ?? ""} className="h-9 rounded-xl border border-surface-border bg-surface px-3 text-base focus:outline-none sm:text-sm">
          <option value="">All KYC</option>
          <option value="NONE">No KYC</option>
          <option value="EMAIL">Email</option>
          <option value="PHONE">Phone</option>
          <option value="ID_VERIFIED">ID Verified</option>
        </select>
        <button className="h-9 rounded-xl bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 transition">
          Search
        </button>
      </form>

      {/* User cards */}
      <div className="flex flex-col gap-2">
        {pageUsers.map((user) => {
          const tier = getTrustTier(user.trustScore);
          const kycStyle = KYC_LABEL[user.kycLevel];
          const trustWidth = `${user.trustScore}%`;
          return (
            <div
              key={user.id}
              className={`rounded-2xl border p-4 transition ${
                user.isBanned
                  ? "border-danger/30 bg-danger/5"
                  : user.role === "ADMIN"
                  ? "border-brand-300 bg-brand-50"
                  : "border-surface-border bg-surface"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Left: avatar + info */}
                <div className="flex items-start gap-3 min-w-0">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {user.image ? (
                      <Image src={user.image} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 text-sm font-bold">
                        {(user.name ?? user.username ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {user.isBanned && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[8px] text-white font-bold">✕</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    {/* Name row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link href={`/admin/users/${user.id}`} className="font-semibold hover:text-brand-600 transition">
                        {user.username ?? user.name ?? user.email}
                      </Link>
                      <VerifiedBadge badge={user.verifiedBadge} size={14} />
                      {user.role === "ADMIN" && (
                        <span className="rounded-full bg-brand-950 px-2 py-0.5 text-[10px] font-bold text-brand-100">ADMIN</span>
                      )}
                      {user.isBanned && (
                        <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger">BANNED</span>
                      )}
                      {user.countryCode && (
                        <CountryFlag code={user.countryCode} />
                      )}
                    </div>

                    {/* Email + meta */}
                    <p className="text-xs text-muted mt-0.5">
                      {user.email}
                      {user.name && user.username && ` · ${user.name}`}
                    </p>

                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${kycStyle.className}`}>
                        {kycStyle.label}
                      </span>
                      <span className={`text-xs font-medium ${tier.className}`}>{tier.label}</span>

                      {/* Trust bar */}
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 rounded-full bg-surface-border overflow-hidden">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: trustWidth }} />
                        </div>
                        <span className="text-[10px] text-muted">{user.trustScore}</span>
                      </div>

                      <span className="text-xs text-muted">{formatCurrency(user.walletBalance.toString())} balance</span>
                      <span className="text-xs text-muted">{user._count.listings} listing{user._count.listings !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>

                {/* Right: date + actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs text-muted">Joined {formatDate(user.createdAt)}</span>
                  <AdminActionButtons
                    endpoint={`/api/admin/users/${user.id}`}
                    actions={[
                      user.isBanned
                        ? { label: "Unban", action: "unban", variant: "secondary" }
                        : { label: "Ban", action: "ban", variant: "danger", promptReason: true, confirm: "Ban this user?" },
                      { label: "Adjust balance", action: "adjust_balance", promptAmount: true, promptReason: true },
                      { label: "Trust score", action: "trust_score_override", promptTrustScore: true },
                      { label: "Badge", action: "set_badge", promptBadge: true },
                      { label: "Award achievement", action: "award_achievement_badge", promptAchievementBadge: true },
                      { label: "Revoke achievement", action: "revoke_achievement_badge", promptAchievementBadge: true },
                    ]}
                  />
                </div>
              </div>

              {/* Quick links */}
              <div className="mt-3 flex flex-wrap gap-3 border-t border-surface-border pt-2.5">
                <Link href={`/admin/users/${user.id}`} className="text-xs text-brand-600 hover:underline">View profile →</Link>
                <Link href={`/admin/listings?q=${encodeURIComponent(user.email ?? "")}`} className="text-xs text-muted hover:text-brand-600">
                  Listings ({user._count.listings})
                </Link>
              </div>
            </div>
          );
        })}
        {pageUsers.length === 0 && (
          <div className="py-16 text-center text-muted">No users found.</div>
        )}
      </div>

      <AdminPagination
        page={page}
        hasMore={hasMore}
        baseHref="/admin/users"
        extraParams={{ q: q || undefined, role: searchParams.role, status: searchParams.status, kyc: searchParams.kyc }}
      />
    </div>
  );
}
