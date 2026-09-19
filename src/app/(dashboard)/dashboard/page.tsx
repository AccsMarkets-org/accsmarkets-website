import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserDashboardCounts } from "@/lib/dashboard-cache";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/constants";
import { Decimal } from "@prisma/client/runtime/library";
import { SellerDashboard } from "@/components/dashboard/SellerDashboard";
import { BuyerDashboard } from "@/components/dashboard/BuyerDashboard";
import { DashboardViewToggle } from "@/components/dashboard/DashboardViewToggle";

function toFloat(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : parseFloat(d.toString());
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const onboardingCheck = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompletedAt: true },
  });
  if (!onboardingCheck?.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 29 * 86400_000);
  const sixtyDaysAgo = new Date(now.getTime() - 59 * 86400_000);

  const [user, dashCounts] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        walletBalance: true,
        trustScore: true,
        primaryIntent: true,
        createdAt: true,
        subscriptionPlanId: true,
        kycLevel: true,
      },
    }),
    getUserDashboardCounts(userId),
  ]);

  const { unreadMessages, unreadNotifications, pendingOffers, activeEscrows: activeEscrowCount } = dashCounts;
  const intent = user.primaryIntent;

  // For BOTH users, default to SELLER view unless BUYER is explicitly requested
  const showBuyerDash =
    intent === "BUYER" ||
    (intent === "BOTH" && searchParams.view === "BUYER");

  // ── Buyer dashboard ───────────────────────────────────────────────────────────
  if (showBuyerDash) {
    const [recentPurchases, savedCount, followingCount, followingFeed, notifications] = await Promise.all([
      prisma.escrow.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          amount: true,
          createdAt: true,
          listing: { select: { title: true, platform: true } },
          seller: { select: { name: true, username: true } },
        },
      }),
      // "Saved" listings are the Watchlist feature — this previously referenced
      // a `savedListing` model that doesn't exist in the schema, so the count
      // silently caught its own error and was always 0.
      prisma.watchlist.count({ where: { userId } }).catch(() => 0),
      prisma.userFollow.count({ where: { followerId: userId } }),
      prisma.listing.findMany({
        where: {
          status: "ACTIVE",
          seller: { followers: { some: { followerId: userId } } },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          title: true,
          price: true,
          platform: true,
          createdAt: true,
          seller: { select: { username: true, name: true, verifiedBadge: true } },
        },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, body: true, type: true, createdAt: true },
      }),
    ]);

    return (
      <div>
        {intent === "BOTH" && (
          <div className="mb-5 flex justify-end">
            <DashboardViewToggle defaultView="BUYER" />
          </div>
        )}
        <BuyerDashboard
          userId={userId}
          user={user}
          walletValue={toFloat(user.walletBalance)}
          recentPurchases={recentPurchases}
          savedCount={savedCount as number}
          offersCount={Number(pendingOffers)}
          activeEscrows={Number(activeEscrowCount)}
          followingCount={followingCount}
          followingFeed={followingFeed as any}
          notifications={notifications}
        />
      </div>
    );
  }

  // ── Seller dashboard ──────────────────────────────────────────────────────────
  const [
    activeListings,
    totalListings,
    completedEscrows,
    totalOffers,
    recentListings,
    recentTransactions,
    totalEarned,
    earned30d,
    earnedPrev30d,
    viewEvents,
    platformGroups,
    recentEscrows,
    notifications,
    viewCountries,
    followerCount,
  ] = await Promise.all([
    prisma.listing.count({ where: { sellerId: userId, status: "ACTIVE" } }),
    prisma.listing.count({ where: { sellerId: userId } }),
    prisma.escrow.count({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }], status: "COMPLETED" },
    }),
    prisma.offer.count({ where: { OR: [{ buyerId: userId }, { sellerId: userId }] } }),
    prisma.listing.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, title: true, platform: true, price: true,
        status: true, viewCount: true, createdAt: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, type: true, status: true, amount: true, createdAt: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "ESCROW_RELEASE", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "ESCROW_RELEASE", status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "ESCROW_RELEASE", status: "COMPLETED", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<{ day: string; cnt: bigint }[]>`
      SELECT DATE(lve.createdAt) AS day, COUNT(*) AS cnt
      FROM ListingViewEvent lve
      JOIN Listing l ON l.id = lve.listingId
      WHERE l.sellerId = ${userId}
        AND lve.createdAt >= ${thirtyDaysAgo}
      GROUP BY DATE(lve.createdAt)
    `,
    prisma.listing.groupBy({
      by: ["platform"],
      where: { sellerId: userId, status: "ACTIVE" },
      _count: true,
    }),
    prisma.escrow.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true, status: true, amount: true, createdAt: true,
        listing: { select: { title: true, platform: true } },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, body: true, type: true, createdAt: true },
    }),
    prisma.$queryRaw<{ countryCode: string | null; cnt: bigint }[]>`
      SELECT lve.countryCode, COUNT(*) AS cnt
      FROM ListingViewEvent lve
      JOIN Listing l ON l.id = lve.listingId
      WHERE l.sellerId = ${userId}
        AND lve.createdAt >= ${thirtyDaysAgo}
        AND lve.countryCode IS NOT NULL
      GROUP BY lve.countryCode
      ORDER BY cnt DESC
      LIMIT 10
    `,
    prisma.userFollow.count({ where: { followingId: userId } }),
  ]);

  // Build 30-day sparklines
  const dayKeys: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 86400_000);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const viewMap: Record<string, number> = Object.fromEntries(dayKeys.map((k) => [k, 0]));
  let totalViews = 0;
  for (const row of viewEvents) {
    const key = typeof row.day === "string" ? row.day : new Date(row.day).toISOString().slice(0, 10);
    const cnt = Number(row.cnt);
    totalViews += cnt;
    if (key in viewMap) viewMap[key] = cnt;
  }
  const viewSeries = dayKeys.map((k) => viewMap[k]);
  const views7d = viewSeries.slice(-7).reduce((s, n) => s + n, 0);
  const views7dPrev = viewSeries.slice(-14, -7).reduce((s, n) => s + n, 0);
  const viewTrend = views7dPrev === 0 ? null : Math.round(((views7d - views7dPrev) / views7dPrev) * 100);

  const earned = toFloat(totalEarned._sum.amount);
  const e30 = toFloat(earned30d._sum.amount);
  const ePrev30 = toFloat(earnedPrev30d._sum.amount);
  const earnTrend = ePrev30 === 0 ? null : Math.round(((e30 - ePrev30) / ePrev30) * 100);

  const countryRows = viewCountries
    .filter((r) => r.countryCode)
    .map((r) => ({ code: r.countryCode as string, count: Number(r.cnt) }))
    .slice(0, 8);
  const topCountry = countryRows[0] ?? null;

  const platformTotal = platformGroups.reduce((s, g) => s + g._count, 0) || 1;
  const platforms = platformGroups
    .sort((a, b) => b._count - a._count)
    .slice(0, 5)
    .map((g) => ({
      key: g.platform,
      label: PLATFORM_LABEL[g.platform as keyof typeof PLATFORM_LABEL] ?? g.platform,
      color: PLATFORM_COLOR[g.platform as keyof typeof PLATFORM_COLOR] ?? "#888",
      count: g._count,
      pct: Math.round((g._count / platformTotal) * 100),
    }));

  return (
    <div>
      {intent === "BOTH" && (
        <div className="mb-5 flex justify-end">
          <DashboardViewToggle defaultView="SELLER" />
        </div>
      )}
      <SellerDashboard
        userId={userId}
        user={user}
        walletValue={toFloat(user.walletBalance)}
        earned={earned}
        e30={e30}
        earnTrend={earnTrend}
        viewTrend={viewTrend}
        totalViews={totalViews}
        views7d={views7d}
        viewSeries={viewSeries}
        dayKeys={dayKeys}
        countryRows={countryRows}
        topCountry={topCountry}
        activeListings={activeListings}
        totalListings={totalListings}
        completedEscrows={completedEscrows}
        totalOffers={totalOffers}
        platforms={platforms}
        recentListings={recentListings}
        recentEscrows={recentEscrows}
        recentTransactions={recentTransactions}
        notifications={notifications}
        pendingOffers={pendingOffers}
        activeEscrows={activeEscrowCount}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
        followerCount={followerCount}
      />
    </div>
  );
}
