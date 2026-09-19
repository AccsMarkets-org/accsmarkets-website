import { prisma } from "@/lib/db";
import { ListingCard } from "@/components/listings/ListingCard";
import type { Platform } from "@prisma/client";

interface SimilarListingsProps {
  currentId: string;
  platform: Platform;
}

export async function SimilarListings({ currentId, platform }: SimilarListingsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listings: any[] = [];
  try {
    listings = await prisma.listing.findMany({
      where: { status: "ACTIVE", platform, id: { not: currentId } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { seller: { select: { username: true, name: true, verifiedBadge: true } } },
    });
  } catch {
    return null;
  }

  if (listings.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold">Similar listings</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {listings.map((l) => (
          <ListingCard
            key={l.id}
            listing={{ ...l, price: l.price.toString() }}
          />
        ))}
      </div>
    </section>
  );
}
