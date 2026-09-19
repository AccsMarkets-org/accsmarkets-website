import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({ version: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "version is required" }, { status: 400 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null;

  await prisma.termsAcceptance.upsert({
    where: { userId_version: { userId: session.user.id, version: parsed.data.version } },
    create: { userId: session.user.id, version: parsed.data.version, ip },
    update: { acceptedAt: new Date(), ip },
  });

  return NextResponse.json({ ok: true });
}
