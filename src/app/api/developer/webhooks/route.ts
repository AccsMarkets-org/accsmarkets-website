import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";

const VALID_EVENTS = [
  "ESCROW_CREATED", "ESCROW_FUNDED", "ESCROW_COMPLETED", "ESCROW_DISPUTED",
  "OFFER_RECEIVED", "OFFER_ACCEPTED", "LISTING_SOLD", "PAYMENT_RECEIVED",
] as const;

function isPrivateUrl(raw: string): boolean {
  try {
    const { hostname } = new URL(raw);
    if (!hostname || hostname === "localhost") return true;
    const privatePatterns = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/i,
      /^fe80:/i,
    ];
    return privatePatterns.some((p) => p.test(hostname));
  } catch {
    return true;
  }
}

const createSchema = z.object({
  url: z
    .string()
    .url()
    .max(500)
    .startsWith("https://", { message: "Webhook URL must use HTTPS" })
    .refine((u) => !isPrivateUrl(u), { message: "Webhook URL must be a public HTTPS endpoint" }),
  events: z.array(z.enum(VALID_EVENTS)).min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { userId: session.user.id },
    select: {
      id: true, url: true, events: true, enabled: true, createdAt: true,
      _count: { select: { deliveries: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ endpoints });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const existing = await prisma.webhookEndpoint.count({ where: { userId: session.user.id } });
  if (existing >= 10) return NextResponse.json({ error: "Maximum of 10 webhook endpoints allowed" }, { status: 409 });

  const secret = `whsec_${randomBytes(24).toString("hex")}`;
  const { url, events } = parsed.data;

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      userId: session.user.id,
      url,
      secret,
      events: events.join(","),
    },
  });

  return NextResponse.json({ id: endpoint.id, secret }, { status: 201 });
}
