import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PLATFORM_LABEL } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export default async function WatchlistPage() {
  const session = await getServerSession(authOptions);

  const items = await prisma.watchlist.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: { seller: { select: { username: true, name: true, verifiedBadge: true, trustScore: true, countryCode: true } } },
      },
    },
  });

  const activeItems = items.filter((i) => i.listing.status === "ACTIVE");
  const unavailableItems = items.filter((i) => i.listing.status !== "ACTIVE");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Saved listings</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl">🔖</span>
          <p className="text-lg font-semibold">Nothing saved yet</p>
          <p className="text-sm text-muted">Tap the heart on any listing to save it here.</p>
          <Link href="/listings">
            <Button variant="outline">Browse listings</Button>
          </Link>
        </div>
      ) : (
        <>
          {activeItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeItems.map((item) => (
                <ListingCard
                  key={item.listing.id}
                  listing={item.listing as Parameters<typeof ListingCard>[0]["listing"]}
                  showWatchlistHeart
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">All your saved listings are no longer available.</p>
          )}

          {unavailableItems.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted uppercase tracking-wide">
                No longer available ({unavailableItems.length})
              </h2>
              <div className="flex flex-col gap-2">
                {unavailableItems.map((item) => {
                  const statusLabels: Record<string, string> = {
                    SOLD: "Sold",
                    SUSPENDED: "Suspended",
                    REJECTED: "Rejected",
                    EXPIRED: "Expired",
                    DRAFT: "Draft",
                    PENDING: "Pending review",
                  };
                  return (
                    <Card key={item.listing.id} className="flex items-center gap-3 opacity-60">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.listing.title}</p>
                        <p className="text-xs text-muted">
                          {PLATFORM_LABEL[item.listing.platform]} · {formatCurrency(item.listing.price.toString())}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted border border-surface-border">
                        {statusLabels[item.listing.status] ?? item.listing.status}
                      </span>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
