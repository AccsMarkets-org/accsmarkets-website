import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

// PromoCode has no `isActive` flag: "disable" is implemented as expiresAt = now,
// and "enable" clears (or extends) the expiry. The previous expiry is written to
// the audit log so a disable can be reasoned about later.
const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("disable") }),
  z.object({
    action: z.literal("enable"),
    /** Optional new expiry; omitted = never expires. */
    expiresAt: z.string().datetime().nullable().optional(),
  }),
  z.object({
    action: z.literal("update"),
    maxRedemptions: z.number().int().positive().nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  }),
]);

/** PATCH /api/admin/promo-codes/[id] — disable / enable / update limits. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const promo = await prisma.promoCode.findUnique({ where: { id: params.id } });
  if (!promo) return NextResponse.json({ error: "Promo code not found" }, { status: 404 });

  const input = parsed.data;
  const now = new Date();

  if (input.action === "disable") {
    if (promo.expiresAt && promo.expiresAt <= now) {
      return NextResponse.json({ error: "Promo code is already disabled/expired" }, { status: 400 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.promoCode.update({ where: { id: promo.id }, data: { expiresAt: now } });
      await auditLog(tx, session.user.id, "promo_code_disable", "PromoCode", promo.id, {
        code: promo.code, previousExpiresAt: promo.expiresAt,
      });
    });
    return NextResponse.json({ ok: true, expiresAt: now });
  }

  if (input.action === "enable") {
    const newExpiry = input.expiresAt ? new Date(input.expiresAt) : null;
    if (newExpiry && newExpiry <= now) {
      return NextResponse.json({ error: "Expiry must be in the future" }, { status: 400 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.promoCode.update({ where: { id: promo.id }, data: { expiresAt: newExpiry } });
      await auditLog(tx, session.user.id, "promo_code_enable", "PromoCode", promo.id, {
        code: promo.code, previousExpiresAt: promo.expiresAt, expiresAt: newExpiry,
      });
    });
    return NextResponse.json({ ok: true, expiresAt: newExpiry });
  }

  // update
  const data: { maxRedemptions?: number | null; expiresAt?: Date | null } = {};
  if (input.maxRedemptions !== undefined) data.maxRedemptions = input.maxRedemptions;
  if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.promoCode.update({ where: { id: promo.id }, data });
    await auditLog(tx, session.user.id, "promo_code_update", "PromoCode", promo.id, {
      code: promo.code,
      before: { maxRedemptions: promo.maxRedemptions, expiresAt: promo.expiresAt },
      after: data,
    });
  });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/promo-codes/[id] — only allowed when nothing has been redeemed. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const promo = await prisma.promoCode.findUnique({
    where: { id: params.id },
    include: { _count: { select: { redemptions: true } } },
  });
  if (!promo) return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
  if (promo.redemptionCount > 0 || promo._count.redemptions > 0) {
    return NextResponse.json(
      { error: "This code has redemptions and cannot be deleted. Disable it instead." },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.promoCode.delete({ where: { id: promo.id } });
    await auditLog(tx, session.user.id, "promo_code_delete", "PromoCode", promo.id, {
      code: promo.code, type: promo.type, value: Number(promo.value),
    });
  });
  return NextResponse.json({ ok: true });
}
