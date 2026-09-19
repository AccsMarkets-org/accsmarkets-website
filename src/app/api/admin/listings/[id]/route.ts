import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";
import { sendEmail } from "@/lib/email";
import { listingApprovedTemplate, listingRejectedTemplate } from "@/lib/email-templates";
import { submitToIndexNow, listingUrl } from "@/lib/indexnow";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "suspend", "reactivate"]),
  reason: z.string().trim().max(1000).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_LISTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const { action, reason } = parsed.data;

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { seller: { select: { name: true, email: true } } },
  });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  if (action === "approve") {
    if (listing.status !== "PENDING") {
      return NextResponse.json({ error: "Only pending listings can be approved." }, { status: 400 });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const l = await tx.listing.update({
        where: { id: listing.id },
        data: { status: "ACTIVE", approvedAt: new Date(), rejectionReason: null },
      });
      await auditLog(tx, session.user.id, "listing.approve", "Listing", listing.id);
      return l;
    });

    // Side-effects: fire-and-forget — never let them crash the response
    createNotification({
      userId: listing.sellerId,
      type: "LISTING_APPROVED",
      title: "Listing approved 🎉",
      body: `"${listing.title}" is now live on the marketplace.`,
      link: `/listings/${listing.id}`,
    }).catch(() => {});
    try { emitToUser(listing.sellerId, "listing_approved", { listingId: listing.id }); } catch {}
    const approvedTpl = listingApprovedTemplate(listing.seller.name ?? "there", listing.title, listing.id);
    sendEmail({ to: listing.seller.email, subject: approvedTpl.subject, html: approvedTpl.html, slug: "listing_approved" }).catch(() => {});

    // Ping IndexNow — the listing is now live & in the sitemap.
    submitToIndexNow([listingUrl(listing.id), "https://accsmarkets.org/listings"]).catch(() => {});
    // Bust the sitemap cache so the new listing appears immediately.
    revalidateTag("sitemap");

    return NextResponse.json({ listing: updated });
  }

  if (action === "reject") {
    if (listing.status !== "PENDING") {
      return NextResponse.json({ error: "Only pending listings can be rejected." }, { status: 400 });
    }
    const rejectionReason = reason || "Does not meet marketplace guidelines.";
    const updated = await prisma.$transaction(async (tx) => {
      const l = await tx.listing.update({
        where: { id: listing.id },
        data: { status: "REJECTED", rejectionReason },
      });
      await auditLog(tx, session.user.id, "listing.reject", "Listing", listing.id, { reason: rejectionReason });
      return l;
    });

    createNotification({
      userId: listing.sellerId,
      type: "LISTING_REJECTED",
      title: "Listing needs changes",
      body: rejectionReason,
      link: "/dashboard/listings",
    }).catch(() => {});
    const rejectedTpl = listingRejectedTemplate(listing.seller.name ?? "there", listing.title, rejectionReason);
    sendEmail({ to: listing.seller.email, subject: rejectedTpl.subject, html: rejectedTpl.html, slug: "listing_rejected" }).catch(() => {});

    return NextResponse.json({ listing: updated });
  }

  if (action === "reactivate") {
    if (listing.status !== "SUSPENDED") {
      return NextResponse.json({ error: "Only suspended listings can be reactivated." }, { status: 400 });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const l = await tx.listing.update({
        where: { id: listing.id },
        data: { status: "ACTIVE", rejectionReason: null },
      });
      await auditLog(tx, session.user.id, "listing.reactivate", "Listing", listing.id);
      return l;
    });

    createNotification({
      userId: listing.sellerId,
      type: "LISTING_APPROVED",
      title: "Listing reactivated",
      body: `"${listing.title}" has been reactivated on the marketplace.`,
      link: `/listings/${listing.id}`,
    }).catch(() => {});

    // Back in the sitemap — re-notify IndexNow.
    submitToIndexNow([listingUrl(listing.id), "https://accsmarkets.org/listings"]).catch(() => {});
    revalidateTag("sitemap");

    return NextResponse.json({ listing: updated });
  }

  // suspend — remove an active listing from the marketplace
  if (listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Only active listings can be suspended." }, { status: 400 });
  }
  const updated = await prisma.$transaction(async (tx) => {
    const l = await tx.listing.update({
      where: { id: listing.id },
      data: { status: "SUSPENDED", rejectionReason: reason ?? "Suspended by moderation." },
    });
    await auditLog(tx, session.user.id, "listing.suspend", "Listing", listing.id, { reason });
    return l;
  });

  createNotification({
    userId: listing.sellerId,
    type: "SYSTEM",
    title: "Listing suspended",
    body: reason ?? `"${listing.title}" was suspended by moderation.`,
    link: "/dashboard/listings",
  }).catch(() => {});

  return NextResponse.json({ listing: updated });
}
