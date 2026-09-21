import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSecret, encryptSecret, decryptSecret } from "@/lib/totp";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Never overwrite a CONFIRMED secret: login ignores PENDING: rows, so doing so
  // would let anyone riding an admin session silently switch 2FA off. Disabling
  // goes through /api/admin/2fa/disable (password + code). A pending row, or a
  // legacy row written with the old admin-only cipher (unreadable by login, so
  // it never worked), may be replaced.
  const existing = await prisma.twoFactorAuth.findUnique({ where: { userId: session.user.id } });
  if (existing) {
    let decrypted: string | null = null;
    try {
      decrypted = decryptSecret(existing.secret);
    } catch {
      decrypted = null;
    }
    if (decrypted !== null && !decrypted.startsWith("PENDING:")) {
      return NextResponse.json({ error: "2FA is already enabled. Disable it first." }, { status: 400 });
    }
  }

  const secret = generateSecret();
  const account = encodeURIComponent(session.user.email ?? session.user.id);
  const issuer = "AccsMarkets%20Admin";
  const otpauth = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}`;

  // Same cipher + PENDING: marker as the regular-user flow (src/lib/totp.ts), so
  // the secret is readable by the login check in src/lib/auth.ts.
  await prisma.twoFactorAuth.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      secret: encryptSecret(`PENDING:${secret}`),
      backupCodes: "[]",
    },
    update: {
      secret: encryptSecret(`PENDING:${secret}`),
      backupCodes: "[]",
    },
  });

  return NextResponse.json({ secret, otpauth });
}
