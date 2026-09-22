import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateListingSchema } from "@/lib/validation/listing";
import { scoreContent } from "@/lib/moderation";
import { sanitizeText } from "@/lib/sanitize";
import { createNotification } from "@/lib/notifications";
import { verifyOwnershipToken } from "@/lib/ownership-token";
import { platformRequiresToken } from "@/lib/ownership-platforms";
import type { Prisma } from "@prisma/client";
import {
  deleteBlockReason,
  deleteListingCascade,
  transitionBlockReason,
} from "@/app/api/listings/_lib/transitions";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  let listing;
  try {
    listing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            verifiedBadge: true,
            trustScore: true,
            kycLevel: true,
          },
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const session = await getServerSession(authOptions);
  const isOwnerOrAdmin =
    session?.user && (session.user.id === listing.sellerId || session.user.role === "ADMIN");

  if (listing.status !== "ACTIVE" && listing.status !== "SOLD" && !isOwnerOrAdmin) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Private listings are invite-only — only the seller, an admin, or an explicitly
  // invited user can view them. Everyone else gets the same 404 as a missing listing,
  // so a private listing's existence isn't leaked to people who weren't invited.
  if (listing.isPrivate && !isOwnerOrAdmin) {
    const invited = session?.user
      ? await prisma.privateListingInvite.findUnique({
          where: { listingId_invitedUserId: { listingId: listing.id, invitedUserId: session.user.id } },
        })
      : null;
    if (!invited) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.status === "ACTIVE" && !isOwnerOrAdmin) {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0] : "unknown").trim();
    const viewerHash = createHash("sha256").update(ip).digest("hex");
    const userId = session?.user?.id ?? null;
    // Cloudflare sets CF-IPCountry; Vercel sets x-vercel-ip-country
    const countryCode =
      req.headers.get("cf-ipcountry") ??
      req.headers.get("x-vercel-ip-country") ??
      null;
    // Deduped: one view per viewer per listing per 6h so repeat loads don't inflate.
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const seen = await prisma.listingViewEvent
      .findFirst({ where: { listingId: listing.id, viewerHash, createdAt: { gte: since } }, select: { id: true } })
      .catch(() => null);
    if (!seen) {
      // Fire-and-forget: view tracking must never crash the read path
      prisma.listing.update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } }).catch(() => null);
      prisma.listingViewEvent.create({ data: { listingId: listing.id, viewerHash, userId, countryCode } }).catch(() => null);
    }
  }

  return NextResponse.json({ listing });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (listing.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["DRAFT", "PENDING", "REJECTED", "ACTIVE", "PAUSED"].includes(listing.status)) {
    return NextResponse.json({ error: "This listing can no longer be edited." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const title = data.title != null ? sanitizeText(data.title) : undefined;
  const description = data.description != null ? sanitizeText(data.description) : undefined;

  const titleForModeration = title ?? listing.title;
  const descriptionForModeration = description ?? listing.description;
  const moderation = scoreContent(`${titleForModeration} ${descriptionForModeration}`, "listing");

  // Ownership on edit: a signed token (from /api/listings/verify/*) re-verifies
  // the (possibly new) URL; changing the account URL without one drops the old
  // verification since it was for a different account; a bare client flag is
  // honoured only for manual-review platforms, exactly as on create. Note
  // `ownershipToken` is not a column — it used to reach Prisma through the
  // spread below and 500 every save that included it.
  const ownershipData: Prisma.ListingUpdateInput = {};
  if (data.ownershipToken) {
    const claim = verifyOwnershipToken(data.ownershipToken, session.user.id, data.accountUrl ?? listing.accountUrl);
    if (claim) {
      Object.assign(ownershipData, {
        ownershipVerified: true,
        ownershipMethod: claim.method,
        verifiedPlatformId: claim.platformId ?? null,
        ownershipVerifiedAt: new Date(),
      });
    }
  } else {
    if (data.accountUrl !== undefined && data.accountUrl !== listing.accountUrl) {
      Object.assign(ownershipData, {
        ownershipVerified: false,
        ownershipMethod: null,
        verifiedPlatformId: null,
        ownershipVerifiedAt: null,
      });
    }
    if (data.ownershipVerified !== undefined && !platformRequiresToken(listing.platform)) {
      ownershipData.ownershipVerified = data.ownershipVerified;
    }
  }

  let updated;
  try {
    const { logoUrl, channelCreationDate, ownershipToken: _token, ownershipVerified: _flag, ...restData } = data as any;
    updated = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        ...restData,
        ...ownershipData,
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { accountLogo: logoUrl }),
        ...(channelCreationDate !== undefined && {
          channelCreationDate: channelCreationDate ? new Date(channelCreationDate) : null,
        }),
        moderationScore: moderation.score,
        status: moderation.blocked ? "DRAFT" : "PENDING",
        rejectionReason: moderation.blocked
          ? `Automatically flagged (${moderation.flags.join(", ")}). Edit your listing to remove flagged content and resubmit.`
          : null,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/listings/:id]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update listing" }, { status: 500 });
  }

  // Notify watchers on a genuine price drop (fire-and-forget — never block the seller's save).
  if (data.price !== undefined && Number(data.price) < Number(listing.price)) {
    const oldPrice = Number(listing.price);
    const newPrice = Number(data.price);
    prisma.watchlist
      .findMany({ where: { listingId: listing.id }, select: { userId: true } })
      .then((watchers) =>
        Promise.all(
          watchers.map((w) =>
            createNotification({
              userId: w.userId,
              type: "LISTING",
              title: "Price drop on a listing you're watching 📉",
              body: `"${updated.title}" dropped from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)}.`,
              link: `/listings/${listing.id}`,
            }).catch(() => null),
          ),
        ),
      )
      .catch(() => null);
  }

  return NextResponse.json({ listing: updated, blocked: moderation.blocked });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (listing.sellerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const statusBlock = transitionBlockReason(listing.status, "delete");
  if (statusBlock) {
    return NextResponse.json({ error: statusBlock }, { status: 400 });
  }
  const escrowBlock = await deleteBlockReason(listing.id).catch(() => "Service unavailable");
  if (escrowBlock) {
    return NextResponse.json({ error: escrowBlock }, { status: 400 });
  }

  try {
    await prisma.$transaction((tx) => deleteListingCascade(tx, listing.id));
  } catch {
    return NextResponse.json({ error: "Failed to delete listing" }, { status: 500 });
  }

  prisma.adminAuditLog.create({
    data: {
      adminId: session.user.id,
      action: "LISTING_DELETED",
      targetType: "LISTING",
      targetId: listing.id,
      metadata: { title: listing.title, sellerId: listing.sellerId, status: listing.status },
    },
  }).catch(() => null);

  return NextResponse.json({ success: true });
}
