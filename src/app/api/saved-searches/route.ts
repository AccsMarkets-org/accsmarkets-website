import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  filters: z.record(z.string()),
  alertEnabled: z.boolean().default(false),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  }).catch(() => []);
  return NextResponse.json({ searches });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const count = await prisma.savedSearch.count({ where: { userId: session.user.id } });
  if (count >= 20) return NextResponse.json({ error: "Maximum 20 saved searches" }, { status: 400 });

  const search = await prisma.savedSearch.create({
    data: { userId: session.user.id, name: parsed.data.name, filters: parsed.data.filters, alertEnabled: parsed.data.alertEnabled },
  });
  return NextResponse.json({ search }, { status: 201 });
}
