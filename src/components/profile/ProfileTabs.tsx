"use client";

import { useState } from "react";
import { ListingCard } from "@/components/listings/ListingCard";
import { StarRating } from "@/components/ui/StarRating";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

interface ProfileTabsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listings: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reviews: any[];
  sellerUsername: string | null;
  sellerName: string | null;
  sellerVerifiedBadge: string;
}

export function ProfileTabs({ listings, reviews, sellerUsername, sellerName, sellerVerifiedBadge }: ProfileTabsProps) {
  const [tab, setTab] = useState<"listings" | "reviews">("listings");

  return (
    <div className="px-4 pt-4">
      {/* Tab switcher */}
      <div className="mb-4 flex border-b border-surface-border">
        {(["listings", "reviews"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`mr-4 pb-2 text-sm font-medium transition-colors capitalize border-b-2 -mb-px ${
              tab === t
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t === "listings"
              ? `Listings${listings.length > 0 ? ` (${listings.length})` : ""}`
              : `Reviews${reviews.length > 0 ? ` (${reviews.length})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "listings" && (
        listings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {listings.map((listing: any) => (
              <ListingCard
                key={listing.id}
                listing={{
                  id: listing.id,
                  title: listing.title,
                  platform: listing.platform,
                  price: Number(listing.price),
                  followers: listing.followers ?? null,
                  monetized: listing.monetized,
                  screenshots: Array.isArray(listing.screenshots) ? listing.screenshots as string[] : [],
                  accountLogo: listing.accountLogo ?? null,
                  isFeatured: listing.isFeatured,
                  isPremiumFeatured: listing.isPremiumFeatured,
                  isPinned: listing.isPinned,
                  seller: {
                    username: sellerUsername,
                    name: sellerName,
                    verifiedBadge: sellerVerifiedBadge as never,
                  },
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No active listings.</p>
        )
      )}

      {tab === "reviews" && (
        reviews.length > 0 ? (
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {reviews.map((r: any) => (
              <Card key={r.id}>
                <div className="flex items-center gap-2">
                  <StarRating value={r.rating} size={14} />
                  <span className="text-sm font-medium">{r.reviewer.username ?? r.reviewer.name ?? "user"}</span>
                  <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-foreground">{r.comment}</p>}
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No reviews yet.</p>
        )
      )}
    </div>
  );
}
