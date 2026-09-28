import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["start_review", "dismiss", "resolve", "ban_user", "warn_user", "remove_listing"]),
  resolution: z.string().optional(),
  // AdminActionButtons' promptReason sends { reason } — accept both names.
  reason: z.string().optional(),
}).transform((v) => ({ ...v, resolution: v.resolution ?? v.reason }));

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_REPORTS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const { action, resolution } = parsed.data;
  const now = new Date();

  try {
    if (action === "start_review") {
      await prisma.$transaction([
        prisma.report.update({ where: { id: params.id }, data: { status: "REVIEWING" } }),
        auditLog(prisma, session.user.id, "report.start_review", "Report", params.id) as never,
      ]);
      return NextResponse.json({ ok: true });
    }

    if (action === "dismiss") {
      await prisma.$transaction([
        prisma.report.update({ where: { id: params.id }, data: { status: "DISMISSED", resolvedAt: now } }),
        auditLog(prisma, session.user.id, "report.dismiss", "Report", params.id) as never,
      ]);
      return NextResponse.json({ ok: true });
    }

    if (action === "resolve") {
      await prisma.$transaction([
        prisma.report.update({
          where: { id: params.id },
          data: { status: "RESOLVED", resolutionAction: resolution, resolvedAt: now },
        }),
        auditLog(prisma, session.user.id, "report.resolve", "Report", params.id, { resolution }) as never,
      ]);
      return NextResponse.json({ ok: true });
    }

    if (action === "ban_user" && report.targetType === "USER") {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: report.targetId },
          data: { isBanned: true, bannedReason: resolution ?? "Reported content violation" },
        });
        await tx.report.update({
          where: { id: params.id },
          data: { status: "RESOLVED", resolutionAction: "ban_user", resolvedAt: now },
        });
        await auditLog(tx, session.user.id, "report.ban_user", "Report", params.id, { targetUserId: report.targetId, reason: resolution });
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "warn_user") {
      const targetUserId = report.targetType === "USER" ? report.targetId : null;
      if (!targetUserId) {
        return NextResponse.json({ error: "warn_user is only valid for USER reports." }, { status: 400 });
      }
      await prisma.$transaction(async (tx) => {
        await tx.notification.create({
          data: {
            userId: targetUserId,
            type: "SECURITY",
            title: "Account warning",
            body: resolution ?? "Your account has received a warning due to a reported content violation.",
          },
        });
        await tx.report.update({
          where: { id: params.id },
          data: { status: "RESOLVED", resolutionAction: "warn_user", resolvedAt: now },
        });
        await auditLog(tx, session.user.id, "report.warn_user", "Report", params.id, { targetUserId, message: resolution });
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "remove_listing" && report.targetType === "LISTING") {
      await prisma.$transaction(async (tx) => {
        await tx.listing.update({
          where: { id: report.targetId },
          data: { status: "SUSPENDED", rejectionReason: resolution ?? "Removed due to reported violation" },
        });
        await tx.report.update({
          where: { id: params.id },
          data: { status: "RESOLVED", resolutionAction: "remove_listing", resolvedAt: now },
        });
        await auditLog(tx, session.user.id, "report.remove_listing", "Report", params.id, { listingId: report.targetId, reason: resolution });
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Action not applicable for this report type." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
