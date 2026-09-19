import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  rolloutPct: z.number().int().min(0).max(100).optional(),
  description: z.string().max(200).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  let flag;
  try {
    flag = await prisma.featureFlag.update({ where: { id: params.id }, data: parsed.data });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2025") return NextResponse.json({ error: "Flag not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to update flag" }, { status: 500 });
  }
  await auditLog(prisma, session.user.id, "feature_flag.update", "FeatureFlag", flag.id, parsed.data);
  return NextResponse.json({ flag });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await prisma.featureFlag.delete({ where: { id: params.id } });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2025") return NextResponse.json({ error: "Flag not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to delete flag" }, { status: 500 });
  }
  await auditLog(prisma, session.user.id, "feature_flag.delete", "FeatureFlag", params.id);
  return NextResponse.json({ ok: true });
}
