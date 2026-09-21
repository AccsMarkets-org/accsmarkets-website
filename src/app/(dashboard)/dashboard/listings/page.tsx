import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ListingManageCard } from "@/components/listings/ListingManageCard";
import { ListingsSortSelect } from "@/components/listings/ListingsSortSelect";
import { formatNumber } from "@/lib/utils";
import type { ListingStatus } from "@prisma/client";
import { Clipboard, Plus } from "lucide-react";

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "ALL",      label: "All" },
  { key: "ACTIVE",   label: "Active" },
  { key: "PENDING",  label: "In Review" },
  { key: "DRAFT",    label: "Draft" },
  { key: "REJECTED", label: "Rejected" },
  { key: "SOLD",     label: "Sold" },
  { key: "EXPIRED",  label: "Expired" },
];

export default async function ManageListingsPage({
  searchParams,
}: {
  searchParams: { status?: string; sort?: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const statusFilter =
    STATUS_TABS.map((t) => t.key).includes(searchParams.status ?? "")
      ? (searchParams.status as ListingStatus | "ALL")
      : "ALL";

  const sort =
    searchParams.sort === "price_desc" ? "price_desc"
    : searchParams.sort === "price_asc"  ? "price_asc"
    : searchParams.sort === "views"      ? "views"
    : "newest";

  const orderBy =
    sort === "price_desc" ? { price: "desc" as const }
    : sort === "price_asc"  ? { price: "asc" as const }
    : sort === "views"      ? { viewCount: "desc" as const }
    : { createdAt: "desc" as const };

  const whereBase = { sellerId: userId };
  const whereFiltered =
    statusFilter === "ALL"
      ? whereBase
      : { ...whereBase, status: statusFilter as ListingStatus };

  const [listings, counts, totalViews] = await Promise.all([
    prisma.listing.findMany({
      where: whereFiltered,
      orderBy,
      take: 200,
      include: {
        _count: { select: { offers: { where: { status: "PENDING" } }, bids: true } },
      },
    }),
    prisma.listing.groupBy({
      by: ["status"],
      where: whereBase,
      _count: true,
    }),
    prisma.listing.aggregate({
      where: whereBase,
      _sum: { viewCount: true },
    }),
  ]);

  const countMap: Record<string, number> = { ALL: 0 };
  for (const row of counts) {
    countMap[row.status] = row._count;
    countMap.ALL = (countMap.ALL ?? 0) + row._count;
  }

  const totalViewCount = totalViews._sum.viewCount ?? 0;
  const activeCount = countMap.ACTIVE ?? 0;
  const pendingCount = countMap.PENDING ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Listings</h1>
          <p className="text-sm text-muted mt-0.5">
            {countMap.ALL ?? 0} total &middot; {formatNumber(totalViewCount)} views
          </p>
        </div>
        <Link
          href="/dashboard/listings/new"
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          New listing
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Active", value: activeCount, color: "text-success", bg: "bg-success/10" },
          { label: "In Review", value: pendingCount, color: "text-warning", bg: "bg-warning/10" },
          { label: "Total views", value: formatNumber(totalViewCount), color: "text-brand-600", bg: "bg-brand-50" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border border-surface-border ${s.bg} px-4 py-3`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + sort row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key;
            const cnt = countMap[tab.key] ?? 0;
            const qs = new URLSearchParams();
            if (tab.key !== "ALL") qs.set("status", tab.key);
            if (sort !== "newest") qs.set("sort", sort);
            const href = `/dashboard/listings${qs.toString() ? `?${qs}` : ""}`;
            return (
              <Link
                key={tab.key}
                href={href}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-500 text-white"
                    : "border border-surface-border bg-surface text-muted hover:text-foreground hover:border-brand-300"
                }`}
              >
                {tab.label}
                {cnt > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                      active ? "bg-white/20 text-white" : "bg-surface-border text-muted"
                    }`}
                  >
                    {cnt}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Sort:</label>
          <Suspense fallback={<div className="w-36 h-8 rounded-xl bg-surface border border-surface-border animate-pulse" />}>
            <ListingsSortSelect current={sort} />
          </Suspense>
        </div>
      </div>

      {/* Cards */}
      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-surface-border py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <Clipboard className="h-7 w-7 text-brand-400" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {statusFilter === "ALL"
                ? "No listings yet"
                : `No ${STATUS_TABS.find((t) => t.key === statusFilter)?.label.toLowerCase()} listings`}
            </p>
            {statusFilter === "ALL" && (
              <p className="mt-1 text-sm text-muted">Create your first listing to start selling.</p>
            )}
          </div>
          {statusFilter === "ALL" && (
            <Link
              href="/dashboard/listings/new"
              className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Create listing
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map((listing) => (
            <ListingManageCard
              key={listing.id}
              listing={listing}
              pendingOfferCount={listing._count.offers}
              bidCount={listing._count.bids}
            />
          ))}
        </div>
      )}
    </div>
  );
}
