import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptAdminTotpSecret as decrypt } from "@/lib/admin-totp";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const record = await prisma.twoFactorAuth.findUnique({
    where: { userId: session.user.id },
    select: { secret: true, enabledAt: true },
  });

  if (!record) return NextResponse.json({ enabled: false });

  const decrypted = decrypt(record.secret);
  const enabled = decrypted.length > 0 && !decrypted.startsWith("PENDING:");

  return NextResponse.json({ enabled, enabledAt: record.enabledAt });
}
