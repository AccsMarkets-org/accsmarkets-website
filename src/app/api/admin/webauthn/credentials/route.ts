import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, auditLog } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET — list the current admin's own registered Face ID / passkey devices. */
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const credentials = await prisma.webAuthnCredential.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, deviceType: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ credentials });
}

const deleteSchema = z.object({ id: z.string().min(1) });

/** DELETE — remove one of the current admin's own devices. Can only ever target your own rows. */
export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { count } = await prisma.webAuthnCredential.deleteMany({
    where: { id: parsed.data.id, userId: session.user.id },
  });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await auditLog(prisma, session.user.id, "webauthn.remove", "User", session.user.id);
  return NextResponse.json({ ok: true });
}
