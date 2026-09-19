import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAdmin("MANAGE_STAFF");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      OR: [
        { email: { contains: q } },
        { name: { contains: q } },
        { username: { contains: q } },
      ],
    },
    select: { id: true, name: true, email: true, username: true, image: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}
