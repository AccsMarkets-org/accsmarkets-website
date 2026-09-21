import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTrustTier } from "@/lib/constants";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { StarRating } from "@/components/ui/StarRating";

export const revalidate = 300;

const BASE_URL = "https://accsmarkets.org";
const PAGE_SIZE = 24;

export const metadata = {
  title: "Sellers",
  description: "Browse verified sellers on AccsMarkets. Check trust scores, completed sales, and reviews before buying a social media account.",
  alternates: { canonical: `${BASE_URL}/sellers` },
  openGraph: {
    title: "Sellers — AccsMarkets",
    description: "Browse verified sellers on AccsMarkets. Check trust scores, completed sales, and reviews before buying.",
    url: `${BASE_URL}/sellers`,
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const, title: "Sellers — AccsMarkets" },
};

export default async function SellersDirectoryPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sellers: any[] = [];
  let total = 0;

  try {
    [sellers, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          username: { not: null },
          listings: { some: { status: { in: ["ACTIVE", "SOLD"] } } },
        },
        orderBy: [{ trustScore: "desc" }, { createdAt: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          username: true,
          name: true,
          image: true,
          verifiedBadge: true,
          trustScore: true,
          countryCode: true,
          _count: {
            select: {
              listings: { where: { status: "ACTIVE" } },
              escrowsAsSeller: { where: { status: "COMPLETED" } },
              reviewsReceived: true,
            },
          },
          reviewsReceived: { select: { rating: true } },
        },
      }),
      prisma.user.count({
        where: { username: { not: null }, listings: { some: { status: { in: ["ACTIVE", "SOLD"] } } } },
      }),
    ]);
  } catch {}

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const itemListJsonLd = sellers.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: sellers.map((s, i) => ({
      "@type": "ListItem",
      position: (page - 1) * PAGE_SIZE + i + 1,
      url: `${BASE_URL}/seller/${s.username}`,
      name: s.name ?? s.username,
    })),
  } : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {itemListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c") }} />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Sellers</h1>
        <p className="mt-1 text-sm text-muted">
          {total > 0 ? `${total.toLocaleString()} verified sellers on AccsMarkets` : "Browse sellers on AccsMarkets"}
        </p>
      </div>

      {sellers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="mb-4 text-5xl">👤</span>
          <p className="text-lg font-bold text-foreground">No sellers yet</p>
          <p className="mt-1 text-sm text-muted">Check back soon as new sellers join the marketplace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sellers.map((seller) => {
            const trustTier = getTrustTier(seller.trustScore);
            const avgRating = seller.reviewsReceived.length > 0
              ? seller.reviewsReceived.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / seller.reviewsReceived.length
              : 0;
            return (
              <Link
                key={seller.username}
                href={`/seller/${seller.username}`}
                className="card-animate flex flex-col gap-3 rounded-2xl border border-surface-border bg-background p-5 transition-all hover:border-brand-300/70 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  {seller.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={seller.image} alt={seller.name ?? seller.username ?? ""} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-900/50">
                      {(seller.name ?? seller.username ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-foreground">{seller.name ?? seller.username}</p>
                      <VerifiedBadge badge={seller.verifiedBadge} size={14} />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted">
                      {seller.countryCode && <CountryFlag code={seller.countryCode} />}
                      <span className={`font-medium ${trustTier.className}`}>{trustTier.label}</span>
                    </div>
                  </div>
                </div>

                {avgRating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <StarRating value={avgRating} size={14} />
                    <span className="text-xs text-muted">({seller._count.reviewsReceived})</span>
                  </div>
                )}

                <div className="flex items-center gap-4 border-t border-surface-border pt-3 text-xs text-muted">
                  <span><strong className="text-foreground">{seller._count.listings}</strong> active</span>
                  <span><strong className="text-foreground">{seller._count.escrowsAsSeller}</strong> sold</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-12 flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/sellers?page=${page - 1}`} className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-surface-border bg-background px-2.5 text-sm text-muted transition hover:border-brand-300 hover:text-foreground">←</Link>
          )}
          <span className="flex h-9 items-center px-3 text-sm text-muted">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`/sellers?page=${page + 1}`} className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-surface-border bg-background px-2.5 text-sm text-muted transition hover:border-brand-300 hover:text-foreground">→</Link>
          )}
        </div>
      )}
    </main>
  );
}
