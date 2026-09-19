import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({ amountUsd: z.number().min(1).max(10000) });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = await getStripe();
  if (!stripe) return NextResponse.json({ error: "Card payments are not configured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { amountUsd } = parsed.data;
  const amountCents = Math.round(amountUsd * 100);

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    metadata: { userId: session.user.id, platform: "accsmarkets" },
    automatic_payment_methods: { enabled: true },
  });

  await prisma.fiatPayment.create({
    data: {
      userId: session.user.id,
      provider: "stripe",
      providerPaymentId: intent.id,
      amountUsd,
      currency: "usd",
      status: "PENDING",
    },
  });

  return NextResponse.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
}
