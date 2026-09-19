import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const escrow = await prisma.escrow.findUnique({ where: { id: params.id } });
  if (!escrow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (escrow.buyerId !== session.user.id && escrow.sellerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!escrow.videoVerificationRequired) {
    return NextResponse.json({ error: "Video verification is not required for this escrow" }, { status: 400 });
  }

  if (escrow.videoVerificationCompletedAt) {
    return NextResponse.json({ error: "Video verification already logged" }, { status: 409 });
  }

  try {
    await prisma.escrow.update({
      where: { id: params.id },
      data: { videoVerificationCompletedAt: new Date() },
    });
  } catch {
    return NextResponse.json({ error: "Failed to update escrow" }, { status: 500 });
  }

  // Notify both parties
  const otherUserId = session.user.id === escrow.buyerId ? escrow.sellerId : escrow.buyerId;
  await createNotification({
    userId: otherUserId,
    type: "ESCROW",
    title: "Video verification completed",
    body: "The verification call for this escrow has been logged.",
    link: `/dashboard/escrows/${escrow.id}`,
  });

  return NextResponse.json({ ok: true });
}
