import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { decryptSecret, verifyCode } from "@/lib/totp";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({ password: z.string().min(1), code: z.string().min(6).max(6) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Password and 6-digit code required." }, { status: 400 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.password) return NextResponse.json({ error: "Not applicable for OAuth accounts." }, { status: 400 });

  const passwordOk = await bcrypt.compare(parsed.data.password, user.password);
  if (!passwordOk) return NextResponse.json({ error: "Incorrect password." }, { status: 400 });

  const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId: session.user.id } });
  if (!tfa) return NextResponse.json({ error: "2FA is not enabled." }, { status: 400 });

  if (!verifyCode(decryptSecret(tfa.secret), parsed.data.code)) {
    return NextResponse.json({ error: "Incorrect authentication code." }, { status: 400 });
  }

  await prisma.twoFactorAuth.delete({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
