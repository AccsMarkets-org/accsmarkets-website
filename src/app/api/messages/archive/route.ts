import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { archiveSchema } from "@/lib/validation/message";

export const dynamic = "force-dynamic";
import { conversationId } from "@/lib/socket";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = archiveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Scope archive to current user only so partner's inbox is unaffected
  await prisma.message.updateMany({
    where: {
      conversationId: conversationId(session.user.id, parsed.data.partnerId),
      escrowId: null,
      OR: [{ senderId: session.user.id }, { recipientId: session.user.id }],
    },
    data: { isArchived: true },
  });

  return NextResponse.json({ success: true });
}
