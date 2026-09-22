import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import type { TransactionType } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_EXPORT = 50_000;

const TRANSACTION_TYPES: TransactionType[] = [
  "DEPOSIT", "WITHDRAWAL", "ESCROW_PAYMENT", "ESCROW_RELEASE", "PLATFORM_FEE",
  "REFUND", "WALLET_CREDIT", "WALLET_DEBIT", "PROMOTION", "BUMP", "SUBSCRIPTION",
];

/** `new Date("nonsense")` is an Invalid Date, which Prisma rejects — drop it. */
function parseDate(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: Request) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  // Unvalidated enum / date / limit values from the query string reach Prisma
  // and throw, so anything that isn't a known value is dropped instead.
  const rawType = url.searchParams.get("type");
  const typeFilter = TRANSACTION_TYPES.includes(rawType as TransactionType)
    ? (rawType as TransactionType)
    : null;
  const from = parseDate(url.searchParams.get("from"));
  const to = parseDate(url.searchParams.get("to"));
  const limitParam = Number(url.searchParams.get("limit") ?? MAX_EXPORT);
  const take = Number.isFinite(limitParam)
    ? Math.min(Math.max(1, Math.floor(limitParam)), MAX_EXPORT)
    : MAX_EXPORT;

  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
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
