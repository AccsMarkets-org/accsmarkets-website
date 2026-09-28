import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.contactMessage.update({
    where: { id: params.id },
    data: { isRead: true, readAt: new Date(), readById: session.user.id },
  });

  return NextResponse.json({ success: true });
}
