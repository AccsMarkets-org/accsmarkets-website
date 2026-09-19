import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const VALID_EVENTS = [
  "ESCROW_CREATED", "ESCROW_FUNDED", "ESCROW_COMPLETED", "ESCROW_DISPUTED",
  "OFFER_RECEIVED", "OFFER_ACCEPTED", "LISTING_SOLD", "PAYMENT_RECEIVED",
] as const;

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  events: z.array(z.enum(VALID_EVENTS)).min(1).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!endpoint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { enabled, events } = parsed.data;
  await prisma.webhookEndpoint.update({
    where: { id: params.id },
    data: {
      ...(enabled !== undefined ? { enabled } : {}),
      ...(events ? { events: events.join(",") } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!endpoint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.webhookEndpoint.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
