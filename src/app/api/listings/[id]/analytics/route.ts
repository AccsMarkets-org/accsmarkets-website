import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getListingAnalytics } from "@/app/api/listings/_lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Owner-only (or admin) listing analytics:
 * { views, uniqueViews, watchlistAdds, offers, escrows, sold, daysActive,
 *   conversion: { viewToOffer, offerToEscrow }, byDay[30], byCountry[<=10] }
 * plus legacy `viewCount` / `offerCount` for existing callers.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let owner;
  try {
    owner = await prisma.listing.findUnique({ where: { id: params.id }, select: { sellerId: true } });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (owner.sellerId !== session.user.id && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const data = await getListingAnalytics(params.id);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/listings/:id/analytics]", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
