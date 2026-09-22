import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";
import { transitionBlockReason, transitionData } from "@/app/api/listings/_lib/transitions";

export const dynamic = "force-dynamic";

/**
 * PAUSED → ACTIVE. Owner only. No admin re-review: the listing was already
 * approved before it was paused and its content has not changed (an edit while
 * paused goes through PATCH, which resubmits as PENDING).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let listing;
  try {
    listing = await prisma.listing.findUnique({ where: { id: params.id } });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = transitionBlockReason(listing.status, "unpause");
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 400 });
  }

  let updated;
  try {
    updated = await prisma.listing.update({
      where: { id: listing.id },
      data: transitionData("unpause"),
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        action: "LISTING_UNPAUSED",
        targetType: "LISTING",
        targetId: listing.id,
        metadata: { title: listing.title, sellerId: listing.sellerId },
      },
    }).catch(() => null);

    await createNotification({
      userId: session.user.id,
      type: "LISTING",
      title: "Listing resumed",
      body: `"${listing.title}" is live in the marketplace again.`,
      link: `/dashboard/listings`,
    }).catch(() => null);

    emitToUser(session.user.id, "listing_update", {
      listingId: listing.id,
      status: "ACTIVE",
    });
  } catch (err) {
    console.error("[POST /api/listings/:id/unpause]", err);
    return NextResponse.json({ error: "Failed to resume listing" }, { status: 500 });
  }

  return NextResponse.json({ success: true, listing: updated });
}
