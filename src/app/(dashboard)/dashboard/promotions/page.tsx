import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PromotionsClient, type BoostedListingRow } from "@/components/listings/PromotionsClient";
import { PLATFORM_LABEL } from "@/lib/constants";
import { ArrowLeft, History, Zap } from "lucide-react";

export const metadata = { title: "Promotions" };

const PROMO_LABEL: Record<string, string> = {
  FEATURED_BOOST: "Featured Boost",
  PREMIUM_FEATURED: "Premium Featured",
  PINNED: "Pinned",
  BUMP: "Bump",
};

export default async function PromotionsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

  const [boosted, history, spentAll, spent30] = await Promise.all([
    prisma.listing.findMany({
      where: {
        sellerId: userId,
        OR: [{ isFeatured: true }, { isPremiumFeatured: true }, { isPinned: true }],
      },
      orderBy: [{ featuredUntil: "asc" }, { pinnedUntil: "asc" }],
      select: {
        id: true,
        title: true,
        platform: true,
        status: true,
        viewCount: true,
        isFeatured: true,
        isPremiumFeatured: true,
        isPinned: true,
        featuredUntil: true,
        pinnedUntil: true,
        lastBumpedAt: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId, type: { in: ["PROMOTION", "BUMP"] }, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, type: true, amount: true, createdAt: true, metadata: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: { in: ["PROMOTION", "BUMP"] }, status: "COMPLETED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { userId, type: { in: ["PROMOTION", "BUMP"] }, status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  // Resolve listing titles referenced by transaction metadata (listing may since be deleted).
  const metaOf = (m: unknown): { listingId?: string; promotionType?: string } =>
    m && typeof m === "object" ? (m as { listingId?: string; promotionType?: string }) : {};
  const historyListingIds = Array.from(
    new Set(history.map((t) => metaOf(t.metadata).listingId).filter((x): x is string => typeof x === "string")),
  );
  const titleRows = historyListingIds.length
    ? await prisma.listing.findMany({
        where: { id: { in: historyListingIds } },
        select: { id: true, title: true, platform: true },
      })
    : [];
  const titleById = new Map(titleRows.map((r) => [r.id, r]));

  const rows: BoostedListingRow[] = boosted.map((l) => ({
    id: l.id,
    title: l.title,
    platform: l.platform,
    status: l.status,
    viewCount: l.viewCount,
    isFeatured: l.isFeatured,
    isPremiumFeatured: l.isPremiumFeatured,
    isPinned: l.isPinned,
    featuredUntil: l.featuredUntil?.toISOString() ?? null,
    pinnedUntil: l.pinnedUntil?.toISOString() ?? null,
    lastBumpedAt: l.lastBumpedAt?.toISOString() ?? null,
  }));

  const total30 = Number(spent30._sum.amount ?? 0);
  const totalAll = Number(spentAll._sum.amount ?? 0);

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/listings"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            My listings
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Zap className="h-6 w-6 text-brand-500" aria-hidden />
            Promotions
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {rows.length} active boost{rows.length === 1 ? "" : "s"} &middot; manage expiry, extend or cancel
          </p>
        </div>
        <Link
          href="/dashboard/listings?status=ACTIVE"
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition"
        >
          <Zap className="h-4 w-4" aria-hidden />
          Boost a listing
        </Link>
      </div>

      {/* Spend tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Active boosts", value: String(rows.length), sub: "featured, premium or pinned", color: "text-brand-600 dark:text-brand-400", bg: "bg-brand-50 dark:bg-brand-950/30" },
          { label: "Spent (30 days)", value: formatCurrency(total30), sub: `${spent30._count} purchase${spent30._count === 1 ? "" : "s"}`, color: "text-foreground", bg: "bg-surface" },
          { label: "Spent (all time)", value: formatCurrency(totalAll), sub: `${spentAll._count} purchase${spentAll._count === 1 ? "" : "s"}`, color: "text-foreground", bg: "bg-surface" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border border-surface-border ${s.bg} px-4 py-3`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted mt-0.5">{s.label}</p>
            <p className="text-[10px] text-muted">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Active boosts */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">Active boosts</h2>
        <PromotionsClient rows={rows} />
      </section>

      {/* History */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted">
          <History className="h-4 w-4" aria-hidden />
          Boost history
        </h2>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-surface-border px-4 py-8 text-center text-sm text-muted">
            No promotion purchases yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Listing</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {history.map((t) => {
                  const meta = metaOf(t.metadata);
                  const listing = meta.listingId ? titleById.get(meta.listingId) : undefined;
                  const promoType = meta.promotionType ?? t.type;
                  return (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">{formatDate(t.createdAt)}</td>
                      <td className="max-w-[260px] px-4 py-2.5">
                        {listing ? (
                          <Link href={`/dashboard/listings/${listing.id}/analytics`} className="block truncate font-medium text-foreground hover:text-brand-600">
                            {listing.title}
                            <span className="ml-1 text-[10px] text-muted">{PLATFORM_LABEL[listing.platform]}</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted">Deleted listing</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                          {PROMO_LABEL[promoType] ?? promoType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-foreground">
                        −{formatCurrency(t.amount.toString())}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
