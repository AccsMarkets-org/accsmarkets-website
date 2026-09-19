import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  type: z.enum(["INFO", "WARNING", "SUCCESS"]).default("INFO"),
  message: z.string().min(1).max(1000),
  linkUrl: z.string().url().optional().nullable(),
  linkText: z.string().max(100).optional().nullable(),
  targetAudience: z.enum(["ALL", "BUYER", "SELLER"]).default("ALL"),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export async function GET(req: Request) {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ announcements });
}

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  let a;
  try {
    a = await prisma.announcement.create({ data: parsed.data });
  } catch {
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
  return NextResponse.json({ announcement: a }, { status: 201 });
}
