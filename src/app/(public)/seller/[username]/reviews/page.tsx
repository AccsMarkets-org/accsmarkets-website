import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StarRating } from "@/components/ui/StarRating";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { ArrowLeft, ArrowRight, MessageSquare, ShoppingBag, Star, X } from "lucide-react";

const BASE_URL = "https://accsmarkets.org";
const PAGE_SIZE = 15;

export async function generateMetadata({ params }: { params: { username: string } }) {
  try {
    const seller = await prisma.user.findUnique({
      where: { username: params.username },
      select: { name: true, username: true },
    });
    if (!seller) return {};
    const title = `Reviews for ${seller.name ?? seller.username}`;
    const url = `${BASE_URL}/seller/${seller.username}/reviews`;
    return {
      title,
      description: `All reviews received by ${seller.name ?? seller.username} on AccsMarkets.`,
      alternates: { canonical: url },
      robots: { index: true, follow: true },
    };
  } catch {
    return {};
  }
}

function buildHref(username: string, params: { page?: number; stars?: number }) {
  const qs = new URLSearchParams();
  if (params.stars) qs.set("stars", String(params.stars));
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  const query = qs.toString();
  return `/seller/${username}/reviews${query ? `?${query}` : ""}`;
}

export default async function SellerReviewsPage({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: { page?: string; stars?: string };
}) {
  const seller = await prisma.user.findUnique({
    where: { username: params.username },
    select: { id: true, username: true, name: true, image: true, verifiedBadge: true },
  });
  if (!seller) notFound();

  const page = Math.max(1, Number(searchParams.page) || 1);
  const starsParam = Number(searchParams.stars);
  const activeStars = [1, 2, 3, 4, 5].includes(starsParam) ? starsParam : null;

  const filterWhere = { revieweeId: seller.id, ...(activeStars ? { rating: activeStars } : {}) };

  const [reviews, distribution, avg] = await Promise.all([
    prisma.review.findMany({
      where: filterWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        reviewer: { select: { username: true, name: true, image: true } },
        escrow: { select: { listing: { select: { id: true, title: true } } } },
      },
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { revieweeId: seller.id },
      _count: { rating: true },
    }),
    prisma.review.aggregate({ where: { revieweeId: seller.id }, _avg: { rating: true } }),
  ]);

  // Rating distribution, 5★ down to 1★, computed from every review this seller has received.
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of distribution) counts[row.rating] = row._count.rating;
  const total = counts[1] + counts[2] + counts[3] + counts[4] + counts[5];
  const filteredTotal = activeStars ? counts[activeStars] : total;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const avgRating = avg._avg.rating ?? 0;

  const reviewJsonLd = total > 0 ? {
    "@context": "https://schema.org",
    "@type": "Person",
    name: seller.name ?? seller.username,
    url: `${BASE_URL}/seller/${seller.username}`,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: avgRating.toFixed(1),
      reviewCount: total,
    },
  } : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {reviewJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewJsonLd).replace(/</g, "\\u003c") }} />
      )}

      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/sellers" className="hover:text-foreground">Sellers</Link></li>
          <li aria-hidden>›</li>
          <li><Link href={`/seller/${seller.username}`} className="hover:text-foreground">{seller.name ?? seller.username}</Link></li>
          <li aria-hidden>›</li>
          <li className="font-medium text-foreground">Reviews</li>
        </ol>
      </nav>

      <div className="mb-6 flex items-center gap-4">
        {seller.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={seller.image} alt={seller.name ?? seller.username ?? ""} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-600 dark:bg-brand-900/50">
            {(seller.name ?? seller.username ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-foreground">{seller.name ?? seller.username}</h1>
            <VerifiedBadge badge={seller.verifiedBadge} size={16} />
          </div>
          {total > 0 ? (
            <div className="mt-1 flex items-center gap-1.5">
              <StarRating value={avgRating} size={16} />
              <span className="text-sm text-muted">{avgRating.toFixed(1)} · {total.toLocaleString()} review{total === 1 ? "" : "s"}</span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">No reviews yet</p>
          )}
        </div>
      </div>

      {/* ── Rating distribution ─────────────────────────────────────────── */}
      {total > 0 && (
        <div className="mb-8 rounded-2xl border border-surface-border bg-surface p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Rating breakdown</h2>
            {activeStars && (
              <Link
                href={buildHref(seller.username!, {})}
                className="inline-flex items-center gap-1 rounded-full border border-surface-border px-2.5 py-1 text-[11px] font-medium text-muted hover:text-foreground hover:bg-background transition"
              >
                <X className="h-3 w-3" aria-hidden />
                Clear filter
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = counts[star];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const isActive = activeStars === star;
              return (
                <Link
                  key={star}
                  href={count > 0 ? buildHref(seller.username!, { stars: isActive ? undefined : star }) : "#"}
                  aria-disabled={count === 0}
                  className={`group flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm transition ${
                    count === 0 ? "pointer-events-none opacity-50" : "hover:bg-background"
                  } ${isActive ? "bg-background ring-1 ring-brand-300" : ""}`}
                >
                  <span className={`flex w-9 shrink-0 items-center gap-0.5 text-xs font-medium ${isActive ? "text-brand-600 dark:text-brand-400" : "text-muted group-hover:text-foreground"}`}>
                    {star}
                    <Star className="h-3 w-3 fill-current" aria-hidden />
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-border">
                    <span
                      className={`block h-2 rounded-full transition-all ${isActive ? "bg-brand-600" : "bg-brand-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs text-muted tabular-nums">
                    {count.toLocaleString()} ({pct}%)
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {activeStars && (
        <p className="mb-4 text-xs text-muted">
          Showing {filteredTotal.toLocaleString()} {activeStars}-star review{filteredTotal === 1 ? "" : "s"} ·{" "}
          <Link href={buildHref(seller.username!, {})} className="font-medium text-brand-500 hover:text-brand-600">
            show all
          </Link>
        </p>
      )}

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-surface-border bg-surface px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted">
            <MessageSquare className="h-6 w-6" aria-hidden />
          </div>
          {total === 0 ? (
            <>
              <p className="text-sm font-medium text-foreground">No reviews yet</p>
              <p className="max-w-xs text-sm text-muted">
                {seller.name ?? seller.username} hasn&apos;t received any reviews yet. Reviews appear here once a
                buyer completes an escrow with this seller.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">No {activeStars}-star reviews</p>
              <p className="max-w-xs text-sm text-muted">Try a different rating filter, or view all reviews.</p>
              <Link href={buildHref(seller.username!, {})} className="text-sm font-semibold text-brand-500 hover:text-brand-600">
                Show all reviews →
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-surface-border rounded-2xl border border-surface-border bg-background">
          {reviews.map((r) => (
            <div key={r.id} className="flex gap-3 p-5">
              <Link href={r.reviewer.username ? `/seller/${r.reviewer.username}` : "#"} className="shrink-0">
                {r.reviewer.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.reviewer.image} alt={r.reviewer.name ?? ""} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-xs font-bold text-muted">
                    {(r.reviewer.name ?? r.reviewer.username ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={r.reviewer.username ? `/seller/${r.reviewer.username}` : "#"}
                    className="text-sm font-semibold text-foreground hover:text-brand-500 transition"
                  >
                    {r.reviewer.name ?? r.reviewer.username}
                  </Link>
                  <StarRating value={r.rating} size={12} />
                  <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                {r.comment && <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{r.comment}</p>}
                {r.escrow?.listing && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
                    <ShoppingBag className="h-3 w-3" aria-hidden />
                    Purchased: {r.escrow.listing.title}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link
              href={buildHref(seller.username!, { stars: activeStars ?? undefined, page: page - 1 })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-1.5 text-sm font-medium hover:bg-surface-border transition"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Previous
            </Link>
          ) : (
            <div />
          )}
          <span className="text-xs text-muted">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link
              href={buildHref(seller.username!, { stars: activeStars ?? undefined, page: page + 1 })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-1.5 text-sm font-medium hover:bg-surface-border transition"
            >
              Next
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}
    </main>
  );
}
