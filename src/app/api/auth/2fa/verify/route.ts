import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptSecret, verifyCode } from "@/lib/totp";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().min(6).max(6) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId: session.user.id } });
  if (!tfa) return NextResponse.json({ error: "2FA setup not started." }, { status: 400 });

  const secret = decryptSecret(tfa.secret);
  if (!verifyCode(secret, parsed.data.code)) {
    return NextResponse.json({ error: "Incorrect code. Try again." }, { status: 400 });
  }

  await prisma.twoFactorAuth.update({
    where: { userId: session.user.id },
    data: { enabledAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
