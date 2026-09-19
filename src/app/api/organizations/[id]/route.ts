import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});

async function requireOrgMember(orgId: string, userId: string, minRole?: "ADMIN" | "OWNER") {
  const member = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!member) return null;
  if (minRole === "OWNER" && member.role !== "OWNER") return null;
  if (minRole === "ADMIN" && member.role === "MEMBER") return null;
  return member;
}

// GET /api/organizations/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await requireOrgMember(params.id, session.user.id);
  if (!member && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      members: { include: { user: { select: { id: true, username: true, email: true, verifiedBadge: true } } } },
      kybSubmission: true,
    },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ org });
}

// PATCH /api/organizations/[id] — rename (OWNER or ADMIN only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await requireOrgMember(params.id, session.user.id, "ADMIN");
  if (!member && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const org = await prisma.organization.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json({ org });
}

// DELETE /api/organizations/[id] — OWNER only
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await requireOrgMember(params.id, session.user.id, "OWNER");
  if (!member && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.organization.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
