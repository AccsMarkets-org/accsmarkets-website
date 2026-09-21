import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/admin";
// Same helpers as the regular-user 2FA flow — the login check in src/lib/auth.ts
// reads TwoFactorAuth.secret with decryptSecret, so it must be written with
// encryptSecret (a separate admin-only cipher here made enrolled admins unable
// to log in).
import { decryptSecret, encryptSecret, verifyCode } from "@/lib/totp";

export const dynamic = "force-dynamic";
import crypto from "crypto";
import bcrypt from "bcryptjs";

function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase().replace(/(.{4})/g, "$1-").slice(0, 9)
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { allowed } = await checkRateLimit(`admin-2fa-enable:${session.user.id}`, 5, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }

  const { token } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const record = await prisma.twoFactorAuth.findUnique({ where: { userId: session.user.id } });
  if (!record) return NextResponse.json({ error: "Run setup first" }, { status: 400 });

  let decrypted: string;
  try {
    decrypted = decryptSecret(record.secret);
  } catch {
    // Legacy row written with the old admin-only cipher — setup must be re-run.
    return NextResponse.json({ error: "Run setup first" }, { status: 400 });
  }
  if (!decrypted.startsWith("PENDING:")) {
    return NextResponse.json({ error: "2FA already activated" }, { status: 400 });
  }
  const secret = decrypted.slice("PENDING:".length);

  const valid = verifyCode(secret, String(token));
  if (!valid) return NextResponse.json({ error: "Invalid code — check your authenticator app" }, { status: 400 });

  const plainCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(plainCodes.map((c) => bcrypt.hash(c, 10)));

  await prisma.twoFactorAuth.update({
    where: { userId: session.user.id },
    data: {
      secret: encryptSecret(secret),
      backupCodes: JSON.stringify(hashedCodes),
      enabledAt: new Date(),
    },
  });

  await auditLog(prisma, session.user.id, "admin_2fa.enable", "User", session.user.id);

  return NextResponse.json({ ok: true, backupCodes: plainCodes });
}
