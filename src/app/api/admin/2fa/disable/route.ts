import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/admin";
import { decryptSecret, verifyCode } from "@/lib/totp";

export const dynamic = "force-dynamic";

const schema = z.object({ password: z.string().min(1), code: z.string().min(6).max(6) });

// Previously this deleted the admin's 2FA record on a bare session-authenticated
// DELETE with no re-verification at all — anyone who could ride an active admin
// session (stolen cookie, left-open browser, XSS) could silently strip 2FA
// protection with a single request. Now mirrors the regular-user disable flow
// (src/app/api/auth/2fa/disable/route.ts): re-enter the password and a current
// TOTP/backup code before the record is removed.
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { allowed } = await checkRateLimit(`admin-2fa-disable:${session.user.id}`, 5, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password and 6-digit code required." }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.password) {
    return NextResponse.json({ error: "Not applicable for OAuth accounts." }, { status: 400 });
  }
  const passwordOk = await bcrypt.compare(parsed.data.password, user.password);
  if (!passwordOk) return NextResponse.json({ error: "Incorrect password." }, { status: 400 });

  const record = await prisma.twoFactorAuth.findUnique({ where: { userId: session.user.id } });
  if (!record) return NextResponse.json({ error: "2FA is not enabled." }, { status: 400 });

  let secret: string;
  try {
    secret = decryptSecret(record.secret).replace("PENDING:", "");
  } catch {
    // Unreadable secret — never verify a code against an empty/garbage key.
    return NextResponse.json({ error: "2FA secret is unreadable. Re-run 2FA setup." }, { status: 400 });
  }
  const codeOk = verifyCode(secret, parsed.data.code);
  if (!codeOk) return NextResponse.json({ error: "Incorrect authentication code." }, { status: 400 });

  await prisma.twoFactorAuth.delete({ where: { userId: session.user.id } });
  await auditLog(prisma, session.user.id, "admin_2fa.disable", "User", session.user.id);
  return NextResponse.json({ ok: true });
}
