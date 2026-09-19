import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submission = await prisma.kycSubmission.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { status: true, rejectionReason: true },
  }).catch(() => null);

  return NextResponse.json({ status: submission?.status ?? null, reason: submission?.rejectionReason ?? null });
}
