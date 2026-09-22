import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("extend"),
    days: z.union([z.literal(7), z.literal(14)]),
    /** Which window to extend. Defaults to whichever is active (featured first). */
    target: z.enum(["featured", "pinned"]).optional(),
  }),
  z.object({
    action: z.literal("cancel"),
    reason: z.string().trim().max(300).optional(),
  }),
]);

/** PATCH /api/admin/promotions/[listingId] — extend (+7d / +14d) or cancel a promotion. */
export async function PATCH(req: Request, { params }: { params: { listingId: string } }) {
  const session = await requireAdmin("MANAGE_LISTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: params.listingId },
    select: {
      id: true, title: true, sellerId: true,
      isFeatured: true, isPremiumFeatured: true, isPinned: true,
      featuredUntil: true, pinnedUntil: true,
    },
  });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const now = new Date();
  const input = parsed.data;

  if (input.action === "extend") {
    const hasFeatured = listing.isFeatured || listing.isPremiumFeatured;
    const target = input.target ?? (hasFeatured ? "featured" : listing.isPinned ? "pinned" : null);
    if (!target) return NextResponse.json({ error: "Listing has no active promotion to extend" }, { status: 400 });
    if (target === "featured" && !hasFeatured) {
      return NextResponse.json({ error: "Listing is not featured" }, { status: 400 });
    }
    if (target === "pinned" && !listing.isPinned) {
      return NextResponse.json({ error: "Listing is not pinned" }, { status: 400 });
    }

    const current = target === "featured" ? listing.featuredUntil : listing.pinnedUntil;
    const base = current && current > now ? current : now;
    const newUntil = new Date(base.getTime() + input.days * DAY_MS);

    await prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: { id: listing.id },
        data: target === "featured" ? { featuredUntil: newUntil } : { pinnedUntil: newUntil },
      });
      await auditLog(tx, session.user.id, "promotion_extend", "Listing", listing.id, {
        target, days: input.days, previousUntil: current, newUntil, sellerId: listing.sellerId,
      });
    });

    createNotification({
      userId: listing.sellerId,
      type: "LISTING",
      title: "Your promotion was extended",
      body: `"${listing.title}" will stay ${target === "pinned" ? "pinned" : "featured"} for ${input.days} more day(s).`,
      link: `/listings/${listing.id}`,
    }).catch(() => null);

    return NextResponse.json({ ok: true, target, until: newUntil });
  }

  // cancel
  if (!listing.isFeatured && !listing.isPremiumFeatured && !listing.isPinned) {
    return NextResponse.json({ error: "Listing has no active promotion" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id: listing.id },
      data: {
        isFeatured: false,
        isPremiumFeatured: false,
        isPinned: false,
        featuredUntil: null,
        pinnedUntil: null,
      },
    });
    await auditLog(tx, session.user.id, "promotion_cancel", "Listing", listing.id, {
      wasFeatured: listing.isFeatured,
      wasPremiumFeatured: listing.isPremiumFeatured,
      wasPinned: listing.isPinned,
      featuredUntil: listing.featuredUntil,
      pinnedUntil: listing.pinnedUntil,
      sellerId: listing.sellerId,
      reason: input.reason ?? null,
    });
  });

  createNotification({
    userId: listing.sellerId,
    type: "LISTING",
    title: "Your listing promotion was cancelled",
    body: input.reason
      ? `The promotion on "${listing.title}" was cancelled by our team: ${input.reason}`
      : `The promotion on "${listing.title}" was cancelled by our team. Contact support if you have questions.`,
    link: `/listings/${listing.id}`,
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
