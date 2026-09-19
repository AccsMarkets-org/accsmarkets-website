import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { isWhatsAppConfigured, sendWhatsAppTemplate } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Eligible recipients: opted into marketing, not banned, with a verified
// phone number on file. Mirrors the targeting rule already used for the
// email marketing sweep (marketingOptOut) plus a real verified-number check
// (PhoneVerification.verifiedAt), since WhatsApp sends need a real number.
async function getEligibleRecipients() {
  return prisma.user.findMany({
    where: {
      marketingOptOut: false,
      isBanned: false,
      phoneVerification: { verifiedAt: { not: null } },
    },
    select: { id: true, name: true, username: true, phoneVerification: { select: { phoneNumber: true } } },
  });
}

export async function GET() {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const recipients = await getEligibleRecipients();
  return NextResponse.json({ configured: isWhatsAppConfigured(), eligibleCount: recipients.length });
}

const sendSchema = z.object({
  templateName: z.string().trim().min(1).max(512),
  languageCode: z.string().trim().min(2).max(10).default("en_US"),
  // {{1}}, {{2}}... in template order. "{{name}}" is substituted per-recipient
  // with their display name/username before send; any other literal is sent
  // as-is to every recipient.
  bodyParams: z.array(z.string().max(1000)).max(10).default([]),
  // Required confirmation so a misclick can't blast the full list —
  // the admin UI shows the exact recipient count before this is set.
  confirmCount: z.number().int().min(0),
});

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { allowed } = await checkRateLimit(`whatsapp-campaign:${session.user.id}`, 5, 3600);
  if (!allowed) return NextResponse.json({ error: "Rate limited — try again later" }, { status: 429 });

  if (!isWhatsAppConfigured()) {
    return NextResponse.json(
      { error: "WhatsApp is not configured (missing WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { templateName, languageCode, bodyParams, confirmCount } = parsed.data;

  const recipients = await getEligibleRecipients();
  if (confirmCount !== recipients.length) {
    return NextResponse.json(
      { error: `Recipient count changed (was ${confirmCount}, now ${recipients.length}) — re-check and resend.` },
      { status: 409 },
    );
  }

  // Sequential, not Promise.all — the Cloud API rate-limits per phone number
  // and this avoids hammering it; a real campaign UI can add a queue/BullMQ
  // job for large lists, but sequential is correct and safe at this scale.
  let sent = 0;
  const errors: { userId: string; error: string }[] = [];
  for (const r of recipients) {
    const phone = r.phoneVerification?.phoneNumber;
    if (!phone) continue;
    const resolvedParams = bodyParams.map((p) => (p === "{{name}}" ? r.name ?? r.username ?? "there" : p));
    try {
      await sendWhatsAppTemplate({ to: phone, templateName, languageCode, bodyParams: resolvedParams });
      sent++;
    } catch (err) {
      errors.push({ userId: r.id, error: err instanceof Error ? err.message : "Unknown error" });
      logger.error("whatsapp_campaign_send_failed", { userId: r.id, templateName, error: String(err) });
    }
  }

  await auditLog(prisma, session.user.id, "marketing.whatsapp_campaign_sent", "User", "bulk", {
    templateName,
    languageCode,
    recipientCount: recipients.length,
    sent,
    failed: errors.length,
  });

  return NextResponse.json({ ok: true, sent, failed: errors.length, errors: errors.slice(0, 20) });
}
