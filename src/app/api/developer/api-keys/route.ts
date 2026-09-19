import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(z.enum(["read", "write"])).default(["read"]),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id, revokedAt: null },
    select: { id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const existing = await prisma.apiKey.count({ where: { userId: session.user.id, revokedAt: null } });
  if (existing >= 10) return NextResponse.json({ error: "Maximum of 10 active API keys allowed" }, { status: 409 });

  const raw = `am_${randomBytes(24).toString("hex")}`;
  const keyHash = hashKey(raw);
  const keyPrefix = raw.slice(0, 10);
  const { name, scopes, expiresInDays } = parsed.data;
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400_000) : null;

  await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      name,
      keyHash,
      keyPrefix,
      scopes: scopes.join(","),
      expiresAt: expiresAt ?? undefined,
    },
  });

  return NextResponse.json({ key: raw, prefix: keyPrefix }, { status: 201 });
}
