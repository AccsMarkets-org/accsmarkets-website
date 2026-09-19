import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requests = await prisma.dataErasureRequest.findMany({
    where: { status: { in: ["PENDING", "REVIEWING"] } },
    orderBy: { requestedAt: "asc" },
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
    },
  });

  return NextResponse.json(requests);
}
