import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  targetType: z.enum(["LISTING", "USER", "MESSAGE"]),
  targetId: z.string(),
  reason: z.enum(["SCAM", "FAKE_ACCOUNT", "INAPPROPRIATE_CONTENT", "SPAM", "HARASSMENT", "OTHER"]),
  details: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const { targetType, targetId, reason, details } = parsed.data;

  const report = await prisma.report.create({
    data: {
      reporterId: session.user.id,
      targetType,
      targetId,
      reason,
      details: details ? sanitizeText(details) : null,
    },
  });

  return NextResponse.json({ report }, { status: 201 });
}
