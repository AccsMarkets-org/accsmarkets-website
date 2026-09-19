import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Undoes cancel-subscription (see that route for the billing-model context).
// Only meaningful before the current paid period actually expires — once
// subscriptionExpiresAt passes, the sweep has already moved the user to Free
// and there is nothing left to "resume."
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { subscriptionExpiresAt: true, subscriptionCancelAtPeriodEnd: true },
  });

  if (!user.subscriptionCancelAtPeriodEnd) {
    return NextResponse.json({ error: "Your subscription isn't set to cancel." }, { status: 400 });
  }
  if (!user.subscriptionExpiresAt || user.subscriptionExpiresAt < new Date()) {
    return NextResponse.json({ error: "Your plan has already expired — resubscribe to continue." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { subscriptionCancelAtPeriodEnd: false },
  });

  await createNotification({
    userId: session.user.id,
    type: "SYSTEM",
    title: "Subscription resumed",
    body: `Your cancellation was undone. Renew before ${formatDate(user.subscriptionExpiresAt)} to keep your current plan.`,
    link: "/dashboard/settings/subscription",
  });

  return NextResponse.json({ ok: true });
}
