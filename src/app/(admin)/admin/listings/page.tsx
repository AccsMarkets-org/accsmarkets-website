import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { AdminPagination } from "@/components/ui/AdminPagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { LISTING_STATUS_STYLE, PLATFORM_LABEL, PLATFORM_COLOR } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ListingStatus, Platform, Prisma } from "@prisma/client";

const PAGE_SIZE = 30;

const TABS: { key: string; label: string; statuses: ListingStatus[] }[] = [
  { key: "pending",   label: "Pending",   statuses: ["PENDING"] },
  { key: "active",    label: "Active",    statuses: ["ACTIVE"] },
  { key: "rejected",  label: "Rejected",  statuses: ["REJECTED"] },
  { key: "suspended", label: "Suspended", statuses: ["SUSPENDED"] },
  { key: "all",       label: "All",       statuses: ["DRAFT", "PENDING", "ACTIVE", "SOLD", "REJECTED", "SUSPENDED", "EXPIRED"] },
];

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string; q?: string; platform?: string };
}) {
  const session = await requireAdmin("MANAGE_LISTINGS");
  if (!session) redirect("/admin?denied=1");

  const tab = TABS.find((t) => t.key === (searchParams.tab ?? "pending")) ?? TABS[0];
  const page = Math.max(0, Number(searchParams.page ?? 0));
  const q = searchParams.q?.trim() ?? "";
  const rawPlatform = searchParams.platform?.trim() ?? "";
  const platformFilter = rawPlatform in PLATFORM_LABEL ? (rawPlatform as Platform) : undefined;

  const where: Prisma.ListingWhereInput = {
    status: { in: tab.statuses },
    ...(platformFilter ? { platform: platformFilter } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q } },
        { seller: { email: { contains: q } } },
        { seller: { username: { contains: q } } },
      ],
    } : {}),
  };

  const [listings, tabCounts] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: { seller: { select: { id: true, username: true, email: true } } },
    }),
    // Count per tab for badge display
    prisma.listing.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const hasMore = listings.length > PAGE_SIZE;
  const pageListings = hasMore ? listings.slice(0, PAGE_SIZE) : listings;

  const statusCount: Record<string, number> = {};
  for (const row of tabCounts) statusCount[row.status] = row._count._all;
  const tabCount = (t: typeof TABS[0]) => t.key === "all"
    ? Object.values(statusCount).reduce((s, c) => s + c, 0)
    : t.statuses.reduce((s, st) => s + (statusCount[st] ?? 0), 0);

  const pendingCount = statusCount["PENDING"] ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Listings"
        badge={pendingCount}
        badgeUrgent={pendingCount > 0}
        subtitle="Manage and moderate all listings"
      />

      {/* Search + filters */}
      <form className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Title, seller email or username…"
          className="h-9 min-w-[10rem] flex-1 rounded-xl border border-surface-border bg-surface px-3 text-sm focus:border-brand-400 focus:outline-none"
        />
        <select
          name="platform"
          defaultValue={platformFilter}
          className="h-9 rounded-xl border border-surface-border bg-background px-3 text-base sm:text-sm"
        >
          <option value="">All platforms</option>
          {Object.entries(PLATFORM_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {searchParams.tab && <input type="hidden" name="tab" value={searchParams.tab} />}
        <button className="h-9 rounded-xl bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 transition">
          Search
        </button>
        {(q || platformFilter) && (
          <a
            href={`/admin/listings?tab=${tab.key}`}
            className="h-9 flex items-center rounded-xl border border-surface-border px-3 text-sm text-muted hover:text-foreground transition"
          >
            Clear
          </a>
        )}
      </form>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((t) => {
          const count = tabCount(t);
          const active = t.key === tab.key;
          const qs = new URLSearchParams();
          qs.set("tab", t.key);
          if (q) qs.set("q", q);
          return (
            <Link
              key={t.key}
              href={`/admin/listings?${qs}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                active ? "bg-brand-500 text-white" : "border border-surface-border bg-surface text-muted hover:text-foreground hover:border-brand-300"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  active ? "bg-white/20 text-white" : t.key === "pending" ? "bg-warning text-white" : "bg-surface-border text-muted"
                }`}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Listing rows */}
      <div className="flex flex-col gap-2">
        {pageListings.map((listing) => {
          const style = LISTING_STATUS_STYLE[listing.status];
          const platformColor = PLATFORM_COLOR[listing.platform];
          const screenshots = Array.isArray(listing.screenshots) ? (listing.screenshots as string[]) : [];
          const isPending = listing.status === "PENDING";
          return (
            <div
              key={listing.id}
              className={`rounded-2xl border overflow-hidden transition ${
                isPending ? "border-warning/30 bg-warning/5" : "border-surface-border bg-surface"
              }`}
            >
              <div className="flex gap-0">
                {/* Thumbnail */}
                <div
                  className="relative shrink-0 w-20 sm:w-28 self-stretch flex items-center justify-center overflow-hidden"
                  style={{ background: `${platformColor}18` }}
                >
                  {screenshots[0] ? (
                    <Image src={screenshots[0]} alt="" fill sizes="112px" className="object-cover" />
                  ) : (
                    <span className="text-xl font-black opacity-30 select-none" style={{ color: platformColor }}>
                      {(PLATFORM_LABEL[listing.platform] ?? "").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className={`absolute top-1.5 left-1.5 rounded-lg px-1.5 py-0.5 text-[9px] font-bold leading-none ${style.className}`}>
                    {style.label}
                  </span>
                </div>

                {/* Body */}
                <div className="flex flex-1 min-w-0 flex-col gap-1.5 p-3">
                  <div className="flex items-start gap-2 justify-between">
                    <div className="min-w-0">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold mb-1"
                        style={{ background: `${platformColor}18`, color: platformColor }}
                      >
                        {PLATFORM_LABEL[listing.platform]}
                      </span>
                      <Link href={`/admin/listings/${listing.id}`} className="block font-semibold text-sm hover:text-brand-600 transition line-clamp-1">
                        {listing.title}
                      </Link>
                    </div>
                    <span className="text-sm font-bold shrink-0">{formatCurrency(listing.price.toString())}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    {listing.followers != null && <span>{listing.followers.toLocaleString()} followers</span>}
                    <span>{listing.viewCount} views</span>
                    {listing.moderationScore > 0 && (
                      <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
                        mod score: {listing.moderationScore}
                      </span>
                    )}
                    {listing.ownershipVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                        Ownership
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">verified</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">Ownership pending</span>
                    )}
                    <span>
                      by{" "}
                      <Link href={`/admin/users/${listing.seller.id}`} className="text-brand-500 hover:underline">
                        {listing.seller.username ?? listing.seller.email}
                      </Link>
                    </span>
                    <span>{formatDate(listing.createdAt)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-surface-border mt-1">
                    <Link
                      href={`/admin/listings/${listing.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
                    >
                      Full review
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <AdminActionButtons
                      endpoint={`/api/admin/listings/${listing.id}`}
                      actions={
                        listing.status === "PENDING"
                          ? [
                              { label: "Quick approve", action: "approve", variant: "primary" },
                              { label: "Reject", action: "reject", variant: "danger", promptReason: true },
                            ]
                          : listing.status === "ACTIVE"
                          ? [{ label: "Suspend", action: "suspend", variant: "danger", promptReason: true, confirm: "Suspend this listing?" }]
                          : listing.status === "SUSPENDED"
                          ? [{ label: "Reactivate", action: "reactivate", variant: "primary" }]
                          : []
                      }
                    />
                    {!listing.ownershipVerified && (
                      <Link
                        href={`/admin/listings/${listing.id}?tab=ownership`}
                        className="rounded-xl border border-warning/40 bg-warning/5 px-3 py-1.5 text-xs font-medium text-warning-foreground hover:bg-warning/10 transition"
                      >
                        Check ownership
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {pageListings.length === 0 && (
          <div className="py-16 text-center text-muted">Nothing in this queue.</div>
        )}
      </div>

      <AdminPagination page={page} hasMore={hasMore} baseHref="/admin/listings" extraParams={{ tab: tab.key, q: q || undefined, platform: platformFilter || undefined }} />
    </div>
  );
}
