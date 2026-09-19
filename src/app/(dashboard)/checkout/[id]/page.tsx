import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateEscrowFee } from "@/lib/fees";
import { PLATFORM_LABEL } from "@/lib/constants";
import { CheckoutForm } from "@/components/escrow/CheckoutForm";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { offerId?: string; amount?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=/checkout/${params.id}`);

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { seller: { include: { subscriptionPlan: true } } },
  });

  // PENDING is valid for buy-now auction winners — the bid route sets the listing to PENDING
  // to prevent other bidders, but the winning bidder still needs to proceed to checkout.
  const isBuyNowPending =
    listing?.status === "PENDING" &&
    !!(await prisma.auctionBid.findFirst({
      where: {
        listingId: params.id,
        bidderId: session.user.id,
        ...(listing.buyNowPrice ? { amount: { gte: listing.buyNowPrice } } : {}),
      },
    }));

  if (!listing || (!["ACTIVE"].includes(listing.status) && !isBuyNowPending)) notFound();
  if (listing.sellerId === session.user.id) redirect(`/listings/${listing.id}`);

  // Amount: buy-now auction winners pay the buyNowPrice, not the listing base price.
  // For regular listings or accepted offers, listing.price is used.
  let amount = isBuyNowPending && listing.buyNowPrice
    ? Number(listing.buyNowPrice)
    : Number(listing.price);
  let offerId: string | undefined;
  if (searchParams.offerId) {
    const offer = await prisma.offer.findUnique({ where: { id: searchParams.offerId } });
    if (
      offer &&
      offer.listingId === listing.id &&
      offer.buyerId === session.user.id &&
      offer.status === "ACCEPTED"
    ) {
      amount = Number(offer.amount);
      offerId = offer.id;
    }
  }

  const plan = listing.seller.subscriptionPlan;
  const planFeeRate = plan ? Number(plan.escrowFeeRate) : 0.05;
  const { escrowFee, buyerTotal } = calculateEscrowFee(
    amount,
    planFeeRate,
    Number(plan?.minFee ?? 4),
  );

  const [buyer, settings] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.platformSettings.findFirst(),
  ]);

  const highValueThreshold = Number(settings?.highValueEscrowThreshold ?? 500);
  const isHighValue = amount >= highValueThreshold;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold">Escrow checkout</h1>

      {isHighValue && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
          <p className="font-semibold text-warning">High-value escrow</p>
          <p className="mt-1 text-muted">
            Deals over ${highValueThreshold.toFixed(0)} require a brief video verification call with our support team before funds can be released. You&apos;ll be guided through this after the escrow is funded.
          </p>
        </div>
      )}

      <CheckoutForm
        listingId={listing.id}
        listingTitle={listing.title}
        listingPlatform={listing.platform}
        platform={PLATFORM_LABEL[listing.platform]}
        amount={amount}
        escrowFee={escrowFee}
        feeRate={planFeeRate}
        buyerTotal={buyerTotal}
        walletBalance={Number(buyer.walletBalance)}
        offerId={offerId}
        isYouTube={listing.platform === "YOUTUBE"}
      />
    </div>
  );
}
