import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().min(10).max(2000).optional(),
  iconUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
});

// GET /api/apps/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const app = await prisma.appListing.findUnique({
    where: { id: params.id },
    include: {
      developer: { select: { username: true, verifiedBadge: true, trustScore: true } },
      installations: { select: { userId: true } },
    },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.status !== "APPROVED") {
    const session = await getServerSession(authOptions);
    if (session?.user?.id !== app.developerId && session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }
  return NextResponse.json({ app });
}

// PATCH /api/apps/[id] — update app (developer only, only in DRAFT)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await prisma.appListing.findUnique({ where: { id: params.id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.developerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["DRAFT", "REJECTED"].includes(app.status)) {
    return NextResponse.json({ error: "App cannot be edited in its current state" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.appListing.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json({ app: updated });
}

// POST /api/apps/[id] with action=submit — submit for review
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await prisma.appListing.findUnique({ where: { id: params.id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.developerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (app.status !== "DRAFT" && app.status !== "REJECTED") {
    return NextResponse.json({ error: "App cannot be submitted in its current state" }, { status: 400 });
  }

  const updated = await prisma.appListing.update({
    where: { id: params.id },
    data: { status: "SUBMITTED", rejectionReason: null },
  });
  return NextResponse.json({ app: updated });
}
