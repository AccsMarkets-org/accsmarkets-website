import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("anonymize"), adminNotes: z.string().min(5) }),
  z.object({ action: z.literal("deny"), adminNotes: z.string().min(5) }),
  z.object({ action: z.literal("mark_reviewing") }),
]);

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const request = await prisma.dataErasureRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { action } = parsed.data;

  if (action === "mark_reviewing") {
    await prisma.dataErasureRequest.update({ where: { id: params.id }, data: { status: "REVIEWING" } });
    return NextResponse.json({ ok: true });
  }

  const adminNotes = (parsed.data as { adminNotes: string }).adminNotes;

  if (action === "deny") {
    await prisma.dataErasureRequest.update({
      where: { id: params.id },
      data: { status: "DENIED", completedAt: new Date(), adminNotes },
    });
    return NextResponse.json({ ok: true });
  }

  // anonymize — scrub PII, retain financial skeleton
  try {
    await prisma.$transaction(async (tx) => {
      const userId = request.userId;
      const anon = `deleted_${userId.slice(0, 8)}`;

      await tx.user.update({
        where: { id: userId },
        data: {
          email: `${anon}@deleted.invalid`,
          name: "Deleted User",
          username: anon,
          image: null,
          password: null,
          bio: null,
          socialLinks: undefined,
          isBanned: true,
          bannedReason: "Account deleted by request",
        },
      });

      // Suspend active/pending listings so they no longer appear on the marketplace
      await tx.listing.updateMany({
        where: { sellerId: userId, status: { in: ["ACTIVE", "DRAFT", "PENDING"] } },
        data: { status: "SUSPENDED" as const },
      });

      // Delete PII-heavy rows; retain transaction/escrow records (financial audit)
      await tx.message.deleteMany({ where: { senderId: userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.activeSession.deleteMany({ where: { userId } });
      await tx.twoFactorAuth.deleteMany({ where: { userId } });
      await tx.phoneVerification.deleteMany({ where: { userId } });
      await tx.kycSubmission.deleteMany({ where: { userId } });
      await tx.cookieConsent.deleteMany({ where: { userId } });
      await tx.termsAcceptance.deleteMany({ where: { userId } });

      await tx.dataErasureRequest.update({
        where: { id: params.id },
        data: { status: "COMPLETED", completedAt: new Date(), adminNotes },
      });
    });

    await auditLog(prisma, session.user.id, "erasure.anonymize", "DataErasureRequest", params.id, { adminNotes });
    logger.info("erasure.completed", { requestId: params.id, adminId: session.user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("erasure.failed", { requestId: params.id, err: String(err) });
    return NextResponse.json({ error: "Anonymization failed" }, { status: 500 });
  }
}
