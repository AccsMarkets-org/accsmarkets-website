import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

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
  // Called internally after credentials login to register a new active session row.
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers as unknown as Headers);
  const ua = req.headers.get("user-agent") ?? undefined;

  let row;
  try {
    row = await prisma.activeSession.create({
      data: { userId: session.user.id, ip, userAgent: ua },
    });
  } catch {
    return NextResponse.json({ error: "Failed to register session" }, { status: 500 });
  }

  return NextResponse.json({ session: row }, { status: 201 });
}
