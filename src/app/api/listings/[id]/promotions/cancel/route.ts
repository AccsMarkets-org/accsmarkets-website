import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";

export const dynamic = "force-dynamic";

/**
 * Clears every active boost flag on a listing (featured / premium / pinned).
 * No refund — promotion purchases are final; the UI states this in its confirm.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let listing;
  try {
    listing = await prisma.listing.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        sellerId: true,
        isFeatured: true,
        isPremiumFeatured: true,
        isPinned: true,
        featuredUntil: true,
        pinnedUntil: true,
      },
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (listing.sellerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!listing.isFeatured && !listing.isPremiumFeatured && !listing.isPinned) {
    return NextResponse.json({ error: "This listing has no active boost." }, { status: 400 });
  }

  let updated;
  try {
    updated = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        isFeatured: false,
        isPremiumFeatured: false,
        isPinned: false,
        featuredUntil: null,
        pinnedUntil: null,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        action: "LISTING_PROMOTION_CANCELLED",
        targetType: "LISTING",
        targetId: listing.id,
        metadata: {
          title: listing.title,
          sellerId: listing.sellerId,
          cleared: {
            isFeatured: listing.isFeatured,
            isPremiumFeatured: listing.isPremiumFeatured,
            isPinned: listing.isPinned,
            featuredUntil: listing.featuredUntil,
            pinnedUntil: listing.pinnedUntil,
          },
        },
      },
    }).catch(() => null);

    await createNotification({
      userId: session.user.id,
      type: "LISTING",
      title: "Boost cancelled",
      body: `Promotion removed from "${listing.title}". Unused time is not refunded.`,
      link: "/dashboard/promotions",
    }).catch(() => null);

    emitToUser(session.user.id, "listing_update", { listingId: listing.id, promotion: "CANCELLED" });
  } catch (err) {
    console.error("[POST /api/listings/:id/promotions/cancel]", err);
    return NextResponse.json({ error: "Failed to cancel boost" }, { status: 500 });
  }

  return NextResponse.json({ success: true, listing: updated });
}
