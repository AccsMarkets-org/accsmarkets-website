import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const assignSchema = z.object({
  userId: z.string().min(1),
  staffRoleId: z.string().nullable(),
});

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_STAFF");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { userId, staffRoleId } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "User must have ADMIN role" }, { status: 400 });

  if (staffRoleId) {
    const role = await prisma.staffRole.findUnique({ where: { id: staffRoleId } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  await prisma.user.update({ where: { id: userId }, data: { staffRoleId } });
  await auditLog(prisma, session.user.id, "assign_staff_role", "User", userId, { staffRoleId });

  return NextResponse.json({ ok: true });
}
