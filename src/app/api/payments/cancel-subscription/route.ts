import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Billing here is prepaid/non-recurring (see the field comment on
// User.subscriptionCancelAtPeriodEnd in schema.prisma) — there's no future
// charge to stop. "Cancel" means: keep the plan's benefits until the period
// you already paid for ends, then move to Free instead of being expected to
// manually renew. The actual downgrade-to-Free happens in api/internal/sweep
// once subscriptionExpiresAt passes, regardless of this flag; this endpoint
// only records the user's stated intent so the UI can say the right thing.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { subscriptionPlanId: true, subscriptionExpiresAt: true, subscriptionCancelAtPeriodEnd: true },
  });

  if (!user.subscriptionPlanId || !user.subscriptionExpiresAt || user.subscriptionExpiresAt < new Date()) {
    return NextResponse.json({ error: "You don't have an active paid subscription to cancel." }, { status: 400 });
  }

  // Idempotent: cancelling an already-cancelled subscription is a no-op success,
  // not an error — avoids a confusing failure on a duplicate click.
  if (user.subscriptionCancelAtPeriodEnd) {
    return NextResponse.json({ ok: true, alreadyCancelled: true, effectiveDate: user.subscriptionExpiresAt });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { subscriptionCancelAtPeriodEnd: true },
  });

  await createNotification({
    userId: session.user.id,
    type: "SYSTEM",
    title: "Subscription set to cancel",
    body: `You'll keep your current plan's benefits until ${formatDate(user.subscriptionExpiresAt)}, then move to the Free plan.`,
    link: "/dashboard/settings/subscription",
  });

  return NextResponse.json({ ok: true, effectiveDate: user.subscriptionExpiresAt });
}
