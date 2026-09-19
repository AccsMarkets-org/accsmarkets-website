import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/admin";
import { emitToRoom, escrowRoom } from "@/lib/socket";

export const dynamic = "force-dynamic";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string; messageId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hasPermission = await checkPermission(session.user.id, "MANAGE_ESCROW_MESSAGES");
  if (!hasPermission) return NextResponse.json({ error: "Forbidden: requires MANAGE_ESCROW_MESSAGES" }, { status: 403 });

  const message = await prisma.message.findUnique({
    where: { id: params.messageId },
  });
  if (!message || message.escrowId !== params.id) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const toggled = !message.isPinned;
  const updated = await prisma.message.update({
    where: { id: params.messageId },
    data: {
      isPinned: toggled,
      pinnedAt: toggled ? new Date() : null,
      pinnedById: toggled ? session.user.id : null,
    },
    include: { sender: { select: { id: true, username: true, name: true, role: true } } },
  });

  emitToRoom(escrowRoom(params.id), "message_pinned", { message: updated });

  return NextResponse.json({ message: updated });
}
