import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const kybSchema = z.object({
  businessName: z.string().min(2).max(200),
  registrationNumber: z.string().max(100).optional(),
  country: z.string().length(2),
  regDocUrl: z.string().url().optional(),
  utilityBillUrl: z.string().url().optional(),
  beneficialOwners: z
    .array(z.object({ name: z.string(), ownershipPct: z.number().min(0).max(100) }))
    .min(1),
});

// POST /api/organizations/[id]/kyb — submit KYB
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.user.id } },
  });
  if (!caller || caller.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({ where: { id: params.id } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (org.kybStatus === "APPROVED") {
    return NextResponse.json({ error: "KYB already approved" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = kybSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const submission = await prisma.$transaction(async (tx) => {
    const sub = await tx.kybSubmission.upsert({
      where: { orgId: params.id },
      update: {
        ...parsed.data,
        beneficialOwners: parsed.data.beneficialOwners,
        status: "SUBMITTED",
        rejectionReason: null,
        reviewedAt: null,
      },
      create: {
        orgId: params.id,
        ...parsed.data,
        beneficialOwners: parsed.data.beneficialOwners,
        status: "SUBMITTED",
      },
    });
    await tx.organization.update({
      where: { id: params.id },
      data: { kybStatus: "SUBMITTED" },
    });
    return sub;
  });

  return NextResponse.json({ submission }, { status: 201 });
}

// GET /api/organizations/[id]/kyb — get KYB status
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.user.id } },
  });
  if (!caller && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submission = await prisma.kybSubmission.findUnique({ where: { orgId: params.id } });
  return NextResponse.json({ submission });
}
