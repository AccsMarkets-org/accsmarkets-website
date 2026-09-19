import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.bankTransferOrder.findUnique({
    where: { id: params.orderId },
    include: {
      bankAccount: {
        select: {
          bankName: true,
          accountName: true,
          accountNumber: true,
          routingNumber: true,
          swiftCode: true,
          iban: true,
          currency: true,
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ order });
}
