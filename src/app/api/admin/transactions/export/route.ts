import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import type { TransactionType } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_EXPORT = 50_000;

export async function GET(req: Request) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const typeFilter = url.searchParams.get("type") as TransactionType | null;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limitParam = Number(url.searchParams.get("limit") ?? MAX_EXPORT);
  const take = Math.min(Math.max(1, limitParam), MAX_EXPORT);

  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {};

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(typeFilter ? { type: typeFilter } : {}),
      ...dateFilter,
    },
    include: { user: { select: { username: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });

  function csvCell(value: string | null | undefined): string {
    if (value == null) return "";
    // Escape formula injection: prefix cells starting with =,+,-,@ with a tab
    const s = String(value).replace(/"/g, '""');
    const safe = /^[=+\-@\t\r]/.test(s) ? `\t${s}` : s;
    return `"${safe}"`;
  }

  const header = "id,type,status,amount,userId,userEmail,escrowId,createdAt\n";
  const rows = transactions.map((tx) =>
    [
      csvCell(tx.id),
      csvCell(tx.type),
      csvCell(tx.status),
      csvCell(String(tx.amount)),
      csvCell(tx.userId),
      csvCell(tx.user.email),
      csvCell(tx.escrowId ?? ""),
      csvCell(tx.createdAt.toISOString()),
    ].join(","),
  );
  const csv = header + rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="transactions_${new Date().toISOString().slice(0, 10)}.csv"`,
      "X-Total-Count": String(transactions.length),
    },
  });
}
