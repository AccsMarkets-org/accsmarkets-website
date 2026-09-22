import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLATFORMS } from "@/lib/validation/listing";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  platform: z.enum(PLATFORMS).optional(),
  criteria: z.record(z.unknown()).optional(),
  budget: z.number().positive().optional(),
  status: z.enum(["OPEN", "FULFILLED", "CLOSED"]).optional(),
});

// PATCH /api/wanted-listings/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await prisma.wantedListing.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.buyerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { platform, criteria, ...rest } = parsed.data;
  const updated = await prisma.wantedListing.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(criteria !== undefined ? { criteria: criteria as never } : {}),
      ...(platform !== undefined ? { platform: platform as never } : {}),
    },
  });

  return NextResponse.json({ item: updated });
}

// DELETE /api/wanted-listings/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await prisma.wantedListing.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.buyerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.wantedListing.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
