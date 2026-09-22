import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";
import { getAllowedTransitions, PHASE_TRANSITIONS } from "@/lib/dispute-phases";
import { DisputePhase } from "@prisma/client";

export const dynamic = "force-dynamic";

const schema = z.object({
  toPhase: z.nativeEnum(DisputePhase),
  note: z.string().max(1000).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_DISPUTES");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dispute = await prisma.dispute.findUnique({ where: { id: params.id } });
  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // A ruled/closed dispute must not keep moving through phases — that would
  // overwrite resolvedAt and re-open evidence on an already-settled case.
  if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW") {
    return NextResponse.json(
      { error: "This dispute is already resolved — phase changes are no longer possible." },
      { status: 400 },
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { toPhase, note } = parsed.data;

  const allowed = getAllowedTransitions(dispute.phase, true);
  if (!allowed.some((t) => t.to === toPhase)) {
    return NextResponse.json({ error: `Cannot transition from ${dispute.phase} to ${toPhase}` }, { status: 400 });
  }

  const transition = PHASE_TRANSITIONS.find((t) => t.from === dispute.phase && t.to === toPhase)!;

  const updated = await prisma.dispute.update({
    where: { id: params.id },
    data: {
      phase: toPhase,
      // Set evidence deadline when entering EVIDENCE (already set on creation; this handles manual reset)
      evidenceDeadline: toPhase === "EVIDENCE" ? new Date(Date.now() + 72 * 3600 * 1000) : undefined,
      // Mark appeal time
      appealedAt: toPhase === "APPEAL" ? new Date() : undefined,
      // Mark final resolution time
      resolvedAt: toPhase === "FINAL" ? new Date() : undefined,
    },
  });

  await prisma.disputeTimeline.create({
    data: {
      disputeId: params.id,
      eventType: "phase_change",
      actorId: session.user.id,
      description: `Phase advanced: ${dispute.phase} → ${toPhase}. ${transition.label}${note ? `. Note: ${note}` : ""}`,
      metadata: { fromPhase: dispute.phase, toPhase, note },
    },
  });

  await auditLog(prisma, session.user.id, "dispute_phase_change", "Dispute", params.id, {
    from: dispute.phase,
    to: toPhase,
  });

  return NextResponse.json({ dispute: updated });
}
