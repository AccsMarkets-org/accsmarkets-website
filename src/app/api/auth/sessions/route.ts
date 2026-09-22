import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";
import { recordDeviceFingerprint, upsertRiskScore } from "@/lib/risk";

export const dynamic = "force-dynamic";

// SHA-256 hex digest as produced by src/components/security/DeviceFingerprint.tsx.
const FINGERPRINT_RE = /^[a-f0-9]{64}$/;

// Presence pings (src/app/api/presence/route.ts) key ActiveSession rows on
// ip + user-agent within a 30-minute window; reuse the same window here so a
// post-login registration doesn't duplicate the row presence already made.
const SESSION_DEDUPE_MS = 30 * 60 * 1000;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.activeSession.findMany({
    where: { userId: session.user.id },
    orderBy: { lastSeenAt: "desc" },
    take: 20,
  });

  const ip = getClientIp(req.headers as unknown as Headers);
  const ua = req.headers.get("user-agent") ?? "";

  return NextResponse.json({ sessions, currentIp: ip, currentUa: ua });
}

export async function POST(req: Request) {
  // Called from the client after login to register an active session row and,
  // when the browser supplied one, record its device fingerprint for the
  // multi-account risk rule.
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers as unknown as Headers);
  const ua = req.headers.get("user-agent") ?? undefined;

  const body = (await req.json().catch(() => null)) as { fingerprintHash?: unknown } | null;
  const fingerprintHash =
    typeof body?.fingerprintHash === "string" && FINGERPRINT_RE.test(body.fingerprintHash)
      ? body.fingerprintHash
      : null;

  let row;
  try {
    const existing = await prisma.activeSession.findFirst({
      where: {
        userId: session.user.id,
        ip,
        userAgent: ua ?? null,
        lastSeenAt: { gte: new Date(Date.now() - SESSION_DEDUPE_MS) },
      },
      orderBy: { lastSeenAt: "desc" },
    });
    row = existing
      ? await prisma.activeSession.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } })
      : await prisma.activeSession.create({ data: { userId: session.user.id, ip, userAgent: ua } });
  } catch {
    return NextResponse.json({ error: "Failed to register session" }, { status: 500 });
  }

  if (fingerprintHash) {
    await recordDeviceFingerprint(session.user.id, fingerprintHash);
    // Re-evaluate so the "device shared with other accounts" rule fires now,
    // not at the next unrelated recompute. Never throws.
    void upsertRiskScore(session.user.id);
  }

  return NextResponse.json({ session: row, fingerprintRecorded: !!fingerprintHash }, { status: 201 });
}
