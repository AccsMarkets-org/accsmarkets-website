import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StarRating } from "@/components/ui/StarRating";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

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

export default async function SellerReviewsPage({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: { page?: string };
}) {
  const seller = await prisma.user.findUnique({
    where: { username: params.username },
    select: { id: true, username: true, name: true, image: true, verifiedBadge: true },
  });
  if (!seller) notFound();

  const page = Math.max(1, Number(searchParams.page) || 1);

  const [reviews, total, avg] = await Promise.all([
    prisma.review.findMany({
      where: { revieweeId: seller.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { reviewer: { select: { username: true, name: true, image: true } } },
    }),
    prisma.review.count({ where: { revieweeId: seller.id } }),
    prisma.review.aggregate({ where: { revieweeId: seller.id }, _avg: { rating: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
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

      <div className="mb-8 flex items-center gap-4">
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

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-surface px-6 py-16 text-center">
          <p className="text-sm text-muted">This seller hasn't received any reviews yet.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-surface-border rounded-2xl border border-surface-border bg-background">
          {reviews.map((r) => (
            <div key={r.id} className="flex gap-3 p-5">
              {r.reviewer.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.reviewer.image} alt={r.reviewer.name ?? ""} className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-muted">
                  {(r.reviewer.name ?? r.reviewer.username ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{r.reviewer.name ?? r.reviewer.username}</p>
                  <StarRating value={r.rating} size={12} />
                  <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                {r.comment && <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{r.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/seller/${seller.username}/reviews?page=${page - 1}`} className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-surface-border bg-background px-2.5 text-sm text-muted transition hover:border-brand-300 hover:text-foreground">←</Link>
          )}
          <span className="flex h-9 items-center px-3 text-sm text-muted">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`/seller/${seller.username}/reviews?page=${page + 1}`} className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-surface-border bg-background px-2.5 text-sm text-muted transition hover:border-brand-300 hover:text-foreground">→</Link>
          )}
        </div>
      )}
    </main>
  );
}
