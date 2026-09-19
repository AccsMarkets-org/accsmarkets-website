import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: {
      listing: { select: { platform: true } },
      managerEmail: { select: { id: true, address: true, platform: true } },
    },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  if (escrow.sellerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["FUNDED", "AWAITING_MANAGER_ADD"].includes(escrow.status)) {
    return NextResponse.json({ error: "Escrow is not in a state that requires a manager email." }, { status: 400 });
  }

  // Already allocated — return it
  if (escrow.managerEmail) {
    return NextResponse.json({ email: escrow.managerEmail });
  }

  // Atomically allocate an available pool email for this platform
  try {
    const allocated = await prisma.$transaction(async (tx) => {
      const available = await tx.escrowManagerEmail.findFirst({
        where: { platform: escrow.listing.platform, status: "AVAILABLE" },
      });
      if (!available) throw new Error("NO_POOL_EMAIL");

      await tx.escrowManagerEmail.update({
        where: { id: available.id },
        data: { status: "IN_USE" },
      });
      await tx.escrow.update({
        where: { id: escrow.id },
        data: { managerEmailId: available.id, status: "AWAITING_MANAGER_ADD" },
      });
      return { id: available.id, address: available.address, platform: available.platform };
    });

    return NextResponse.json({ email: allocated });
  } catch (err) {
    if (err instanceof Error && err.message === "NO_POOL_EMAIL") {
      return NextResponse.json(
        { error: "No escrow emails are available for this platform. Please contact support." },
        { status: 503 },
      );
    }
    throw err;
  }
}
