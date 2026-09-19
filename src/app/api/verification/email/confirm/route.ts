import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const record = await prisma.emailOtpVerification.findUnique({ where: { userId: session.user.id } });
  if (!record || record.verifiedAt) {
    return NextResponse.json({ error: "No pending verification found. Please request a new code." }, { status: 400 });
  }
  if (new Date() > record.expiresAt) {
    return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });
  }

  const hash = crypto.createHash("sha256").update(String(code).trim()).digest("hex");
  if (hash !== record.codeHash) {
    return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.emailOtpVerification.update({
      where: { userId: session.user.id },
      data: { verifiedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { kycLevel: "PHONE" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
