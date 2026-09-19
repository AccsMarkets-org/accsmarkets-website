import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  bankName: z.string().trim().min(1).max(100),
  accountName: z.string().trim().min(1).max(100),
  accountNumber: z.string().trim().min(1).max(50),
  routingNumber: z.string().trim().max(30).optional(),
  swiftCode: z.string().trim().max(20).optional(),
  iban: z.string().trim().max(40).optional(),
  currency: z.string().trim().length(3).default("USD"),
  sortOrder: z.number().int().min(0).default(0),
});

export async function GET() {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const accounts = await prisma.platformBankAccount.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const account = await prisma.platformBankAccount.create({ data: parsed.data });
  await auditLog(prisma, session.user.id, "bank_account.create", "PlatformBankAccount", account.id, {
    bankName: account.bankName,
    accountName: account.accountName,
  });
  return NextResponse.json({ account }, { status: 201 });
}
