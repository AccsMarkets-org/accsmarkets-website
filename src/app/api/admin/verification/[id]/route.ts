import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { kycApprovedTemplate, kycRejectedTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireAdmin("MANAGE_KYC");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const { action, reason } = parsed.data;
  const submission = await prisma.kycSubmission.findUnique({ where: { id: params.id } });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const submissionUser = await prisma.user.findUnique({
    where: { id: submission.userId },
    select: { email: true, name: true },
  });

  if (action === "approve") {
    try {
      await prisma.$transaction([
        prisma.kycSubmission.update({
          where: { id: params.id },
          data: { status: "APPROVED", reviewedAt: new Date() },
        }),
        prisma.user.update({
          where: { id: submission.userId },
          data: { kycLevel: "ID_VERIFIED" },
        }),
      ]);
    } catch {
      return NextResponse.json({ error: "Failed to approve submission" }, { status: 500 });
    }
    await createNotification({
      userId: submission.userId,
      type: "SYSTEM",
      title: "ID verification approved",
      body: "Your identity has been verified. Your account is now fully verified.",
      link: "/dashboard/settings",
    });
    if (submissionUser?.email) {
      const tpl = kycApprovedTemplate(submissionUser.name ?? "there", "ID Verified");
      sendEmail({ to: submissionUser.email, subject: tpl.subject, html: tpl.html }).catch(() => null);
    }
    await auditLog(prisma, session.user.id, "kyc.approve", "KycSubmission", params.id, { userId: submission.userId }).catch(() => null);
  } else {
    if (!reason) return NextResponse.json({ error: "Rejection reason required" }, { status: 400 });
    try {
      await prisma.kycSubmission.update({
        where: { id: params.id },
        data: { status: "REJECTED", rejectionReason: reason, reviewedAt: new Date() },
      });
    } catch {
      return NextResponse.json({ error: "Failed to reject submission" }, { status: 500 });
    }
    await createNotification({
      userId: submission.userId,
      type: "SYSTEM",
      title: "ID verification rejected",
      body: `Your submission was rejected: ${reason}. Please resubmit.`,
      link: "/dashboard/settings/verification",
    });
    if (submissionUser?.email) {
      const tpl = kycRejectedTemplate(submissionUser.name ?? "there", reason, params.id);
      sendEmail({ to: submissionUser.email, subject: tpl.subject, html: tpl.html }).catch(() => null);
    }
    await auditLog(prisma, session.user.id, "kyc.reject", "KycSubmission", params.id, { userId: submission.userId, reason }).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
