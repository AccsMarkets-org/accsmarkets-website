import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, reissueSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logUserEvent } from "@/lib/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * "Sign out everywhere else". Sessions are stateless JWTs, so per-device
 * revocation isn't possible — instead we bump User.tokenVersion (every other
 * device's JWT now fails the next revalidation in the jwt callback, within
 * ~60s) and re-mint the caller's own cookie with the new version so this
 * device stays signed in. ActiveSession rows for other devices are removed
 * from the list; the caller's own row (same ip + user-agent) is kept.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(`sessions-revoke-all:${session.user.id}`, 5, 15 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const ip = getClientIp(req.headers as unknown as Headers);
  const ua = req.headers.get("user-agent") ?? undefined;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });

  const removed = await prisma.activeSession.deleteMany({
    where: {
      userId: session.user.id,
      NOT: { ip, userAgent: ua ?? null },
    },
  });

  await logUserEvent({
    userId: session.user.id,
    action: "session.revoke_all",
    details: { removedSessions: removed.count },
    ipAddress: ip,
    userAgent: ua,
  }).catch(() => null);

  const res = NextResponse.json({ ok: true, removed: removed.count });
  const reissued = await reissueSessionCookie(req, res, updated.tokenVersion);
  if (!reissued) {
    // No decodable cookie on the request — the caller will be signed out on
    // their next revalidation like everyone else. Tell the client so it can
    // route them to /login rather than showing a stale page.
    return NextResponse.json({ ok: true, removed: removed.count, selfSignedOut: true });
  }
  return res;
}
