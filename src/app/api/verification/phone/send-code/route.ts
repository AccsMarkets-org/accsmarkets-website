import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { isWhatsAppConfigured, sendWhatsAppTemplate } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// E.164: + followed by 8-15 digits (no spaces/dashes — the client formats
// before sending, matching what the WhatsApp Cloud API itself requires).
const schema = z.object({ phoneNumber: z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a valid phone number with country code, e.g. +15551234567") });

const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isWhatsAppConfigured()) {
    return NextResponse.json(
      { error: "WhatsApp verification is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const { allowed } = await checkRateLimit(
    `whatsapp-otp:${session.user.id}`,
    RATE_LIMITS.WHATSAPP_OTP.limit,
    RATE_LIMITS.WHATSAPP_OTP.windowSeconds,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid phone number" }, { status: 400 });

  // Cooldown against rapid resend spam (on top of the hourly rate limit above)
  const existing = await prisma.phoneVerification.findUnique({ where: { userId: session.user.id } });
  if (existing && !existing.verifiedAt) {
    const age = Date.now() - new Date(existing.createdAt).getTime();
    if (age < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - age) / 1000);
      return NextResponse.json({ error: `Please wait ${waitSec}s before requesting a new code` }, { status: 429 });
    }
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await prisma.phoneVerification.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, phoneNumber: parsed.data.phoneNumber, codeHash, expiresAt },
    update: { phoneNumber: parsed.data.phoneNumber, codeHash, expiresAt, verifiedAt: null },
  });

  // Template name/language are configurable since the actual approved
  // template name in Meta Business Manager is decided by the account owner,
  // not hardcoded here — see .env.example for the authentication-category
  // template Meta expects (a {{1}} body variable carrying the code).
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || "otp_verification";
  const languageCode = process.env.WHATSAPP_OTP_TEMPLATE_LANG || "en_US";

  try {
    await sendWhatsAppTemplate({
      to: parsed.data.phoneNumber,
      templateName,
      languageCode,
      bodyParams: [code],
    });
  } catch (err) {
    logger.error("whatsapp_otp_send_failed", { userId: session.user.id, error: String(err) });
    return NextResponse.json(
      { error: "Failed to send WhatsApp verification code. Double-check the number and try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ sent: true, deliveredTo: "whatsapp" });
}
