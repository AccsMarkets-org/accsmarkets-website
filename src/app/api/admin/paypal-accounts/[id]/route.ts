import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  paypalEmail: z.string().trim().email().optional(),
  instructions: z.string().trim().max(1000).optional(),
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

  const account = await prisma.platformPayPalAccount.update({
    where: { id: params.id },
    data: parsed.data,
  }).catch(() => null);

  if (!account) return NextResponse.json({ error: "PayPal account not found" }, { status: 404 });
  await auditLog(prisma, session.user.id, "paypal_account.update", "PlatformPayPalAccount", account.id, parsed.data);
  return NextResponse.json({ account });
}
