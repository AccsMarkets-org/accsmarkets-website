import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

function generateCode(username: string | null | undefined): string {
  const prefix = (username ?? "").slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${prefix}${nanoid(6).toUpperCase()}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let referralCode = await prisma.referralCode.findUnique({ where: { userId: session.user.id } });
    if (!referralCode) {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
      const code = generateCode(user.username);
      referralCode = await prisma.referralCode.create({ data: { userId: session.user.id, code } });
    }

    const referrals = await prisma.referral.findMany({
      where: { referrerId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const invited = referrals.length;
    const rewarded = referrals.filter((r) => r.status === "REWARDED").length;
    const pending = invited - rewarded;
    const milestoneProgress = pending % 10;
    const milestonesCompleted = Math.floor(rewarded / 10);
    const totalEarned = milestonesCompleted * 10;

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";
    const referralLink = `${baseUrl}/register?ref=${referralCode.code}`;

    return NextResponse.json({
      referralLink,
      code: referralCode.code,
      invited,
      rewarded,
      milestoneProgress,
      milestonesCompleted,
      totalEarned,
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
