import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const offerSchema = z.object({
  mediationOffer: z.number().min(0),
  note: z.string().max(1000).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_DISPUTES");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dispute = await prisma.dispute.findUnique({ where: { id: params.id } });
  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (dispute.phase !== "MEDIATION") {
    return NextResponse.json({ error: "Dispute must be in MEDIATION phase" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid offer amount" }, { status: 400 });

  const updated = await prisma.dispute.update({
    where: { id: params.id },
    data: { mediationOffer: parsed.data.mediationOffer, mediationAccepted: null },
  });

  await prisma.disputeTimeline.create({
    data: {
      disputeId: params.id,
      eventType: "mediation_offer",
      actorId: session.user.id,
      description: `Admin proposed mediation settlement: $${parsed.data.mediationOffer}${parsed.data.note ? `. Note: ${parsed.data.note}` : ""}`,
      metadata: { offer: parsed.data.mediationOffer },
    },
  });

  await auditLog(prisma, session.user.id, "dispute_mediation_offer", "Dispute", params.id, {
    offer: parsed.data.mediationOffer,
  });

  return NextResponse.json({ dispute: updated });
}
