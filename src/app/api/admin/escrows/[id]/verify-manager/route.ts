import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";

export const dynamic = "force-dynamic";

const schema = z.object({
  approved: z.boolean(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_ESCROWS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: { listing: { select: { title: true } } },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  if (escrow.status !== "PENDING_VERIFICATION") {
    return NextResponse.json({ error: "Escrow is not pending manager verification." }, { status: 400 });
  }

  const { approved, notes } = parsed.data;

  if (approved) {
    const updated = await prisma.escrow.update({
      where: { id: escrow.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        verifiedBy: session.user.id,
      },
    });

    await Promise.all([
      createNotification({
        userId: escrow.buyerId,
        type: "ESCROW",
        title: "Manager add verified",
        body: `Our team verified the manager add for "${escrow.listing.title}". Please verify your access.`,
        link: `/dashboard/escrows/${escrow.id}`,
      }),
      createNotification({
        userId: escrow.sellerId,
        type: "ESCROW",
        title: "Manager add approved",
        body: `Your manager add for "${escrow.listing.title}" was verified. The buyer can now confirm access.`,
        link: `/dashboard/escrows/${escrow.id}`,
      }),
    ]);
    emitToUser(escrow.buyerId, "escrow_manager_verified", { escrowId: escrow.id });
    emitToUser(escrow.sellerId, "escrow_manager_verified", { escrowId: escrow.id });
    await auditLog(prisma, session.user.id, "escrow.verify_manager_approved", "Escrow", escrow.id).catch(() => null);

    return NextResponse.json({ escrow: updated });
  } else {
    const updated = await prisma.escrow.update({
      where: { id: escrow.id },
      data: { status: "AWAITING_MANAGER_ADD" },
    });

    await createNotification({
      userId: escrow.sellerId,
      type: "ESCROW",
      title: "Manager add rejected",
      body: `The manager add for "${escrow.listing.title}" was not verified.${notes ? ` Reason: ${notes}` : ""} Please try again.`,
      link: `/dashboard/escrows/${escrow.id}`,
    });
    emitToUser(escrow.sellerId, "escrow_manager_rejected", { escrowId: escrow.id });
    await auditLog(prisma, session.user.id, "escrow.verify_manager_rejected", "Escrow", escrow.id, { notes }).catch(() => null);

    return NextResponse.json({ escrow: updated });
  }
}
