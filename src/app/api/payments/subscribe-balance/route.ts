import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await req.json();
  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  if (Number(plan.priceMonthly) === 0) {
    return NextResponse.json({ error: "Cannot pay for free plan" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { walletBalance: true, subscriptionPlanId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const price = Number(plan.priceMonthly);
  const balance = Number(user.walletBalance);

  if (balance < price) {
    return NextResponse.json(
      { error: "Insufficient balance", balance, price },
      { status: 400 },
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const balanceBefore = new Decimal(balance);
  const balanceAfter = balanceBefore.minus(new Decimal(price));

  const result = await prisma.$transaction(async (tx) => {
    // Atomic guarded debit — the initial read above is only used for the
    // up-front "insufficient balance" response; the actual debit re-checks
    // the live balance and decrements in one conditional UPDATE, so two
    // concurrent subscription purchases can't both succeed off a stale read.
    const debited = await tx.user.updateMany({
      where: { id: session.user.id, walletBalance: { gte: price } },
      data: {
        walletBalance: { decrement: price },
        subscriptionPlanId: plan.id,
        subscriptionExpiresAt: expiresAt,
      },
    });
    if (debited.count === 0) return null;

    await tx.transaction.create({
      data: {
        userId: session.user.id,
        type: "SUBSCRIPTION",
        status: "COMPLETED",
        amount: new Decimal(price),
        balanceBefore,
        balanceAfter,
        metadata: { plan: plan.name, period: "30d" },
      },
    });
    return true;
  });

  if (!result) {
    return NextResponse.json(
      { error: "Insufficient balance", balance, price },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, plan: plan.name, expiresAt });
}
