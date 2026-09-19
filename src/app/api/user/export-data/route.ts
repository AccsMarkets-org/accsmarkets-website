import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

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

    // When a storage bucket (S3/R2/GCS) is configured, upload `json` there and store a
    // time-limited pre-signed URL as `downloadUrl`. Until then, embed the archive in the
    // email as a base64 data-URI so the user can at least copy-paste their data.
    const dataUri = `data:application/json;base64,${Buffer.from(json).toString("base64")}`;

    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: "READY", completedAt: new Date(), expiresAt, downloadUrl: dataUri },
    });

    await sendEmail({
      to: email,
      subject: "Your AccsMarkets data export is ready",
      html: `<p>Your personal data export is ready. It includes your profile, listings (${listings.length}), escrows (${escrows.length}), transactions (${transactions.length}), reviews, and messages.</p><p>Copy the link below and open it in your browser to download the JSON file:</p><p style="word-break:break-all;font-family:monospace;font-size:12px">${dataUri.slice(0, 200)}…</p><p><em>This export will expire in 7 days.</em></p>`,
    });
  } catch (err) {
    logger.error("data_export.failed", { userId, requestId, err: String(err) });
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: "EXPIRED" },
    }).catch(() => undefined);
  }
}
