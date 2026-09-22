import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { createOfferSchema } from "@/lib/validation/offer";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS, OFFER_EXPIRY_HOURS } from "@/lib/constants";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { offerReceivedTemplate } from "@/lib/email-templates";
import { formatCurrency } from "@/lib/utils";
import { requiresPhoneVerification, phoneVerificationRequiredResponse } from "@/lib/phone-gate";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") === "sent" ? "sent" : "received";

  try {
    // Lazy expiry: mark stale PENDING offers EXPIRED on read (no cron needed in M1).
    await prisma.offer.updateMany({
      where: {
        [type === "sent" ? "buyerId" : "sellerId"]: session.user.id,
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    }).catch(() => null);

    const offers = await prisma.offer.findMany({
      where: {
        ...(type === "sent" ? { buyerId: session.user.id } : { sellerId: session.user.id }),
        // Exclude seller-initiated chat offers — they show Accept/Decline inside the chat UI,
        // not here. Without this, they appear on the wrong tab with wrong buttons.
        chatOfferMessages: { none: {} },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        listing: { select: { id: true, title: true, price: true, platform: true, status: true } },
        buyer: { select: { id: true, username: true, name: true } },
        escrow: { select: { id: true } },
      },
    });
    return NextResponse.json({ offers });
  } catch {
    return NextResponse.json({ offers: [] }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(
    `offers:${session.user.id}`,
    RATE_LIMITS.OFFERS.limit,
    RATE_LIMITS.OFFERS.windowSeconds,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many offers sent. Slow down and try again shortly." }, { status: 429 });
  }

  if (await requiresPhoneVerification(session.user.id)) {
    return NextResponse.json(phoneVerificationRequiredResponse(), { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { listingId, amount, message } = parsed.data;

  const [listing, buyer] = await Promise.all([
    prisma.listing.findUnique({ where: { id: listingId } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { walletBalance: true } }),
  ]);

  if (!listing || listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "This listing is not available for offers." }, { status: 400 });
  }
  if (listing.sellerId === session.user.id) {
    return NextResponse.json({ error: "You can't make an offer on your own listing." }, { status: 400 });
  }

  const balance = Number(buyer?.walletBalance ?? 0);
  if (balance < amount) {
    return NextResponse.json({
      error: `Insufficient wallet balance. You have $${balance.toFixed(2)} but this offer requires $${amount.toFixed(2)}. Please deposit funds first.`,
    }, { status: 400 });
  }

  const existingPending = await prisma.offer.findFirst({
    where: { listingId, buyerId: session.user.id, status: "PENDING" },
  });
  if (existingPending) {
    return NextResponse.json({ error: "You already have a pending offer on this listing." }, { status: 409 });
  }

  let offer;
  try {
    offer = await prisma.offer.create({
      data: {
        listingId,
        buyerId: session.user.id,
        sellerId: listing.sellerId,
        amount,
        message,
        expiresAt: new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000),
      },
    });
  } catch (err) {
    // The findFirst check above is a fast-path for the common case; it isn't
    // itself race-safe (a concurrent request can pass it before this insert
    // commits). The database's own pendingDedupeKey unique index (see
    // schema.prisma note on the Offer model) is the actual guard — P2002 here
    // means a second PENDING offer for this listing+buyer landed first.
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "You already have a pending offer on this listing." }, { status: 409 });
    }
    throw err;
  }

  const seller = await prisma.user.findUnique({ where: { id: listing.sellerId } });
  if (seller) {
    await createNotification({
      userId: seller.id,
      type: "OFFER",
      title: "New offer received",
      body: `${formatCurrency(amount)} offer on "${listing.title}"`,
      link: "/dashboard/offers",
    });
    const { subject, html } = offerReceivedTemplate(seller.name ?? "there", listing.title, formatCurrency(amount));
    // Offer is already saved — a mail/queue failure must not become a 500.
    await sendEmail({ to: seller.email, subject, html }).catch(() => null);
  }

  return NextResponse.json({ offer }, { status: 201 });
}
