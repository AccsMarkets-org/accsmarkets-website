import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin("MANAGE_SETTINGS"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ flags });
}

const createSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, digits, and underscores").max(64),
  description: z.string().max(200).optional(),
  enabled: z.boolean().default(false),
  rolloutPct: z.number().int().min(0).max(100).default(100),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const flag = await prisma.featureFlag.create({ data: parsed.data });
  await auditLog(prisma, session.user.id, "feature_flag.create", "FeatureFlag", flag.id, parsed.data);
  return NextResponse.json({ flag }, { status: 201 });
}
