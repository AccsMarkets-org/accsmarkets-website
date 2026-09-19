import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";
import { ALL_PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin("MANAGE_STAFF");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [roles, staffMembers] = await Promise.all([
    prisma.staffRole.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { users: true } } } }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, name: true, email: true, username: true, image: true, staffRoleId: true, staffRole: { select: { id: true, name: true } }, createdAt: true, lastSeenAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ roles, staffMembers });
}

const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).min(1),
});

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_STAFF");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });

  const { name, description, permissions } = parsed.data;

  const existing = await prisma.staffRole.findUnique({ where: { name } });
  if (existing) return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 });

  const role = await prisma.staffRole.create({ data: { name, description, permissions } });

  await auditLog(prisma, session.user.id, "create_staff_role", "StaffRole", role.id, { name, description, permissions });

  return NextResponse.json({ role }, { status: 201 });
}
