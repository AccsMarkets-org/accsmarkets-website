import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.literal("clear_flag"),
});

// PATCH /api/admin/flagged-messages/[id] — clear the moderation flag on a message.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid action" }, { status: 400 });
  }

  const message = await prisma.message.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const updated = await prisma.message.update({
    where: { id: params.id },
    data: { moderationFlagged: false },
  });
  await auditLog(prisma, session.user.id, "message.clear_flag", "Message", message.id);

  return NextResponse.json({ message: updated });
}
