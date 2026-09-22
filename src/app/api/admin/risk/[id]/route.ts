import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { upsertRiskScore } from "@/lib/risk";

export const dynamic = "force-dynamic";

// [id] is the userId of the risk case.
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("resolve"), flagId: z.string().min(1), note: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("dismiss"), flagId: z.string().min(1), note: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("recompute") }),
  z.object({ action: z.literal("force_signout"), reason: z.string().trim().max(500).optional() }),
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { allowed } = await checkRateLimit(`admin-risk-action:${session.user.id}`, 60, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Too many actions. Slow down and try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid action" }, { status: 400 });
  }
  const data = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, role: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  switch (data.action) {
    case "resolve":
    case "dismiss": {
      const flag = await prisma.securityFlag.findUnique({ where: { id: data.flagId } });
      if (!flag || flag.userId !== user.id) {
        return NextResponse.json({ error: "Flag not found" }, { status: 404 });
      }
      if (flag.resolvedAt) {
        return NextResponse.json({ error: "Flag is already closed." }, { status: 400 });
      }
      await prisma.$transaction(async (tx) => {
        await tx.securityFlag.update({ where: { id: flag.id }, data: { resolvedAt: new Date() } });
        await auditLog(tx, session.user.id, `risk.flag.${data.action}`, "SecurityFlag", flag.id, {
          userId: user.id,
          note: data.note,
          source: flag.source,
          severity: flag.severity,
        });
      });
      return NextResponse.json({ ok: true });
    }

    case "recompute": {
      const result = await upsertRiskScore(user.id);
      if (!result) return NextResponse.json({ error: "Recompute failed" }, { status: 500 });
      await auditLog(prisma, session.user.id, "risk.recompute", "User", user.id, {
        score: result.score,
        severity: result.severity,
      });
      return NextResponse.json({ ok: true, score: result.score, severity: result.severity });
    }

    case "force_signout": {
      if (user.id === session.user.id) {
        return NextResponse.json({ error: "Use Settings → Sessions to sign yourself out." }, { status: 400 });
      }
      // Every live JWT for this account fails its next revalidation (≤ 60s).
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });
        await tx.activeSession.deleteMany({ where: { userId: user.id } });
        await auditLog(tx, session.user.id, "risk.force_signout", "User", user.id, { reason: data.reason });
      });
      return NextResponse.json({ ok: true });
    }
  }
}
