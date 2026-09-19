import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.activeSession.findUnique({ where: { id: params.id } });
  if (!row || row.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.activeSession.delete({ where: { id: params.id } });
  } catch {
    return NextResponse.json({ error: "Failed to revoke session" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
