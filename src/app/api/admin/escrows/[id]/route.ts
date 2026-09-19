import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_ESCROWS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: {
      listing: { select: { title: true, platform: true } },
      buyer: { select: { id: true, username: true, email: true } },
      seller: { select: { id: true, username: true, email: true } },
      dispute: { select: { id: true, reason: true, status: true } },
    },
  });

  if (!escrow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(escrow);
}
