import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// marketingOptOut isn't on the generated Prisma client yet (added via raw
// SQL — `prisma generate` is currently blocked by an OOM on this box), so
// both handlers use raw queries instead of the typed client for now.

const bodySchema = z.object({ optOut: z.boolean() });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.$queryRawUnsafe<{ marketingOptOut: number }[]>(
    "SELECT marketingOptOut FROM User WHERE id = ? LIMIT 1",
    session.user.id,
  );
  return NextResponse.json({ optOut: Boolean(rows[0]?.marketingOptOut) });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.$executeRawUnsafe(
    "UPDATE User SET marketingOptOut = ? WHERE id = ?",
    parsed.data.optOut, session.user.id,
  );
  return NextResponse.json({ success: true });
}
