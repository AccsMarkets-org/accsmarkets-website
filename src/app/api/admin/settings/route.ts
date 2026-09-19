import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  siteName:                           z.string().min(1).max(100).optional(),
  maintenanceMode:                    z.boolean().optional(),
  registrationOpen:                   z.boolean().optional(),
  requireEmailVerification:           z.boolean().optional(),
  minDeposit:                         z.coerce.number().min(0).optional(),
  minWithdrawal:                      z.coerce.number().min(0).optional(),
  escrowTransferDays:                 z.coerce.number().int().min(1).max(30).optional(),
  disputeWindowHours:                 z.coerce.number().int().min(1).max(720).optional(),
  highValueEscrowThreshold:           z.coerce.number().min(0).optional(),
  listingReviewHours:                 z.coerce.number().int().min(1).max(720).optional(),
  bankTransferShortfallToleranceUsd:  z.coerce.number().min(0).optional(),
  bankTransferShortfallTolerancePct:  z.coerce.number().min(0).max(100).optional(),
  walletAddressTrc20:                 z.string().max(200).optional().nullable(),
  walletAddressBep20:                 z.string().max(200).optional().nullable(),
  walletAddressErc20:                 z.string().max(200).optional().nullable(),
  walletAddressMatic:                 z.string().max(200).optional().nullable(),
  walletAddressSol:                   z.string().max(200).optional().nullable(),
});

export async function GET() {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    create: {},
    update: {},
  }).catch(() => null);
  if (!settings) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { allowed } = await checkRateLimit(`admin-settings-change:${session.user.id}`, 30, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Too many changes. Slow down and try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const settings = await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    create: parsed.data,
    update: parsed.data,
  });
  await auditLog(prisma, session.user.id, "platform_settings.update", "PlatformSettings", "singleton", parsed.data);
  return NextResponse.json({ settings });
}
