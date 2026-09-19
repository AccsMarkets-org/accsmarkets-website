import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(2).max(100),
});

// GET /api/organizations — list orgs the current user owns or is member of
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: {
      org: {
        include: {
          members: { select: { userId: true, role: true } },
          kybSubmission: { select: { status: true } },
        },
      },
    },
  });

  const orgs = memberships.map((m) => ({ ...m.org, myRole: m.role }));
  return NextResponse.json({ orgs });
}

// POST /api/organizations — create a new organization
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name: parsed.data.name,
        ownerId: session.user.id,
        kybStatus: "NONE",
      },
    });
    await tx.organizationMember.create({
      data: { orgId: created.id, userId: session.user.id, role: "OWNER", joinedAt: new Date() },
    });
    return created;
  });

  return NextResponse.json({ org }, { status: 201 });
}
