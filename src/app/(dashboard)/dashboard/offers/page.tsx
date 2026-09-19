import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OfferList } from "@/components/offers/OfferList";

export default async function OffersPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [received, sent] = await Promise.all([
    prisma.offer.count({ where: { sellerId: userId, status: "PENDING" } }),
    prisma.offer.count({ where: { buyerId: userId, status: "PENDING" } }),
  ]);

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Offers</h1>
          <p className="mt-0.5 text-sm text-muted">
            {received > 0 && (
              <span className="mr-2 font-medium text-warning">{received} pending received</span>
            )}
            {sent > 0 && (
              <span className="font-medium text-brand-600">{sent} pending sent</span>
            )}
            {received === 0 && sent === 0 && "No pending offers"}
          </p>
        </div>
      </div>
      <OfferList initialType="received" />
    </div>
  );
}
