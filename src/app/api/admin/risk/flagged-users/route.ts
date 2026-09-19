import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("dismiss") }),
  z.object({ action: z.literal("escalate"), reason: z.string().min(10) }),
]);

export async function GET(req: NextRequest) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const severity = searchParams.get("severity");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 20;

  const where = severity
    ? { severity: severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", dismissedAt: null }
    : { score: { gt: 0 }, dismissedAt: null };

  const [total, riskScores] = await Promise.all([
    prisma.riskScore.count({ where }),
    prisma.riskScore.findMany({
      where,
      orderBy: { score: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, username: true, email: true, createdAt: true } },
      },
    }),
  ]);

  return NextResponse.json({ riskScores, total, page, limit });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (parsed.data.action === "dismiss") {
    await prisma.riskScore.update({
      where: { userId },
      data: { dismissedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  // escalate — create a CRITICAL security flag
  await prisma.securityFlag.create({
    data: {
      userId,
      source: "admin_escalation",
      severity: "CRITICAL",
      reason: parsed.data.reason,
    },
  });
  return NextResponse.json({ ok: true });
}
