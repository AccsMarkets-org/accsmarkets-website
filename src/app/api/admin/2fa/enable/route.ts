import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/admin";
import {
  decryptAdminTotpSecret as decrypt,
  encryptAdminTotpSecret as encrypt,
  verifyAdminTotpCode,
} from "@/lib/admin-totp";

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

  const decrypted = decrypt(record.secret);
  if (!decrypted.startsWith("PENDING:")) {
    return NextResponse.json({ error: "2FA already activated" }, { status: 400 });
  }
  const secret = decrypted.replace("PENDING:", "");

  const valid = await verifyAdminTotpCode(secret, token);
  if (!valid) return NextResponse.json({ error: "Invalid code — check your authenticator app" }, { status: 400 });

  const plainCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(plainCodes.map((c) => bcrypt.hash(c, 10)));

  await prisma.twoFactorAuth.update({
    where: { userId: session.user.id },
    data: {
      secret: encrypt(secret),
      backupCodes: JSON.stringify(hashedCodes),
      enabledAt: new Date(),
    },
  });

  await auditLog(prisma, session.user.id, "admin_2fa.enable", "User", session.user.id);

  return NextResponse.json({ ok: true, backupCodes: plainCodes });
}
