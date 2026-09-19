import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, auditLog } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const reviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().min(5) }),
  z.object({ action: z.literal("request_info"), reason: z.string().min(5) }),
]);

// PUT /api/admin/kyb/[id] — approve/reject a KYB submission
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const submission = await prisma.kybSubmission.findUnique({
    where: { id: params.id },
    select: { id: true, orgId: true },
  });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { action } = parsed.data;

  if (action === "approve") {
    await prisma.$transaction(async (tx) => {
      await tx.kybSubmission.update({
        where: { id: params.id },
        data: { status: "APPROVED", reviewedAt: new Date() },
      });
      await tx.organization.update({
        where: { id: submission.orgId },
        data: { kybStatus: "APPROVED" },
      });
    });
    logger.info("kyb.approved", { submissionId: params.id, adminId: session.user.id });
    await auditLog(prisma, session.user.id, "kyb.approve", "KybSubmission", params.id, { orgId: submission.orgId });
  } else {
    const reason = (parsed.data as { reason: string }).reason;
    const newStatus = action === "reject" ? "REJECTED" : "SUBMITTED";
    const orgKybStatus = action === "reject" ? "REJECTED" : "SUBMITTED";
    await prisma.$transaction(async (tx) => {
      await tx.kybSubmission.update({
        where: { id: params.id },
        data: { status: newStatus, rejectionReason: reason, reviewedAt: new Date() },
      });
      await tx.organization.update({
        where: { id: submission.orgId },
        data: { kybStatus: orgKybStatus as never },
      });
    });
    logger.info(`kyb.${action}`, { submissionId: params.id, adminId: session.user.id, reason });
    await auditLog(prisma, session.user.id, `kyb.${action}`, "KybSubmission", params.id, { orgId: submission.orgId, reason });
  }

  return NextResponse.json({ ok: true });
}
