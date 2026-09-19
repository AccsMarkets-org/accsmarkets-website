import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { submitEscrowSchema } from "@/lib/validation/escrow";
import { assertTransition, EscrowTransitionError } from "@/lib/escrow-state-machine";
import { encryptCredentials } from "@/lib/credentials-crypto";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = submitEscrowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: { listing: { select: { title: true, platform: true } } },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  if (escrow.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Only the seller can submit transfer details." }, { status: 403 });
  }

  try {
    assertTransition(escrow.status, "SUBMITTED");
  } catch (err) {
    if (err instanceof EscrowTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  let updated;
  try {
    updated = await prisma.escrow.update({
      where: { id: escrow.id },
      data: {
        status: "SUBMITTED",
        credentialsPayload: encryptCredentials(parsed.data.credentials),
        submittedAt: new Date(),
        // transferDeadline is intentionally left unset — the countdown starts
        // once the escrow is verified (see /api/escrows/[id]/verify).
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to update escrow" }, { status: 500 });
  }

  await createNotification({
    userId: escrow.buyerId,
    type: "ESCROW",
    title: "Transfer details submitted",
    body: `The seller submitted account details for "${escrow.listing.title}". Verify your access.`,
    link: `/dashboard/escrows/${escrow.id}`,
  });
  emitToUser(escrow.buyerId, "escrow_submitted", { escrowId: escrow.id });

  return NextResponse.json({ escrow: updated });
}
