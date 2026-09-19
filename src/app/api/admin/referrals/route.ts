import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAdmin("MANAGE_REFERRALS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0"));
  const pageSize = 50;

  const [total, rewarded, pending, referrals, topReferrers] = await Promise.all([
    prisma.referral.count(),
    prisma.referral.count({ where: { status: "REWARDED" } }),
    prisma.referral.count({ where: { status: "PENDING" } }),
    prisma.referral.findMany({
      skip: page * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        referee: { select: { id: true, name: true, email: true, username: true, createdAt: true } },
        referralCode: {
          include: { user: { select: { id: true, name: true, email: true, username: true } } },
        },
      },
    }),
    prisma.referral.groupBy({
      by: ["referrerId"],
      _count: { _all: true },
      orderBy: { _count: { referrerId: "desc" } },
      take: 10,
    }),
  ]);

  // Enrich top referrers with user info
  const topReferrerIds = topReferrers.map((r) => r.referrerId);
  const topReferrerUsers = await prisma.user.findMany({
    where: { id: { in: topReferrerIds } },
    select: { id: true, name: true, email: true, username: true },
  });
  const userMap = Object.fromEntries(topReferrerUsers.map((u) => [u.id, u]));

  return NextResponse.json({
    stats: { total, rewarded, pending },
    referrals,
    topReferrers: topReferrers.map((r) => ({
      user: userMap[r.referrerId] ?? null,
      count: r._count._all,
    })),
    pagination: { page, pageSize, hasMore: (page + 1) * pageSize < total },
  });
}

const patchSchema = z.object({
  referralId: z.string().min(1),
  action: z.enum(["reward", "reset"]),
});

export async function PATCH(req: Request) {
  const session = await requireAdmin("MANAGE_REFERRALS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { referralId, action } = parsed.data;
  const referral = await prisma.referral.findUnique({ where: { id: referralId } });
  if (!referral) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "reward") {
    await prisma.referral.update({
      where: { id: referralId },
      data: { status: "REWARDED", rewardedAt: new Date() },
    });
  } else {
    await prisma.referral.update({
      where: { id: referralId },
      data: { status: "PENDING", rewardedAt: null },
    });
  }

  await auditLog(prisma, session.user.id, `referral_${action}`, "Referral", referralId, {});
  return NextResponse.json({ ok: true });
}
