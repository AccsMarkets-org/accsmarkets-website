import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";
import { round2 } from "@/lib/utils";
import {
  ACTION_TARGET,
  deleteBlockReason,
  deleteListingCascade,
  transitionBlockReason,
  transitionData,
  type SellerListingAction,
} from "@/app/api/listings/_lib/transitions";

export const dynamic = "force-dynamic";

const MAX_IDS = 100;
const MIN_PRICE = 1;
const MAX_PRICE = 1_000_000;

const schema = z
  .object({
    ids: z.array(z.string().min(1).max(64)).min(1, "Select at least one listing").max(MAX_IDS, `At most ${MAX_IDS} listings per request`),
    action: z.enum(["pause", "unpause", "mark_sold", "relist", "delete", "price"]),
    price: z
      .object({
        mode: z.enum(["set", "percent"]),
        value: z.number().finite(),
      })
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.action === "price") {
      if (!v.price) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "Price adjustment is required" });
        return;
      }
      if (v.price.mode === "set" && (v.price.value < MIN_PRICE || v.price.value > MAX_PRICE)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price", "value"], message: `Price must be between $${MIN_PRICE} and $${MAX_PRICE.toLocaleString()}` });
      }
      if (v.price.mode === "percent" && (v.price.value <= -100 || v.price.value > 1000)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price", "value"], message: "Percentage must be between -99 and +1000" });
      }
    }
  });

/** Statuses whose price a seller may change without going back through review. */
const PRICE_EDITABLE = ["DRAFT", "PENDING", "REJECTED", "ACTIVE", "PAUSED"] as const;

const AUDIT_ACTION: Record<z.infer<typeof schema>["action"], string> = {
  pause: "LISTING_BULK_PAUSED",
  unpause: "LISTING_BULK_UNPAUSED",
  mark_sold: "LISTING_BULK_MARKED_SOLD",
  relist: "LISTING_BULK_RELISTED",
  delete: "LISTING_BULK_DELETED",
  price: "LISTING_BULK_PRICE_ADJUSTED",
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { action, price } = parsed.data;
  const ids = Array.from(new Set(parsed.data.ids));
  const userId = session.user.id;

  // Only the caller's own listings are ever loaded; ids that belong to someone
  // else (or don't exist) simply fall through to the "skipped" list.
  let listings;
  try {
    listings = await prisma.listing.findMany({
      where: { id: { in: ids }, sellerId: userId },
      select: { id: true, title: true, status: true, price: true },
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  const byId = new Map(listings.map((l) => [l.id, l]));

  const done: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const id of ids) {
    const listing = byId.get(id);
    if (!listing) {
      skipped.push({ id, reason: "Listing not found" });
      continue;
    }

    try {
      if (action === "price") {
        if (!PRICE_EDITABLE.includes(listing.status as (typeof PRICE_EDITABLE)[number])) {
          skipped.push({ id, reason: "Price can no longer be changed for this listing" });
          continue;
        }
        const current = Number(listing.price);
        const next =
          price!.mode === "set" ? round2(price!.value) : round2(current * (1 + price!.value / 100));
        if (!Number.isFinite(next) || next < MIN_PRICE || next > MAX_PRICE) {
          skipped.push({ id, reason: `Resulting price would be outside $${MIN_PRICE}–$${MAX_PRICE.toLocaleString()}` });
          continue;
        }
        if (next === current) {
          skipped.push({ id, reason: "Price unchanged" });
          continue;
        }
        await prisma.listing.update({ where: { id }, data: { price: next } });
        done.push(id);
        continue;
      }

      const blocked = transitionBlockReason(listing.status, action as SellerListingAction);
      if (blocked) {
        skipped.push({ id, reason: blocked });
        continue;
      }

      if (action === "delete") {
        const escrowBlock = await deleteBlockReason(id);
        if (escrowBlock) {
          skipped.push({ id, reason: escrowBlock });
          continue;
        }
        await prisma.$transaction((tx) => deleteListingCascade(tx, id));
        done.push(id);
        continue;
      }

      await prisma.listing.update({ where: { id }, data: transitionData(action) });
      emitToUser(userId, "listing_update", { listingId: id, status: ACTION_TARGET[action] });
      done.push(id);
    } catch (err) {
      console.error(`[POST /api/listings/bulk] ${action} ${id}`, err);
      skipped.push({ id, reason: "Update failed" });
    }
  }

  // One audit entry per bulk call, carrying the full id list + outcome.
  prisma.adminAuditLog
    .create({
      data: {
        adminId: userId,
        action: AUDIT_ACTION[action],
        targetType: "LISTING",
        targetId: done[0] ?? ids[0],
        metadata: {
          sellerId: userId,
          requested: ids,
          done,
          skipped,
          ...(price ? { price } : {}),
        },
      },
    })
    .catch(() => null);

  if (done.length > 0) {
    const summary: Record<z.infer<typeof schema>["action"], string> = {
      pause: "paused",
      unpause: "resumed",
      mark_sold: "marked as sold",
      relist: "relisted",
      delete: "deleted",
      price: "repriced",
    };
    createNotification({
      userId,
      type: "LISTING",
      title: `Bulk action complete`,
      body: `${done.length} listing${done.length === 1 ? "" : "s"} ${summary[action]}${skipped.length ? ` · ${skipped.length} skipped` : ""}.`,
      link: "/dashboard/listings",
    }).catch(() => null);
  }

  return NextResponse.json({ done, skipped });
}
