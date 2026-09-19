import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/kyb — list pending KYB submissions
export async function GET(_req: NextRequest) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const submissions = await prisma.kybSubmission.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { createdAt: "asc" },
    include: { org: { select: { id: true, name: true, ownerId: true, owner: { select: { email: true, username: true } } } } },
  });

  return NextResponse.json({ submissions });
}
