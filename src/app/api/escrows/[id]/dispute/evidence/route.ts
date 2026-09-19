import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

const schema = z.object({ statement: z.string().trim().min(10).max(3000) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Statement must be 10–3000 characters." }, { status: 400 });
  }

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: { dispute: { include: { evidence: true } } },
  });
  if (!escrow || escrow.status !== "DISPUTED" || !escrow.dispute) {
    return NextResponse.json({ error: "No open dispute on this escrow." }, { status: 404 });
  }

  const isParticipant = escrow.buyerId === session.user.id || escrow.sellerId === session.user.id;
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = escrow.dispute.evidence.find((e) => e.userId === session.user.id);
  if (existing) return NextResponse.json({ error: "You have already submitted evidence." }, { status: 409 });

  const statement = sanitizeText(parsed.data.statement);
  const evidence = await prisma.disputeEvidence.create({
    data: { disputeId: escrow.dispute.id, userId: session.user.id, statement },
  });

  return NextResponse.json({ evidence }, { status: 201 });
}
