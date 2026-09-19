import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";
import { ALL_PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(200).optional().nullable(),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).min(1).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_STAFF");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const role = await prisma.staffRole.findUnique({ where: { id: params.id } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const updated = await prisma.staffRole.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await auditLog(prisma, session.user.id, "update_staff_role", "StaffRole", role.id, parsed.data);

  return NextResponse.json({ role: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_STAFF");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const role = await prisma.staffRole.findUnique({ where: { id: params.id }, include: { _count: { select: { users: true } } } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.isSystem) return NextResponse.json({ error: "Cannot delete system roles" }, { status: 400 });
  if (role._count.users > 0) return NextResponse.json({ error: "Remove all staff from this role first" }, { status: 400 });

  await prisma.staffRole.delete({ where: { id: params.id } });
  await auditLog(prisma, session.user.id, "delete_staff_role", "StaffRole", role.id, { name: role.name });

  return NextResponse.json({ ok: true });
}
