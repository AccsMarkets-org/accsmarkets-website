import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ── Schemas ───────────────────────────────────────────────────────────────────

const planFieldsSchema = z.object({
  name:          z.string().min(1).max(50).optional(),
  displayName:   z.string().max(80).optional().nullable(),
  description:   z.string().max(1000).optional().nullable(),
  features:      z.array(z.string().max(200)).optional(),
  badge:         z.string().max(40).optional().nullable(),
  color:         z.string().max(20).optional(),
  isActive:      z.boolean().optional(),
  isPopular:     z.boolean().optional(),
  priceMonthly:  z.number().min(0).max(99999).optional(),
  priceAnnual:   z.number().min(0).max(99999).optional().nullable(),
  trialDays:     z.number().int().min(0).max(365).optional(),
  listingLimit:  z.number().int().min(0).max(999999).optional(),
  maxEscrows:    z.number().int().min(0).max(999999).optional(),
  escrowFeeRate: z.number().min(0).max(1).optional(),
  minFee:        z.number().min(0).max(9999).optional(),
  sortOrder:     z.number().int().optional(),
});

const createSchema = planFieldsSchema.required({ name: true, priceMonthly: true });

const bulkUpdateSchema = z.object({
  plans: z.array(planFieldsSchema.extend({ id: z.string().min(1) })).min(1),
});

// ── GET — list with subscriber counts ─────────────────────────────────────────

export async function GET() {
  const session = await requireAdmin("MANAGE_PRICING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [plans, counts] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.user.groupBy({
      by: ["subscriptionPlanId"],
      where: { subscriptionPlanId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const countMap: Record<string, number> = {};
  for (const r of counts) if (r.subscriptionPlanId) countMap[r.subscriptionPlanId] = r._count._all;

  const serialized = plans.map((p) => ({
    ...p,
    priceMonthly:  Number(p.priceMonthly),
    priceAnnual:   p.priceAnnual ? Number(p.priceAnnual) : null,
    minFee:        Number(p.minFee),
    escrowFeeRate: Number(p.escrowFeeRate),
    features:      (p.features as string[]) ?? [],
    subscribers:   countMap[p.id] ?? 0,
    createdAt:     p.createdAt.toISOString(),
    updatedAt:     p.updatedAt.toISOString(),
  }));

  return NextResponse.json({ plans: serialized });
}

// ── POST — create plan ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_PRICING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });

  const { name, priceMonthly, priceAnnual, minFee, ...rest } = parsed.data;

  const plan = await prisma.subscriptionPlan.create({
    data: {
      name: name.toUpperCase().trim(),
      priceMonthly: priceMonthly ?? 0,
      priceAnnual: priceAnnual ?? null,
      minFee: minFee ?? 0,
      listingLimit: rest.listingLimit ?? 10,
      escrowFeeRate: rest.escrowFeeRate ?? 0.05,
      ...rest,
    },
  });

  await auditLog(prisma, session.user.id, "create_plan", "SubscriptionPlan", plan.id, { name: plan.name });

  return NextResponse.json({
    plan: {
      ...plan,
      priceMonthly: Number(plan.priceMonthly),
      priceAnnual: plan.priceAnnual ? Number(plan.priceAnnual) : null,
      minFee: Number(plan.minFee),
      features: (plan.features as string[]) ?? [],
      subscribers: 0,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    },
  }, { status: 201 });
}

// ── PUT — bulk update ─────────────────────────────────────────────────────────

export async function PUT(req: Request) {
  const session = await requireAdmin("MANAGE_PRICING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = bulkUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });

  const updates = await Promise.all(
    parsed.data.plans.map(({ id, priceMonthly, priceAnnual, minFee, escrowFeeRate, ...rest }) =>
      prisma.subscriptionPlan.update({
        where: { id },
        data: {
          ...(priceMonthly !== undefined && { priceMonthly }),
          ...(priceAnnual !== undefined && { priceAnnual }),
          ...(minFee !== undefined && { minFee }),
          ...(escrowFeeRate !== undefined && { escrowFeeRate }),
          ...rest,
        },
      })
    )
  );

  await auditLog(prisma, session.user.id, "update_pricing", "SubscriptionPlan", "bulk", { count: updates.length });

  return NextResponse.json({ ok: true });
}

// ── DELETE — remove a plan ────────────────────────────────────────────────────

export async function DELETE(req: Request) {
  const session = await requireAdmin("MANAGE_PRICING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id }, select: { _count: { select: { users: true } }, name: true } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan._count.users > 0) {
    return NextResponse.json({ error: `Cannot delete — ${plan._count.users} user(s) are on this plan. Move them first.` }, { status: 409 });
  }

  await prisma.subscriptionPlan.delete({ where: { id } });
  await auditLog(prisma, session.user.id, "delete_plan", "SubscriptionPlan", id, { name: plan.name });

  return NextResponse.json({ ok: true });
}
