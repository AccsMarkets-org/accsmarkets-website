import { NextResponse } from "next/server";
import { requireAdmin, auditLog } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(4000),
});

export async function GET() {
  const session = await requireAdmin("MANAGE_ESCROW_MESSAGES");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const responses = await prisma.cannedResponse.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ responses });
}

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_ESCROW_MESSAGES");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const response = await prisma.cannedResponse.create({ data: parsed.data });
  await auditLog(prisma, session.user.id, "canned_response.create", "CannedResponse", response.id, { title: response.title });
  return NextResponse.json({ response }, { status: 201 });
}
