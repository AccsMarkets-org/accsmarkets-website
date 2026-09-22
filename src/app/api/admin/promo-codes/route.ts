import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/** GET /api/admin/promo-codes?page=0&status=all|active|inactive&q= */
export async function GET(req: Request) {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0") || 0);
  const q = (searchParams.get("q") ?? "").trim();

  const where = q ? { code: { contains: q } } : {};
  const now = new Date();

  const [total, codes, activeCount, totalRedemptions] = await Promise.all([
    prisma.promoCode.count({ where }),
    prisma.promoCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.promoCode.count({ where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
    prisma.promoRedemption.count(),
  ]);

  return NextResponse.json({
    codes: codes.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      value: Number(c.value),
      maxRedemptions: c.maxRedemptions,
      redemptionCount: c.redemptionCount,
      expiresAt: c.expiresAt,
      createdAt: c.createdAt,
      status: statusOf(c, now),
    })),
    stats: { total, active: activeCount, redemptions: totalRedemptions },
    pagination: { page, pageSize: PAGE_SIZE, hasMore: (page + 1) * PAGE_SIZE < total },
  });
}

function statusOf(
  c: { expiresAt: Date | null; maxRedemptions: number | null; redemptionCount: number },
  now: Date,
): "ACTIVE" | "EXPIRED" | "EXHAUSTED" {
  if (c.expiresAt && c.expiresAt <= now) return "EXPIRED";
  if (c.maxRedemptions !== null && c.redemptionCount >= c.maxRedemptions) return "EXHAUSTED";
  return "ACTIVE";
}

const createSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(/^[A-Za-z0-9_-]+$/, "Code may only contain letters, numbers, - and _")
      .optional(),
    type: z.enum(["PERCENT_OFF_FEE", "FLAT_CREDIT"]),
    value: z.number().positive(),
    maxRedemptions: z.number().int().positive().nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "PERCENT_OFF_FEE" && v.value > 100) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Percent discount cannot exceed 100" });
    }
    if (v.type === "FLAT_CREDIT" && v.value > 10000) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Flat credit cannot exceed $10,000" });
    }
    if (v.expiresAt && new Date(v.expiresAt) <= new Date()) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiry must be in the future" });
    }
  });

function generateCode(): string {
  // 10 chars, unambiguous alphabet.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** POST /api/admin/promo-codes — create a code (auto-generated if `code` omitted). */
export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { type, value, maxRedemptions, expiresAt } = parsed.data;
  const code = (parsed.data.code ?? generateCode()).toUpperCase();

  const existing = await prisma.promoCode.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "A promo code with this code already exists" }, { status: 409 });

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.promoCode.create({
      data: {
        code,
        type,
        value,
        maxRedemptions: maxRedemptions ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    await auditLog(tx, session.user.id, "promo_code_create", "PromoCode", row.id, {
      code, type, value, maxRedemptions: maxRedemptions ?? null, expiresAt: expiresAt ?? null,
    });
    return row;
  });

  return NextResponse.json({ ok: true, id: created.id, code: created.code }, { status: 201 });
}
