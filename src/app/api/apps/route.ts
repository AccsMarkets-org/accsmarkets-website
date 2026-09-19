import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_SCOPES = ["listings:read", "escrows:read", "user:read", "wallet:read"] as const;

const createSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(10).max(2000),
  iconUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  apiScopesRequested: z.array(z.enum(VALID_SCOPES)).min(1),
});

// GET /api/apps — list approved apps (public directory)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "true";

  if (mine) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const apps = await prisma.appListing.findMany({
      where: { developerId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ apps });
  }

  const apps = await prisma.appListing.findMany({
    where: { status: "APPROVED" },
    orderBy: { installCount: "desc" },
    include: { developer: { select: { username: true, verifiedBadge: true } } },
  });
  return NextResponse.json({ apps });
}

// POST /api/apps — register a new app
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const app = await prisma.appListing.create({
    data: {
      developerId: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      iconUrl: parsed.data.iconUrl ?? null,
      websiteUrl: parsed.data.websiteUrl ?? null,
      apiScopesRequested: parsed.data.apiScopesRequested,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ app }, { status: 201 });
}
