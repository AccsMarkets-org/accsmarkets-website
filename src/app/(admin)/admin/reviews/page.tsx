import Link from "next/link";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/ui/AdminPagination";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 50;

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={i < rating ? "h-3.5 w-3.5 fill-amber-400 text-amber-400" : "h-3.5 w-3.5 text-surface-border"}
          aria-hidden
        />
      ))}
    </div>
  );
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) redirect("/admin?denied=1");

  // Number("abc") is NaN and Math.max(0, NaN) is NaN, which Prisma rejects as `skip`.
  const pageRaw = Math.floor(Number(searchParams.page));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 0;

  const [rawReviews, total] = await Promise.all([
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: {
        reviewer: { select: { id: true, username: true, name: true, email: true } },
        reviewee: { select: { id: true, username: true, name: true, email: true } },
        escrow: { select: { id: true, listing: { select: { title: true } } } },
      },
    }),
    prisma.review.count(),
  ]);

  const hasMore = rawReviews.length > PAGE_SIZE;
  const reviews = hasMore ? rawReviews.slice(0, PAGE_SIZE) : rawReviews;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Reviews"
        subtitle={`${total} review${total === 1 ? "" : "s"} left by buyers and sellers after completed escrows`}
      />

      <div className="flex flex-col gap-3">
        {reviews.map((review) => (
          <Card key={review.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Link href={`/admin/users?q=${review.reviewer.email}`} className="font-medium text-foreground hover:text-brand-600">
                    {review.reviewer.username ?? review.reviewer.name ?? review.reviewer.email}
                  </Link>
                  <span className="text-muted">reviewed</span>
                  <Link href={`/admin/users?q=${review.reviewee.email}`} className="font-medium text-foreground hover:text-brand-600">
                    {review.reviewee.username ?? review.reviewee.name ?? review.reviewee.email}
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <StarRating rating={review.rating} />
                  <span>·</span>
                  <span>{formatDate(review.createdAt)}</span>
                  {review.escrow && (
                    <>
                      <span>·</span>
                      <Link href={`/admin/escrows/${review.escrow.id}`} className="text-brand-500 hover:underline">
                        {review.escrow.listing?.title ?? "View escrow"}
                      </Link>
                    </>
                  )}
                </div>
              </div>
              <AdminActionButtons
                endpoint={`/api/admin/reviews/${review.id}`}
                actions={[
                  {
                    label: "Remove",
                    action: "delete",
                    variant: "danger",
                    method: "DELETE",
                    confirm: "Remove this review? This cannot be undone.",
                  },
                ]}
              />
            </div>
            {review.comment && (
              <p className="whitespace-pre-wrap text-sm text-foreground">{review.comment}</p>
            )}
          </Card>
        ))}
        {reviews.length === 0 && (
          <p className="py-10 text-center text-muted">No reviews yet.</p>
        )}
      </div>

      <AdminPagination page={page} hasMore={hasMore} baseHref="/admin/reviews" />
    </div>
  );
}
