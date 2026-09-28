import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/apps — list apps, optionally filtered by status
export async function GET(req: NextRequest) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const statusParam = req.nextUrl.searchParams.get("status");
  const validStatuses = ["SUBMITTED", "APPROVED", "REJECTED"] as const;
  type AppStatus = typeof validStatuses[number];
  const statusFilter = validStatuses.includes(statusParam as AppStatus)
    ? (statusParam as AppStatus)
    : "SUBMITTED";

  const apps = await prisma.appListing.findMany({
    where: statusParam === "all" ? undefined : { status: statusFilter },
    orderBy: { createdAt: "asc" },
    include: { developer: { select: { id: true, username: true, email: true } } },
  });

  return NextResponse.json({ apps });
}
