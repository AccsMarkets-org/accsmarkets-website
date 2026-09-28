import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  type: z.enum(["INFO", "WARNING", "SUCCESS"]).optional(),
  message: z.string().min(1).max(1000).optional(),
  linkUrl: z.string().url().optional().nullable(),
  linkText: z.string().max(100).optional().nullable(),
  targetAudience: z.enum(["ALL", "BUYER", "SELLER"]).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);

  // AdminActionButtons sends { action: "toggle"|"delete" }
  if (body?.action === "toggle") {
    const current = await prisma.announcement.findUnique({ where: { id: params.id }, select: { isActive: true } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    try {
      const a = await prisma.announcement.update({ where: { id: params.id }, data: { isActive: !current.isActive } });
      return NextResponse.json({ announcement: a });
    } catch {
      return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
    }
  }
  if (body?.action === "delete") {
    try {
      await prisma.announcement.delete({ where: { id: params.id } });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "P2025") return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
      return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  let a;
  try {
    a = await prisma.announcement.update({ where: { id: params.id }, data: parsed.data });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2025") return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
  return NextResponse.json({ announcement: a });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await prisma.announcement.delete({ where: { id: params.id } });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2025") return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
