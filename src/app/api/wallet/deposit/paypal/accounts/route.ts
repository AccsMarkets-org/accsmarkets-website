import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lists the platform's active receiving PayPal accounts so a depositing user
// can pick which one to send to. Full details are shown on the order page
// after an order is created; here we return just enough to choose.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.platformPayPalAccount
    .findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true, paypalEmail: true, currency: true },
    })
    .catch(() => []);

  return NextResponse.json({ accounts });
}
