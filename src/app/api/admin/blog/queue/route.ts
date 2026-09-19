import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  prompt: z.string().trim().min(5).max(500),
});

export async function GET() {
  const session = await requireAdmin("MANAGE_BLOG");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.blogTopicQueue.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_BLOG");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });

  const item = await prisma.blogTopicQueue.create({ data: { prompt: parsed.data.prompt } });
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await requireAdmin("MANAGE_BLOG");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.blogTopicQueue.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
