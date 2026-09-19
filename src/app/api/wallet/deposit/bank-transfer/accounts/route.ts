import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lists the platform's active receiving bank accounts so a depositing user can
// pick which one to transfer to. Full account details are shown on the order
// page after an order is created; here we return just enough to choose.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.platformBankAccount
    .findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, bankName: true, accountName: true, accountNumber: true, currency: true },
    })
    .catch(() => []);

  const list = accounts.map((a) => ({
    id: a.id,
    bankName: a.bankName,
    accountName: a.accountName,
    currency: a.currency,
    accountLast4: a.accountNumber ? a.accountNumber.slice(-4) : "",
  }));

  return NextResponse.json({ accounts: list });
}
