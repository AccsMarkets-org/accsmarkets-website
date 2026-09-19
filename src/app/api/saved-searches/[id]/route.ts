import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  alertEnabled: z.boolean().optional(),
});

async function guard(id: string, userId: string) {
  const s = await prisma.savedSearch.findUnique({ where: { id } });
  if (!s) return null;
  if (s.userId !== userId) return null;
  return s;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = await guard(params.id, session.user.id);
  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const updated = await prisma.savedSearch.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ search: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = await guard(params.id, session.user.id);
  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savedSearch.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
