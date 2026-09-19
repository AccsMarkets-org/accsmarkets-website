import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const inviteSchema = z.object({
  username: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

// POST /api/organizations/[id]/members — invite a user (OWNER/ADMIN)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inviter = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.user.id } },
  });
  if ((!inviter || inviter.role === "MEMBER") && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const invitee = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: { id: true },
  });
  if (!invitee) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const membership = await prisma.organizationMember.upsert({
    where: { orgId_userId: { orgId: params.id, userId: invitee.id } },
    update: { role: parsed.data.role },
    create: { orgId: params.id, userId: invitee.id, role: parsed.data.role },
  });

  return NextResponse.json({ membership }, { status: 201 });
}
