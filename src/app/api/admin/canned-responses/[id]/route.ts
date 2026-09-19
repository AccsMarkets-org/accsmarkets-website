import { NextResponse } from "next/server";
import { requireAdmin, auditLog } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  body: z.string().min(1).max(4000).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_ESCROW_MESSAGES");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    const response = await prisma.cannedResponse.update({
      where: { id: params.id },
      data: parsed.data,
    });
    await auditLog(prisma, session.user.id, "canned_response.update", "CannedResponse", params.id, parsed.data);
    return NextResponse.json({ response });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_ESCROW_MESSAGES");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await prisma.cannedResponse.delete({ where: { id: params.id } });
    await auditLog(prisma, session.user.id, "canned_response.delete", "CannedResponse", params.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
