import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { round2 } from "@/lib/utils";

export const dynamic = "force-dynamic";

const milestoneSchema = z.object({
  milestones: z
    .array(
      z.object({
        description: z.string().min(1).max(200),
        amount: z.number().positive(),
      }),
    )
    .min(2, "At least 2 milestones required")
    .max(10),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const escrow = await prisma.escrow.findUnique({ where: { id: params.id } });
  if (!escrow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (escrow.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Only the seller can propose milestones" }, { status: 403 });
  }
  if (escrow.status !== "FUNDED") {
    return NextResponse.json({ error: "Milestones can only be proposed while the escrow is funded" }, { status: 409 });
  }

  const existing = await prisma.escrowMilestone.count({ where: { escrowId: params.id } });
  if (existing > 0) {
    return NextResponse.json({ error: "Milestones already set for this escrow" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = milestoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // Amounts are stored as Decimal(12,2); round here so what is validated is
  // exactly what gets released later (a 0.005 could otherwise slip past the
  // sum check and be rounded up by the database).
  const milestones = parsed.data.milestones.map((m) => ({ ...m, amount: round2(m.amount) }));
  if (milestones.some((m) => m.amount < 0.01)) {
    return NextResponse.json({ error: "Each milestone must be at least $0.01" }, { status: 400 });
  }
  const totalMilestone = round2(milestones.reduce((s, m) => s + m.amount, 0));
  const escrowAmount = Number(escrow.amount);

  // Must match exactly — the ±1 cent tolerance used here before let the
  // released total exceed what the buyer actually paid.
  if (totalMilestone !== escrowAmount) {
    return NextResponse.json(
      { error: `Milestone amounts must sum to the escrow amount (${escrowAmount.toFixed(2)})` },
      { status: 400 },
    );
  }

  let created;
  try {
    created = await prisma.$transaction(
      milestones.map((m) =>
        prisma.escrowMilestone.create({
          data: { escrowId: params.id, description: m.description, amount: m.amount },
        }),
      ),
    );
  } catch {
    return NextResponse.json({ error: "Failed to create milestones" }, { status: 500 });
  }

  return NextResponse.json({ milestones: created }, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const escrow = await prisma.escrow.findUnique({ where: { id: params.id } });
  if (!escrow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (escrow.buyerId !== session.user.id && escrow.sellerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const milestones = await prisma.escrowMilestone.findMany({
    where: { escrowId: params.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ milestones });
}
