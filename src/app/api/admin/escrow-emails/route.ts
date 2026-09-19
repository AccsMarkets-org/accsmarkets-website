import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, auditLog } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  address: z.string().email("Enter a valid email address"),
  platform: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  const session = await requireAdmin("MANAGE_ESCROWS");
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const emails = await prisma.escrowManagerEmail.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      escrow: {
        select: {
          id: true,
          status: true,
          listing: { select: { title: true } },
        },
      },
    },
  });

  return NextResponse.json({ emails });
}

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_ESCROWS");
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const email = await prisma.escrowManagerEmail.create({
      data: {
        address: parsed.data.address,
        platform: parsed.data.platform,
        notes: parsed.data.notes ?? null,
      },
    });
    await auditLog(prisma, session.user.id, "escrow_email.create", "EscrowManagerEmail", email.id, {
      address: email.address,
      platform: email.platform,
    });
    return NextResponse.json({ email }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "This email address is already in the pool." }, { status: 409 });
    }
    throw err;
  }
}
