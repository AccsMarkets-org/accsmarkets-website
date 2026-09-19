import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().length(6) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Brute-force guard on the 6-digit code (1M possibilities — 10/10min bounds
  // guessing attempts well below anything close to exhaustive).
  const { allowed } = await checkRateLimit(`whatsapp-otp-confirm:${session.user.id}`, 10, 10 * 60);
  if (!allowed) return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const record = await prisma.phoneVerification.findUnique({ where: { userId: session.user.id } });
  if (!record) return NextResponse.json({ error: "No pending verification" }, { status: 400 });
  if (record.expiresAt < new Date()) return NextResponse.json({ error: "Code expired" }, { status: 400 });

  const inputHash = crypto.createHash("sha256").update(parsed.data.code).digest("hex");
  if (inputHash !== record.codeHash) return NextResponse.json({ error: "Incorrect code" }, { status: 400 });

  // WhatsApp verification is tracked independently of the kycLevel stepper
  // (email -> ID upload -> ID_VERIFIED, see dashboard/settings/verification) —
  // it's a separate gate required specifically for listing/buying/chat, not
  // a step in that identity-verification ladder.
  await prisma.phoneVerification.update({
    where: { userId: session.user.id },
    data: { verifiedAt: new Date() },
  });

  return NextResponse.json({ verified: true });
}
