import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = await prisma.apiKey.findFirst({
    where: { id: params.id, userId: session.user.id, revokedAt: null },
  });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.apiKey.update({ where: { id: params.id }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
