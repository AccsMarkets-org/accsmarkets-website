import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({
  countryCode: z.union([z.string().length(2), z.literal("OTHER")]).optional(),
  primaryIntent: z.enum(["BUYER", "SELLER", "BOTH"]).optional(),
  sellIntentPlatforms: z.array(z.string()).optional(),
  sellReason: z.enum(["NO_LONGER_NEEDED", "FUNDING_NEW_PROJECT", "DIVERSIFYING", "OTHER"]).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { countryCode, primaryIntent, sellIntentPlatforms, sellReason } = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(countryCode !== undefined ? { countryCode: countryCode === "OTHER" ? null : countryCode } : {}),
      ...(primaryIntent !== undefined ? { primaryIntent } : {}),
      ...(sellIntentPlatforms !== undefined ? { sellIntentPlatforms } : {}),
      ...(sellReason !== undefined ? { sellReason } : {}),
      onboardingCompletedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
