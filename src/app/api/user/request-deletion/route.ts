import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Check for open escrows or unresolved disputes — deletion is blocked until resolved
  const openEscrow = await prisma.escrow.findFirst({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
      status: { in: ["FUNDED", "SUBMITTED", "VERIFIED", "IN_TRANSFER", "DISPUTED"] },
    },
  });
  if (openEscrow) {
    return NextResponse.json(
      { error: "You have an open escrow. Please resolve it before requesting account deletion." },
      { status: 409 },
    );
  }

  const existing = await prisma.dataErasureRequest.findFirst({
    where: { userId, status: { in: ["PENDING", "REVIEWING"] } },
  });
  if (existing) {
    return NextResponse.json({ error: "A deletion request is already under review." }, { status: 409 });
  }

  await prisma.dataErasureRequest.create({ data: { userId, status: "PENDING" } });

  return NextResponse.json({
    ok: true,
    message:
      "Your deletion request has been submitted. An admin will review it within 30 days. Note: transaction history required for financial compliance will be retained in anonymized form.",
  });
}
