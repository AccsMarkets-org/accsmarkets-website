import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";

export const dynamic = "force-dynamic";

// DELETE /api/admin/reviews/[id] — remove a review left after a completed
// escrow. The Review model has no hidden/deletedAt field, so this is a hard
// delete; the action is audit-logged for accountability.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const review = await prisma.review.findUnique({
    where: { id: params.id },
    select: { id: true, reviewerId: true, revieweeId: true, rating: true, escrowId: true },
  });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  await prisma.review.delete({ where: { id: params.id } });
  await auditLog(prisma, session.user.id, "review.delete", "Review", review.id, {
    reviewerId: review.reviewerId,
    revieweeId: review.revieweeId,
    rating: review.rating,
    escrowId: review.escrowId,
  });

  return NextResponse.json({ ok: true });
}
