import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  userId: z.string().min(1),
  staffRoleId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_STAFF");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { userId, staffRoleId } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role === "ADMIN") return NextResponse.json({ error: "User is already an admin" }, { status: 409 });

  if (staffRoleId) {
    const role = await prisma.staffRole.findUnique({ where: { id: staffRoleId } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: "ADMIN", staffRoleId: staffRoleId ?? null },
  });

  await auditLog(prisma, session.user.id, "promote_to_admin", "User", userId, { staffRoleId });

  return NextResponse.json({ ok: true });
}

const removeSchema = z.object({ userId: z.string().min(1) });

export async function DELETE(req: Request) {
  const session = await requireAdmin("MANAGE_STAFF");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { userId } = parsed.data;

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "User is not an admin" }, { status: 400 });

  await prisma.user.update({
    where: { id: userId },
    data: { role: "USER", staffRoleId: null },
  });

  await auditLog(prisma, session.user.id, "demote_from_admin", "User", userId, {});

  return NextResponse.json({ ok: true });
}
