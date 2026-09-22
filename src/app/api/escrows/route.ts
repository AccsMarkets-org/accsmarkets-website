import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createEscrowSchema } from "@/lib/validation/escrow";
import { calculateEscrowFee } from "@/lib/fees";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { createNotification, wantsEmail } from "@/lib/notifications";
import { emitToUser, conversationId } from "@/lib/socket";
import { sendEmail } from "@/lib/email";
import { escrowFundedTemplate, escrowCreatedTemplate } from "@/lib/email-templates";
import { formatCurrency } from "@/lib/utils";
import { upsertRiskScore } from "@/lib/risk";
import { requiresPhoneVerification, phoneVerificationRequiredResponse } from "@/lib/phone-gate";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const escrows = await prisma.escrow.findMany({
    where: { OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }] },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      listing: { select: { id: true, title: true, platform: true } },
      buyer: { select: { id: true, username: true, name: true } },
      seller: { select: { id: true, username: true, name: true } },
    },
  }).catch(() => []);

  return NextResponse.json({ escrows });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(
    `escrow-create:${session.user.id}`,
    RATE_LIMITS.ESCROW_CREATION.limit,
    RATE_LIMITS.ESCROW_CREATION.windowSeconds,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many escrows started recently. Try again later." }, { status: 429 });
  }

  if (await requiresPhoneVerification(session.user.id)) {
    return NextResponse.json(phoneVerificationRequiredResponse(), { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createEscrowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { listingId, offerId, cryptoNetwork, ownershipEmail } = parsed.data;

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { seller: { include: { subscriptionPlan: true } } },
  });

  // PENDING is allowed when this buyer triggered buy-now via a winning auction bid.
  const isBuyNowPending =
    listing?.status === "PENDING" &&
    (await prisma.auctionBid.findFirst({
      where: { listingId: listingId, bidderId: session.user.id },
      orderBy: { amount: "desc" },
    }).then((b) => Boolean(b && listing.buyNowPrice && Number(b.amount) >= Number(listing.buyNowPrice))));

  if (!listing || (!["ACTIVE"].includes(listing.status) && !isBuyNowPending)) {
    return NextResponse.json({ error: "This listing is not available." }, { status: 400 });
  }
  if (listing.sellerId === session.user.id) {
    return NextResponse.json({ error: "You can't buy your own listing." }, { status: 400 });
  }

  // Private listings can only be bought by someone the seller explicitly invited —
  // enforced here too (not just on the listing page) so the API can't be hit directly
  // to skip the invite.
  if (listing.isPrivate) {
    const invited = await prisma.privateListingInvite.findUnique({
      where: { listingId_invitedUserId: { listingId: listing.id, invitedUserId: session.user.id } },
    });
    if (!invited) {
      return NextResponse.json(
        { error: "This is a private listing. You need an invite from the seller to purchase it." },
        { status: 403 },
      );
    }
  }

  // Amount: from the accepted offer when provided, else the listing price. Never client-supplied.
  let amount = Number(listing.price);
  if (offerId) {
    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (
      !offer ||
      offer.listingId !== listing.id ||
      offer.buyerId !== session.user.id ||
      offer.status !== "ACCEPTED"
    ) {
      return NextResponse.json({ error: "Invalid or unaccepted offer." }, { status: 400 });
    }
    const existingEscrowForOffer = await prisma.escrow.findUnique({ where: { offerId } });
    if (existingEscrowForOffer) {
      return NextResponse.json({ error: "An escrow already exists for this offer." }, { status: 409 });
    }
    amount = Number(offer.amount);
  }

  // Fee comes from the seller's plan (spec: buyer pays price + fee, seller gets full price).
  const plan = listing.seller.subscriptionPlan;
  let { escrowFee, buyerTotal } = calculateEscrowFee(
    amount,
    plan ? Number(plan.escrowFeeRate) : 0.05,
    Number(plan?.minFee ?? 4),
  );

  // Apply any active, not-yet-consumed PERCENT_OFF_FEE promo redemption for
  // this buyer. consumedAt: null excludes redemptions already applied to a
  // past escrow — previously this row was deleted on use instead, which also
  // deleted the unique(promoCodeId, userId) constraint's only enforcement
  // point, letting the same code be redeemed and applied again.
  //
  // The checkout form may name a specific code (`promoCode`, entered via the
  // "Have a promo code?" field and already redeemed through POST /api/promo).
  // When it does, that exact redemption must exist and be usable — otherwise we
  // refuse rather than silently charging the full fee the buyer wasn't shown.
  // Without a code we fall back to the buyer's most recent open fee discount.
  const requestedPromoCode =
    body && typeof body === "object" && typeof (body as { promoCode?: unknown }).promoCode === "string"
      ? (body as { promoCode: string }).promoCode.trim()
      : "";
  const promoInclude = { promoCode: { select: { code: true, type: true, value: true, expiresAt: true } } };
  const activePromo = requestedPromoCode
    ? await prisma.promoRedemption.findFirst({
        where: {
          userId: session.user.id,
          consumedAt: null,
          promoCode: { type: "PERCENT_OFF_FEE", code: { in: [requestedPromoCode, requestedPromoCode.toUpperCase()] } },
        },
        include: promoInclude,
      })
    : await prisma.promoRedemption.findFirst({
        where: { userId: session.user.id, consumedAt: null, promoCode: { type: "PERCENT_OFF_FEE" } },
        include: promoInclude,
        orderBy: { redeemedAt: "desc" },
      });
  const promoApplied =
    activePromo?.promoCode.type === "PERCENT_OFF_FEE" &&
    (!activePromo.promoCode.expiresAt || activePromo.promoCode.expiresAt > new Date());
  if (requestedPromoCode && !promoApplied) {
    return NextResponse.json(
      { error: "That promo code can't be applied to this order. Remove it and try again." },
      { status: 400 },
    );
  }
  if (promoApplied) {
    const discount = Math.min(Number(activePromo!.promoCode.value) / 100, 1);
    escrowFee = Math.max(0, Math.round(escrowFee * (1 - discount) * 100) / 100);
    buyerTotal = Math.round((amount + escrowFee) * 100) / 100;
  }

  // Fetch platform-level settings + per-platform policy
  const [settings, transferPolicy] = await Promise.all([
    prisma.platformSettings.findFirst(),
    prisma.platformTransferPolicy.findUnique({ where: { platform: listing.platform } }),
  ]);
  const highValueThreshold = Number(settings?.highValueEscrowThreshold ?? 500);
  const isHighValue = amount >= highValueThreshold;

  // Determine transfer model: manager-add flow when a policy with manager-add exists
  const usesManagerAdd = Boolean(transferPolicy);
  const initialStatus = usesManagerAdd ? "AWAITING_MANAGER_ADD" : "FUNDED";
  const transferModel = usesManagerAdd
    ? (transferPolicy!.allowTrustless ? "TRUSTLESS" : "STANDARD")
    : null;

  try {
    const escrow = await prisma.$transaction(async (tx) => {
      // TOCTOU guard: re-check inside the transaction to prevent double-escrow races
      const liveEscrow = await tx.escrow.findFirst({
        where: {
          listingId: listing.id,
          status: { in: ["FUNDED", "AWAITING_MANAGER_ADD", "PENDING_VERIFICATION", "SUBMITTED", "VERIFIED", "IN_TRANSFER", "DISPUTED"] },
        },
      });
      if (liveEscrow) throw new Error("ESCROW_CONFLICT");

      const buyer = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } });
      if (Number(buyer.walletBalance) < buyerTotal) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const newBalance = Number(buyer.walletBalance) - buyerTotal;
      // Atomic guarded debit: the balance check and the decrement happen as one
      // conditional UPDATE under the row lock the database takes for it, so two
      // concurrent purchases racing on the same starting balance can't both
      // succeed (a plain read-then-write here previously could double-debit).
      const debited = await tx.user.updateMany({
        where: { id: buyer.id, walletBalance: { gte: buyerTotal } },
        data: { walletBalance: { decrement: buyerTotal } },
      });
      if (debited.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const created = await tx.escrow.create({
        data: {
          listingId: listing.id,
          offerId,
          buyerId: buyer.id,
          sellerId: listing.sellerId,
          amount,
          feeAmount: escrowFee,
          totalCharged: buyerTotal,
          status: initialStatus,
          transferModel,
          cryptoNetwork,
          ownershipEmail,
          fundedAt: new Date(),
          // No transferDeadline yet — the countdown only starts once the escrow is
          // verified (admin sets the duration then; see /api/escrows/[id]/verify).
          isHighValue,
          videoVerificationRequired: isHighValue,
        },
      });

      await tx.transaction.create({
        data: {
          userId: buyer.id,
          type: "ESCROW_PAYMENT",
          status: "COMPLETED",
          amount: buyerTotal,
          balanceBefore: buyer.walletBalance,
          balanceAfter: newBalance,
          escrowId: created.id,
        },
      });

      // Remove listing from marketplace immediately — restored if escrow is cancelled.
      await tx.listing.update({
        where: { id: listing.id },
        data: { status: "SOLD" },
      });

      // Consume the promo so it can't be applied to future escrows — marked
      // consumed rather than deleted so the unique(promoCodeId, userId)
      // constraint keeps blocking a second redemption of the same code.
      if (promoApplied && activePromo) {
        await tx.promoRedemption.update({
          where: { id: activePromo.id },
          data: { consumedAt: new Date() },
        });
      }

      return created;
    });

    // Everything past this point is best-effort: the escrow is created and the
    // buyer debited, so a notification/email failure must not turn into a 500
    // (which the client reads as "purchase failed" and retries into a 409).
    await createNotification({
      userId: listing.sellerId,
      type: "ESCROW",
      title: "Escrow funded — action required",
      body: `A buyer funded ${formatCurrency(amount)} for "${listing.title}". Submit transfer details.`,
      link: `/dashboard/escrows/${escrow.id}`,
    }).catch(() => null);
    emitToUser(listing.sellerId, "escrow_funded", { escrowId: escrow.id });
    const { subject, html } = escrowFundedTemplate(
      listing.seller.name ?? "there",
      listing.title,
      formatCurrency(amount),
      escrow.id,
    );
    await sendEmail({ to: listing.seller.email, subject, html, slug: "escrow_funded" }).catch(() => null);

    // Buyer's confirmation — previously only the seller was emailed, so the
    // party who just paid got no receipt of the escrow being opened.
    const buyerUser = await prisma.user
      .findUnique({ where: { id: escrow.buyerId }, select: { email: true, name: true, username: true } })
      .catch(() => null);
    if (buyerUser?.email && (await wantsEmail(escrow.buyerId, "ESCROW").catch(() => true))) {
      const buyerDisplay = buyerUser.name ?? buyerUser.username ?? "there";
      const buyerTpl = escrowCreatedTemplate(
        buyerDisplay,
        listing.title,
        escrowFee > 0
          ? `${formatCurrency(buyerTotal)} (incl. ${formatCurrency(escrowFee)} escrow fee)`
          : formatCurrency(buyerTotal),
        escrow.id,
        buyerDisplay === "there" ? "You" : buyerDisplay,
        listing.seller.name ?? listing.seller.username ?? "The seller",
      );
      sendEmail({ to: buyerUser.email, subject: buyerTpl.subject, html: buyerTpl.html }).catch(() => null);
    }

    // System DM to buyer↔seller thread — appears in messages with the stepper above it
    void prisma.message.create({
      data: {
        conversationId: conversationId(listing.sellerId, escrow.buyerId),
        senderId: listing.sellerId,
        recipientId: escrow.buyerId,
        content: usesManagerAdd
          ? `🔒 Escrow opened for "${listing.title}"\n\nYour payment has been held securely. The progress bar above shows each step. Next: the seller will add the escrow manager email to their account to proceed.`
          : `🔒 Escrow opened for "${listing.title}"\n\nYour payment has been held securely. Track the transfer progress in the bar above — the seller will submit account details to get started.`,
      },
    }).catch(() => null);

    // Fire-and-forget risk re-score for both parties
    void upsertRiskScore(session.user.id);
    void upsertRiskScore(listing.sellerId);

    return NextResponse.json({ escrow }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        { error: "Insufficient wallet balance. Deposit funds first." },
        { status: 400 },
      );
    }
    if (err instanceof Error && err.message === "ESCROW_CONFLICT") {
      return NextResponse.json({ error: "This listing already has an active escrow." }, { status: 409 });
    }
    console.error("[escrow POST]", err);
    return NextResponse.json({ error: "Failed to create escrow. Please try again." }, { status: 500 });
  }
}
