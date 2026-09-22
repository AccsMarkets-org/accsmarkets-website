import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import type { ReportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await requireAdmin("MANAGE_REPORTS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "PENDING";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0);

  const validStatuses: ReportStatus[] = ["PENDING", "REVIEWING", "RESOLVED", "DISMISSED"];
  const statusFilter = (validStatuses as string[]).includes(status) ? (status as ReportStatus) : undefined;

  const reports = await prisma.report.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    include: {
      reporter: { select: { id: true, username: true, email: true } },
    },
  });

  const hasMore = reports.length > PAGE_SIZE;
  return NextResponse.json({ reports: reports.slice(0, PAGE_SIZE), hasMore, page });
}
