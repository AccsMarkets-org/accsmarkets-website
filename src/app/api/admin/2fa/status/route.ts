import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/totp";

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

  // An unreadable secret (legacy admin-only cipher) was never usable at login —
  // report it as not enabled so the admin can re-run setup.
  let decrypted = "";
  try {
    decrypted = decryptSecret(record.secret);
  } catch {
    decrypted = "";
  }
  const enabled = decrypted.length > 0 && !decrypted.startsWith("PENDING:");

  return NextResponse.json({ enabled, enabledAt: record.enabledAt });
}
