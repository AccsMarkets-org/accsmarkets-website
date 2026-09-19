import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

export async function GET(req: NextRequest) {
  const session = await requireAdmin("MANAGE_ESCROWS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const filter = searchParams.get("filter") ?? "active";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

  const where =
    filter === "disputed"
      ? { status: "DISPUTED" as const }
      : filter === "completed"
      ? { status: "COMPLETED" as const }
      : { status: { in: ["FUNDED", "SUBMITTED", "VERIFIED", "IN_TRANSFER", "PENDING_VERIFICATION"] as import("@prisma/client").EscrowStatus[] } };

  const escrows = await prisma.escrow.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      listing: { select: { title: true } },
      buyer: { select: { id: true, username: true, email: true } },
      seller: { select: { id: true, username: true, email: true } },
      dispute: { select: { id: true, status: true } },
    },
  });

  return NextResponse.json({ escrows, page });
}
