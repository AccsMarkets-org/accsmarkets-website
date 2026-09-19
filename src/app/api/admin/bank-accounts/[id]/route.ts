import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  bankName: z.string().trim().min(1).max(100).optional(),
  accountName: z.string().trim().min(1).max(100).optional(),
  accountNumber: z.string().trim().min(1).max(50).optional(),
  routingNumber: z.string().trim().max(30).optional(),
  swiftCode: z.string().trim().max(20).optional(),
  iban: z.string().trim().max(40).optional(),
  currency: z.string().trim().length(3).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const account = await prisma.platformBankAccount.update({
    where: { id: params.id },
    data: parsed.data,
  }).catch(() => null);

  if (!account) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
  await auditLog(prisma, session.user.id, "bank_account.update", "PlatformBankAccount", account.id, parsed.data);
  return NextResponse.json({ account });
}
