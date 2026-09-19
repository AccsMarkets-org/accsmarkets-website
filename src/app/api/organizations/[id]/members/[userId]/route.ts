import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const roleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

// PATCH /api/organizations/[id]/members/[userId] — change role (OWNER only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.user.id } },
  });
  if ((!caller || caller.role !== "OWNER") && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.organizationMember.update({
    where: { orgId_userId: { orgId: params.id, userId: params.userId } },
    data: { role: parsed.data.role },
  });
  return NextResponse.json({ membership: updated });
}

// DELETE /api/organizations/[id]/members/[userId] — remove a member (OWNER/ADMIN, or self-leave)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; userId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSelf = params.userId === session.user.id;
  const caller = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.user.id } },
  });

  const canRemove =
    isSelf ||
    (caller && (caller.role === "OWNER" || caller.role === "ADMIN")) ||
    session.user.role === "ADMIN";

  if (!canRemove) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Prevent removing the last owner
  if (!isSelf) {
    const target = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: params.id, userId: params.userId } },
    });
    if (target?.role === "OWNER") {
      const ownerCount = await prisma.organizationMember.count({
        where: { orgId: params.id, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: "Cannot remove the last owner. Transfer ownership first." }, { status: 400 });
      }
    }
  }

  await prisma.organizationMember.delete({
    where: { orgId_userId: { orgId: params.id, userId: params.userId } },
  });
  return NextResponse.json({ ok: true });
}
