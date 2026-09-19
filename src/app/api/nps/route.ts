import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const npsSchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().max(1000).optional(),
});

// POST /api/nps — submit an NPS response
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // One response per 30 days
  const recent = await prisma.npsResponse.findFirst({
    where: {
      userId: session.user.id,
      submittedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) {
    return NextResponse.json({ error: "You already submitted feedback recently." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = npsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const response = await prisma.npsResponse.create({
    data: {
      userId: session.user.id,
      score: parsed.data.score,
      comment: parsed.data.comment ?? null,
    },
  });

  return NextResponse.json({ response }, { status: 201 });
}
