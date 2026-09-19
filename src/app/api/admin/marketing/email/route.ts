import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { isBrevoConfigured, sendBrevoEmail } from "@/lib/brevo";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Same targeting rule as the automated marketing sweep (marketingOptOut).
async function getEligibleRecipients() {
  return prisma.user.findMany({
    where: { marketingOptOut: false, isBanned: false },
    select: { id: true, email: true, name: true, username: true },
  });
}

export async function GET() {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const recipients = await getEligibleRecipients();
  return NextResponse.json({ configured: isBrevoConfigured(), eligibleCount: recipients.length });
}

const sendSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  // "{{name}}" is substituted per-recipient before send.
  htmlContent: z.string().trim().min(1).max(100_000),
  confirmCount: z.number().int().min(0),
});

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { allowed } = await checkRateLimit(`email-campaign:${session.user.id}`, 5, 3600);
  if (!allowed) return NextResponse.json({ error: "Rate limited — try again later" }, { status: 429 });

  if (!isBrevoConfigured()) {
    return NextResponse.json({ error: "Brevo is not configured (missing BREVO_API_KEY)" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { subject, htmlContent, confirmCount } = parsed.data;

  const recipients = await getEligibleRecipients();
  if (confirmCount !== recipients.length) {
    return NextResponse.json(
      { error: `Recipient count changed (was ${confirmCount}, now ${recipients.length}) — re-check and resend.` },
      { status: 409 },
    );
  }

  let sent = 0;
  const errors: { userId: string; error: string }[] = [];
  for (const r of recipients) {
    const displayName = r.name ?? r.username ?? "there";
    const personalizedHtml = htmlContent.replaceAll("{{name}}", displayName);
    try {
      await sendBrevoEmail({ to: r.email, toName: displayName, subject, htmlContent: personalizedHtml });
      sent++;
    } catch (err) {
      errors.push({ userId: r.id, error: err instanceof Error ? err.message : "Unknown error" });
      logger.error("email_campaign_send_failed", { userId: r.id, error: String(err) });
    }
  }

  await auditLog(prisma, session.user.id, "marketing.email_campaign_sent", "User", "bulk", {
    subject,
    recipientCount: recipients.length,
    sent,
    failed: errors.length,
  });

  return NextResponse.json({ ok: true, sent, failed: errors.length, errors: errors.slice(0, 20) });
}
