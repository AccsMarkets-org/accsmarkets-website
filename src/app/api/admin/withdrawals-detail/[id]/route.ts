import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const withdrawal = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, username: true, email: true, walletBalance: true } } },
  });

  if (!withdrawal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(withdrawal);
}
