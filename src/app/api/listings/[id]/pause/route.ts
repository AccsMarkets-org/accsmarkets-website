import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";
import { transitionBlockReason, transitionData } from "@/app/api/listings/_lib/transitions";

export const dynamic = "force-dynamic";

/** ACTIVE → PAUSED. Owner only. Hides the listing from the marketplace without losing approval. */
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

  const blocked = transitionBlockReason(listing.status, "pause");
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 400 });
  }

  let updated;
  try {
    updated = await prisma.listing.update({
      where: { id: listing.id },
      data: transitionData("pause"),
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        action: "LISTING_PAUSED",
        targetType: "LISTING",
        targetId: listing.id,
        metadata: { title: listing.title, sellerId: listing.sellerId },
      },
    }).catch(() => null);

    await createNotification({
      userId: session.user.id,
      type: "LISTING",
      title: "Listing paused",
      body: `"${listing.title}" is hidden from buyers until you resume it.`,
      link: `/dashboard/listings?status=PAUSED`,
    }).catch(() => null);

    emitToUser(session.user.id, "listing_update", {
      listingId: listing.id,
      status: "PAUSED",
    });
  } catch (err) {
    console.error("[POST /api/listings/:id/pause]", err);
    return NextResponse.json({ error: "Failed to pause listing" }, { status: 500 });
  }

  return NextResponse.json({ success: true, listing: updated });
}
