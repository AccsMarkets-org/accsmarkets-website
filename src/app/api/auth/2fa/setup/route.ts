import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import {
  generateSecret, encryptSecret, decryptSecret, buildOtpAuthUri,
  generateBackupCodes,
} from "@/lib/totp";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only a CONFIRMED row blocks setup. A row still carrying the PENDING: marker is
  // an abandoned setup and may be restarted (and is ignored by login).
  const existing = await prisma.twoFactorAuth.findUnique({ where: { userId: session.user.id } });
  if (existing && !decryptSecret(existing.secret).startsWith("PENDING:")) {
    return NextResponse.json({ error: "2FA is already enabled." }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const secret = generateSecret();
  const backupCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));

  // Store pending setup in a temp DB row (not yet "enabled" — user must verify the code).
  // The PENDING: marker inside the encrypted secret is what marks it unconfirmed
  // (enabledAt is non-nullable); /api/auth/2fa/verify strips it.
  // We overwrite if they call setup again before verifying.
  await prisma.twoFactorAuth.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      secret: encryptSecret(`PENDING:${secret}`),
      backupCodes: JSON.stringify(hashedCodes),
    },
    update: {
      secret: encryptSecret(`PENDING:${secret}`),
      backupCodes: JSON.stringify(hashedCodes),
    },
  });

  const otpAuthUri = buildOtpAuthUri(secret, user.email);

  // Return the raw secret + URI. The client renders the QR code from the URI.
  return NextResponse.json({ secret, otpAuthUri, backupCodes });
}
