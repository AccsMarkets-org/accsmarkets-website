import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paypalMarkSentSchema } from "@/lib/validation/wallet";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { orderId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.payPalDepositOrder.findUnique({ where: { id: params.orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (order.status !== "PENDING") {
    return NextResponse.json({ error: `Order is already ${order.status.toLowerCase()}.` }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = paypalMarkSentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { senderPaypalEmail, transactionId, proofImageUrl } = parsed.data;

  await prisma.payPalDepositOrder.update({
    where: { id: order.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      senderPaypalEmail,
      transactionId: transactionId ?? null,
      proofImageUrl: proofImageUrl ?? null,
    },
  });

  return NextResponse.json({ success: true });
}
