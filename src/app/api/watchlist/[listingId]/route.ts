import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { listingId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.watchlist.deleteMany({
    where: { userId: session.user.id, listingId: params.listingId },
  });

  return NextResponse.json({ ok: true });
}
