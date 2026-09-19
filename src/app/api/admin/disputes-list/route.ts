import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const session = await requireAdmin("MANAGE_DISPUTES");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "OPEN";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

  const validStatuses = ["OPEN", "UNDER_REVIEW", "RESOLVED_BUYER", "RESOLVED_SELLER", "CLOSED"];
  const statusFilter = validStatuses.includes(status) ? status : "OPEN";

  const disputes = await prisma.dispute.findMany({
    where: { status: statusFilter },
    orderBy: status === "OPEN" || status === "UNDER_REVIEW" ? { createdAt: "asc" } : { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    include: {
      escrow: {
        include: {
          listing: { select: { title: true, platform: true } },
          buyer: { select: { id: true, username: true, email: true } },
          seller: { select: { id: true, username: true, email: true } },
        },
      },
    },
  });

  const hasMore = disputes.length > PAGE_SIZE;
  return NextResponse.json({ disputes: disputes.slice(0, PAGE_SIZE), hasMore, page });
}
