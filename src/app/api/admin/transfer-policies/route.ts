import { NextResponse } from "next/server";
import { requireAdmin, auditLog } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  platform: z.string().min(1),
  transferDays: z.number().int().min(1).max(90),
  policyNote: z.string().max(500).nullable().optional(),
  allowTrustless: z.boolean().optional(),
  trustlessBootstrapDays: z.number().int().min(1).max(90).optional(),
  sourceNote: z.string().max(1000).nullable().optional(),
});

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_LISTINGS");
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { platform, transferDays, policyNote, allowTrustless, trustlessBootstrapDays, sourceNote } = parsed.data;

  const upsertData = {
    transferDays,
    policyNote: policyNote ?? null,
    ...(allowTrustless !== undefined ? { allowTrustless } : {}),
    ...(trustlessBootstrapDays !== undefined ? { trustlessBootstrapDays } : {}),
    ...(sourceNote !== undefined ? { sourceNote: sourceNote ?? null } : {}),
  };

  try {
    const policy = await prisma.platformTransferPolicy.upsert({
      where: { platform },
      create: { platform, ...upsertData },
      update: upsertData,
    });
    await auditLog(prisma, session.user.id, "transfer_policy.upsert", "PlatformTransferPolicy", policy.id, upsertData);
    return NextResponse.json({ policy });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save policy" }, { status: 500 });
  }
}

export async function GET() {
  const session = await requireAdmin("MANAGE_LISTINGS");
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const policies = await prisma.platformTransferPolicy.findMany({ orderBy: { platform: "asc" } });
  return NextResponse.json({ policies });
}
