import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({
  categories: z.object({
    essential: z.literal(true),
    analytics: z.boolean(),
    marketing: z.boolean(),
  }),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ ok: true }); // anonymous — client handles via localStorage

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  await prisma.cookieConsent.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, categories: parsed.data.categories },
    update: { categories: parsed.data.categories, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
