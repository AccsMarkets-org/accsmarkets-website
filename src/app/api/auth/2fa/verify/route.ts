import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret, verifyCode } from "@/lib/totp";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().min(6).max(6) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(`2fa-verify:${session.user.id}`, 5, 15 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId: session.user.id } });
  if (!tfa) return NextResponse.json({ error: "2FA setup not started." }, { status: 400 });

  // Setup stores the secret with a PENDING: marker; login ignores the row until
  // the marker is stripped here, after the user proves their authenticator works.
  const decrypted = decryptSecret(tfa.secret);
  if (!decrypted.startsWith("PENDING:")) {
    return NextResponse.json({ error: "2FA is already enabled." }, { status: 400 });
  }
  const secret = decrypted.slice("PENDING:".length);

  if (!verifyCode(secret, parsed.data.code)) {
    return NextResponse.json({ error: "Incorrect code. Try again." }, { status: 400 });
  }

  await prisma.twoFactorAuth.update({
    where: { userId: session.user.id },
    data: { secret: encryptSecret(secret), enabledAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
