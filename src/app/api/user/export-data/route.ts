import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { appUrl } from "@/lib/email-render";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Prevent duplicate pending requests
  const existing = await prisma.dataExportRequest.findFirst({
    where: { userId, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json({ error: "A data export is already in progress." }, { status: 409 });
  }

  const request = await prisma.dataExportRequest.create({
    data: { userId, status: "PENDING" },
  });

  // Fire-and-forget: assemble archive and notify by email
  void assembleAndNotify(userId, request.id, session.user.email!);

  return NextResponse.json({ ok: true, message: "Export started — you will receive an email when it is ready." });
}

async function assembleAndNotify(userId: string, requestId: string, email: string) {
  try {
    const [user, listings, escrows, transactions, reviews, messages] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, username: true, createdAt: true, kycLevel: true },
      }),
      prisma.listing.findMany({ where: { sellerId: userId }, select: { id: true, title: true, platform: true, price: true, status: true, createdAt: true } }),
      prisma.escrow.findMany({
        where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
        select: { id: true, status: true, amount: true, createdAt: true },
      }),
      prisma.transaction.findMany({ where: { userId }, select: { id: true, type: true, amount: true, status: true, createdAt: true } }),
      prisma.review.findMany({ where: { OR: [{ reviewerId: userId }, { revieweeId: userId }] }, select: { id: true, rating: true, comment: true, createdAt: true } }),
      prisma.message.findMany({ where: { senderId: userId }, select: { id: true, content: true, createdAt: true } }),
    ]);

    const archive = { user, listings, escrows, transactions, reviews, messages, exportedAt: new Date().toISOString() };
    const json = JSON.stringify(archive, null, 2);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Stored as the raw JSON text (not a data-URI -- base64 adds ~33% for no
    // benefit once the value has room to fit, and a raw string lets the
    // download route set correct download headers instead of relying on the
    // browser's data: URI handling, which some browsers restrict).
    // When a storage bucket (S3/R2/GCS) is configured, this can move to an
    // actual pre-signed upload instead of storing the payload in the DB row.
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: "READY", completedAt: new Date(), expiresAt, downloadUrl: json },
    });

    const downloadPageUrl = `${appUrl()}/dashboard/settings/privacy`;
    await sendEmail({
      to: email,
      subject: "Your AccsMarkets data export is ready",
      html: `<p>Your personal data export is ready. It includes your profile, listings (${listings.length}), escrows (${escrows.length}), transactions (${transactions.length}), reviews, and messages.</p><p><a href="${downloadPageUrl}">Sign in and download it from Settings → Privacy</a>.</p><p><em>This export will expire in 7 days. The download requires you to be signed in, so the file can only be fetched by you.</em></p>`,
    });
  } catch (err) {
    logger.error("data_export.failed", { userId, requestId, err: String(err) });
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: "EXPIRED" },
    }).catch(() => undefined);
  }
}
