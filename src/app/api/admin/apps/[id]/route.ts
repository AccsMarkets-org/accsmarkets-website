import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const reviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().min(5) }),
]);

// PUT /api/admin/apps/[id] — approve or reject an app
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

  const { action } = parsed.data;
  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
  const rejectionReason = action === "reject" ? (parsed.data as { reason: string }).reason : null;

  const app = await prisma.appListing.update({
    where: { id: params.id },
    data: { status: newStatus, rejectionReason },
    include: { developer: { select: { id: true, email: true, name: true } } },
  });

  logger.info(`app.${action}`, { appId: params.id, adminId: session.user.id });

  // Notify developer
  const notifTitle = action === "approve" ? "App approved" : "App not approved";
  const notifBody =
    action === "approve"
      ? `Your app "${app.name}" has been approved and is now listed in the directory.`
      : `Your app "${app.name}" was not approved. Reason: ${rejectionReason}`;

  await createNotification({ userId: app.developer.id, type: "SYSTEM", title: notifTitle, body: notifBody, link: `/dashboard/apps/${app.id}` }).catch(() => null);
  if (app.developer.email) {
    await sendEmail({
      to: app.developer.email,
      subject: notifTitle,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto"><p>Hi ${app.developer.name ?? "there"},</p><p>${notifBody}</p></div>`,
    }).catch(() => null);
  }

  return NextResponse.json({ app });
}
