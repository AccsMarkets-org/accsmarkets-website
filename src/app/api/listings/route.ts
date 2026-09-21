import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createListingSchema, listingFilterSchema } from "@/lib/validation/listing";
import { scoreContent } from "@/lib/moderation";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { sanitizeText } from "@/lib/sanitize";
import { verifyOwnershipToken } from "@/lib/ownership-token";
import { platformRequiresToken } from "@/lib/ownership-platforms";
import { requiresPhoneVerification, phoneVerificationRequiredResponse } from "@/lib/phone-gate";
import type { Prisma } from "@prisma/client";
import { emitToAdmins } from "@/lib/socket";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "true";

  if (mine) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const listings = await prisma.listing.findMany({
      where: { sellerId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }).catch(() => []);
    return NextResponse.json({ listings });
  }

  const parsed = listingFilterSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  }
  const { platform, minPrice, maxPrice, minFollowers, monetized, verifiedOnly, sort, page } = parsed.data;

  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    // Private listings are invite-only — never surface them in public browse/search,
    // regardless of who's asking. Invited buyers reach them via direct link instead.
    isPrivate: false,
    ...(platform && { platform }),
    ...(monetized !== undefined && { monetized }),
    ...(minFollowers !== undefined && { followers: { gte: minFollowers } }),
    ...((minPrice !== undefined || maxPrice !== undefined) && {
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    }),
    ...(verifiedOnly && { seller: { kycLevel: { in: ["PHONE", "ID_VERIFIED"] } } }),
  };

  // For default sort, promoted listings float first (isPremiumFeatured → isFeatured → isPinned → createdAt).
  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    sort === "price_asc"
      ? [{ price: "asc" }]
      : sort === "price_desc"
        ? [{ price: "desc" }]
        : sort === "followers"
          ? [{ followers: "desc" }]
          : [
              { isPremiumFeatured: "desc" },
              { isFeatured: "desc" },
              { isPinned: "desc" },
              { createdAt: "desc" },
            ];

  try {
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          seller: { select: { username: true, name: true, verifiedBadge: true, trustScore: true, countryCode: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);
    return NextResponse.json({ listings, total, page, pageSize: PAGE_SIZE });
  } catch {
    return NextResponse.json({ listings: [], total: 0, page, pageSize: PAGE_SIZE }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(
    `listing-create:${session.user.id}`,
    RATE_LIMITS.LISTING_CREATION.limit,
    RATE_LIMITS.LISTING_CREATION.windowSeconds,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many listings created recently. Try again later." }, { status: 429 });
  }

  if (await requiresPhoneVerification(session.user.id)) {
    return NextResponse.json(phoneVerificationRequiredResponse(), { status: 403 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: { subscriptionPlan: true },
  });

  // Buyer-only accounts cannot create listings
  if (user.primaryIntent === "BUYER") {
    return NextResponse.json(
      { error: "Your account is set to Buyer mode. Switch to a Seller or Buyer & Seller account to create listings." },
      { status: 403 },
    );
  }

  // Gate at PHONE level — users must verify a phone number before creating listings.
  if (user.kycLevel === "NONE" || user.kycLevel === "EMAIL") {
    return NextResponse.json(
      { error: "Verify your phone number before creating a listing. Go to Settings → Verification." },
      { status: 403 },
    );
  }

  const activeCount = await prisma.listing.count({
    where: { sellerId: user.id, status: { in: ["DRAFT", "PENDING", "ACTIVE"] } },
  });
  const limit = user.subscriptionPlan?.listingLimit ?? 3;
  if (activeCount >= limit) {
    return NextResponse.json(
      { error: `Your ${user.subscriptionPlan?.name ?? "FREE"} plan allows up to ${limit} listings. Upgrade to add more.` },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const title = sanitizeText(data.title);
  const description = sanitizeText(data.description);

  const moderation = scoreContent(`${title} ${description}`, "listing");

  // Resolve ownership verification.
  // Platforms with automated checks (YouTube, Instagram, TikTok, etc.) MUST provide a signed
  // server token — client-reported ownershipVerified:true is ignored for those platforms.
  let ownershipVerified = false;
  let ownershipMethod: string | undefined;
  let verifiedPlatformId: string | undefined;
  let ownershipVerifiedAt: Date | undefined;

  if (data.ownershipToken) {
    const claim = verifyOwnershipToken(data.ownershipToken, user.id, data.accountUrl);
    if (claim) {
      ownershipVerified = true;
      ownershipMethod = claim.method;
      verifiedPlatformId = claim.platformId;
      ownershipVerifiedAt = new Date();
    }
  } else if (!platformRequiresToken(data.platform)) {
    // Manual-only platforms (Snapchat, Pinterest, LinkedIn, Website) — trust the client flag
    ownershipVerified = data.ownershipVerified ?? false;
  }

  let listing;
  try {
    listing = await prisma.listing.create({
      data: {
        sellerId: user.id,
        platform: data.platform,
        accountUrl: data.accountUrl,
        title,
        description,
        price: data.price,
        followers: data.followers,
        engagementRate: data.engagementRate,
        accountAgeMonths: data.accountAgeMonths,
        monetized: data.monetized ?? false,
        lifetimeViews: data.lifetimeViews,
        lifetimeRevenue: data.lifetimeRevenue,
        channelRpm: data.channelRpm,
        audienceLanguage: data.audienceLanguage,
        channelCreationDate: data.channelCreationDate ? new Date(data.channelCreationDate) : undefined,
        strikeCount: data.strikeCount ?? 0,
        warningCount: data.warningCount ?? 0,
        strikeWarningContext: data.strikeWarningContext ?? null,
        adsenseStatus: data.adsenseStatus ?? null,
        niche: data.niche ?? null,
        displayName: data.displayName ?? null,
        accountLogo: data.logoUrl ?? null,
        screenshots: data.screenshots,
        ownershipVerificationCode: data.ownershipVerificationCode,
        ownershipVerified,
        ownershipMethod,
        verifiedPlatformId,
        ownershipVerifiedAt,
        saleType: data.saleType ?? "FIXED",
        isPrivate: data.isPrivate ?? false,
        auctionEndsAt: data.auctionEndsAt ? new Date(data.auctionEndsAt) : undefined,
        reservePrice: data.reservePrice ?? undefined,
        buyNowPrice: data.buyNowPrice ?? undefined,
        minBidIncrement: data.minBidIncrement ?? undefined,
        moderationScore: moderation.score,
        status: moderation.blocked ? "DRAFT" : "PENDING",
        rejectionReason: moderation.blocked
          ? `Automatically flagged (${moderation.flags.join(", ")}). Edit your listing to remove flagged content and resubmit.`
          : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }

  if (!moderation.blocked) {
    // Notify online admins that a new listing is awaiting review.
    emitToAdmins("admin_queue_update", { type: "new_listing", listingId: listing.id });

    prisma.activityEvent.create({
      data: {
        userId: user.id,
        type: "listing.created",
        metadata: { listingId: listing.id, title: listing.title, platform: listing.platform },
        isPublic: true,
      },
    }).catch(() => null);
  }

  return NextResponse.json({ listing, blocked: moderation.blocked }, { status: moderation.blocked ? 422 : 201 });
}
