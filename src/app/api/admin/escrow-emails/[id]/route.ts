import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, auditLog } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  action: z.enum(["flag", "unflag", "release"]),
  notes: z.string().max(500).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_ESCROWS");
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const poolEmail = await prisma.escrowManagerEmail.findUnique({
    where: { id: params.id },
    include: { escrow: { select: { id: true } } },
  });
  if (!poolEmail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { action, notes } = parsed.data;

  if (action === "flag") {
    const updated = await prisma.escrowManagerEmail.update({
      where: { id: params.id },
      data: { status: "FLAGGED", notes: notes ?? poolEmail.notes },
    });
    await auditLog(prisma, session.user.id, "escrow_email.flag", "EscrowManagerEmail", params.id, { notes });
    return NextResponse.json({ email: updated });
  }

  if (action === "unflag") {
    const updated = await prisma.escrowManagerEmail.update({
      where: { id: params.id },
      data: { status: poolEmail.escrow ? "IN_USE" : "AVAILABLE" },
    });
    await auditLog(prisma, session.user.id, "escrow_email.unflag", "EscrowManagerEmail", params.id);
    return NextResponse.json({ email: updated });
  }

  if (action === "release") {
    if (poolEmail.status !== "IN_USE") {
      return NextResponse.json({ error: "Email is not currently in use." }, { status: 400 });
    }
    // Remove the link from the assigned escrow before releasing
    const assignedEscrow = await prisma.escrow.findFirst({
      where: { managerEmailId: params.id },
    });
    if (assignedEscrow) {
      await prisma.escrow.update({
        where: { id: assignedEscrow.id },
        data: { managerEmailId: null },
      });
    }
    const updated = await prisma.escrowManagerEmail.update({
      where: { id: params.id },
      data: { status: "AVAILABLE" },
    });
    await auditLog(prisma, session.user.id, "escrow_email.release", "EscrowManagerEmail", params.id, {
      previousEscrowId: assignedEscrow?.id,
    });
    return NextResponse.json({ email: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
