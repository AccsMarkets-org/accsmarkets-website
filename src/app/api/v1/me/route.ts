import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

/** GET /api/v1/me — returns public profile of the key owner */
export async function GET(req: NextRequest) {
  const ctx = await authenticateApiKey(req.headers.get("authorization"));
  if (!ctx) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.userId },
    select: {
      id: true,
      username: true,
      name: true,
      verifiedBadge: true,
      trustScore: true,
      kycLevel: true,
      walletBalance: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: user });
}
