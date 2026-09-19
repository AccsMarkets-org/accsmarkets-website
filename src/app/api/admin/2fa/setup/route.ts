import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSecret } from "otplib";
import { encryptAdminTotpSecret as encrypt } from "@/lib/admin-totp";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = generateSecret();
  const account = encodeURIComponent(session.user.email ?? session.user.id);
  const issuer = "AccsMarkets%20Admin";
  const otpauth = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}`;

  await prisma.twoFactorAuth.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      secret: encrypt(`PENDING:${secret}`),
      backupCodes: "[]",
    },
    update: {
      secret: encrypt(`PENDING:${secret}`),
    },
  });

  return NextResponse.json({ secret, otpauth });
}
