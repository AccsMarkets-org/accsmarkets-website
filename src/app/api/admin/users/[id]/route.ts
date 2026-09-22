import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { subscriptionActivatedTemplate } from "@/lib/email-templates";
import { AchievementBadgeType } from "@prisma/client";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_ACHIEVEMENT_BADGES: AchievementBadgeType[] = [
  "FIVE_STAR_SELLER",
  "FAST_RESPONDER",
  "TRUSTED_SELLER",
];

const actionSchema = z.object({
  action: z.enum(["ban", "unban", "adjust_balance", "trust_score_override", "set_badge", "award_achievement_badge", "revoke_achievement_badge", "extend_subscription", "cancel_subscription", "change_plan", "update_profile"]),
  reason: z.string().trim().max(500).optional(),
  amount: z.number().optional(),
  trustScore: z.number().int().min(0).max(100).optional(),
  badge: z.enum(["NONE", "BLUE", "GOLD", "GREY", "OFFICIAL"]).optional(),
  achievementBadge: z.nativeEnum(AchievementBadgeType).optional(),
  planId: z.string().optional(),
  // update_profile fields
  username: z.string().trim().min(2).max(30).optional(),
  email: z.string().trim().email().optional(),
  name: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(300).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { allowed } = await checkRateLimit(`admin-user-action:${session.user.id}`, 60, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Too many actions. Slow down and try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const { action, reason, amount, trustScore, badge, achievementBadge, planId, username, email, name, bio } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.id === session.user.id && action === "ban") {
    return NextResponse.json({ error: "You can't ban yourself." }, { status: 400 });
  }
  if (user.role === "ADMIN" && action === "ban") {
    return NextResponse.json({ error: "Admins can't be banned from here." }, { status: 400 });
  }

  switch (action) {
    case "ban": {
      const updated = await prisma.$transaction(async (tx) => {
        // tokenVersion bump invalidates every live JWT for this account within
        // ~60s (see the jwt callback in src/lib/auth.ts) instead of at expiry.
        const u = await tx.user.update({
          where: { id: user.id },
          data: { isBanned: true, bannedReason: reason ?? "Banned by admin.", tokenVersion: { increment: 1 } },
        });
        await auditLog(tx, session.user.id, "user.ban", "User", user.id, { reason });
        return u;
      });
      return NextResponse.json({ user: sanitize(updated) });
    }

    case "unban": {
      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: user.id },
          data: { isBanned: false, bannedReason: null },
        });
        await auditLog(tx, session.user.id, "user.unban", "User", user.id);
        return u;
      });
      return NextResponse.json({ user: sanitize(updated) });
    }

    case "adjust_balance": {
      if (typeof amount !== "number" || amount === 0) {
        return NextResponse.json({ error: "Provide a non-zero amount." }, { status: 400 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
        const newBalance = Number(fresh.walletBalance) + amount;
        if (newBalance < 0) throw new Error("NEGATIVE_BALANCE");

        // Atomic guarded adjustment — for a debit (amount < 0), the balance
        // floor is re-checked and applied in one conditional UPDATE so this
        // can't race a concurrent debit (e.g. the user's own withdrawal) into
        // a negative balance; a credit (amount > 0) can never go negative so
        // no guard is needed for that direction.
        const adjusted = await tx.user.updateMany({
          where: amount < 0 ? { id: user.id, walletBalance: { gte: -amount } } : { id: user.id },
          data: { walletBalance: { increment: amount } },
        });
        if (adjusted.count === 0) throw new Error("NEGATIVE_BALANCE");
        const u = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: amount > 0 ? "WALLET_CREDIT" : "WALLET_DEBIT",
            status: "COMPLETED",
            amount: Math.abs(amount),
            balanceBefore: fresh.walletBalance,
            balanceAfter: newBalance,
            metadata: { adminAdjustment: true, reason },
          },
        });
        await auditLog(tx, session.user.id, "user.adjust_balance", "User", user.id, { amount, reason });
        return u;
      }).catch((err) => {
        if (err instanceof Error && err.message === "NEGATIVE_BALANCE") return null;
        throw err;
      });

      if (!updated) {
        return NextResponse.json({ error: "Adjustment would make the balance negative." }, { status: 400 });
      }
      await createNotification({
        userId: user.id,
        type: "PAYMENT",
        title: "Balance adjusted",
        body: `An admin ${amount > 0 ? "credited" : "debited"} your wallet by $${Math.abs(amount).toFixed(2)}.${reason ? ` Reason: ${reason}` : ""}`,
        link: "/dashboard/wallet",
      });
      return NextResponse.json({ user: sanitize(updated) });
    }

    case "trust_score_override": {
      if (typeof trustScore !== "number") {
        return NextResponse.json({ error: "Provide a trust score (0-100)." }, { status: 400 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({ where: { id: user.id }, data: { trustScore } });
        await auditLog(tx, session.user.id, "user.trust_score_override", "User", user.id, {
          trustScore,
          reason,
        });
        return u;
      });
      return NextResponse.json({ user: sanitize(updated) });
    }

    case "set_badge": {
      if (!badge) return NextResponse.json({ error: "Provide a badge." }, { status: 400 });
      if (badge === "OFFICIAL") {
        const existing = await prisma.user.findFirst({
          where: { verifiedBadge: "OFFICIAL", NOT: { id: user.id } },
        });
        if (existing) {
          return NextResponse.json(
            { error: "OFFICIAL badge is already assigned to another account." },
            { status: 409 }
          );
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({ where: { id: user.id }, data: { verifiedBadge: badge } });
        await auditLog(tx, session.user.id, "user.set_badge", "User", user.id, { badge });
        return u;
      });
      if (badge !== "NONE") {
        await createNotification({
          userId: user.id,
          type: "SYSTEM",
          title: "You've been verified",
          body: `Your account was assigned the ${badge} verified badge.`,
          link: "/dashboard/settings",
        });
      }
      return NextResponse.json({ user: sanitize(updated) });
    }

    case "award_achievement_badge": {
      if (!achievementBadge || !ADMIN_ACHIEVEMENT_BADGES.includes(achievementBadge)) {
        return NextResponse.json({ error: "Provide a valid manually-awardable badge." }, { status: 400 });
      }
      await prisma.$transaction(async (tx) => {
        await tx.userAchievementBadge.upsert({
          where: { userId_badge: { userId: user.id, badge: achievementBadge } },
          create: { userId: user.id, badge: achievementBadge },
          update: {},
        });
        await auditLog(tx, session.user.id, "user.award_achievement_badge", "User", user.id, { achievementBadge });
      });
      await createNotification({
        userId: user.id,
        type: "SYSTEM",
        title: "New achievement badge!",
        body: `You've been awarded the ${achievementBadge.replace(/_/g, " ")} badge.`,
        link: "/dashboard/settings",
      });
      return NextResponse.json({ ok: true });
    }

    case "revoke_achievement_badge": {
      if (!achievementBadge) return NextResponse.json({ error: "Provide a badge." }, { status: 400 });
      await prisma.$transaction(async (tx) => {
        await tx.userAchievementBadge.deleteMany({ where: { userId: user.id, badge: achievementBadge } });
        await auditLog(tx, session.user.id, "user.revoke_achievement_badge", "User", user.id, { achievementBadge });
      });
      return NextResponse.json({ ok: true });
    }

    case "extend_subscription": {
      const now = new Date();
      const current = user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
        ? user.subscriptionExpiresAt
        : now;
      const newExpiry = new Date(current.getTime() + 30 * 24 * 60 * 60 * 1000);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { subscriptionExpiresAt: newExpiry } });
        await auditLog(tx, session.user.id, "user.extend_subscription", "User", user.id, { newExpiry });
      });
      await createNotification({
        userId: user.id,
        type: "SYSTEM",
        title: "Subscription extended",
        body: "Your subscription has been extended by 30 days.",
        link: "/dashboard/settings/subscription",
      });
      if (user.email) {
        const activePlan = user.subscriptionPlanId
          ? await prisma.subscriptionPlan.findUnique({ where: { id: user.subscriptionPlanId } })
          : null;
        const planName = activePlan?.name ?? "Pro";
        const planPrice = activePlan?.priceMonthly ? `$${Number(activePlan.priceMonthly).toFixed(2)}` : "";
        const tpl = subscriptionActivatedTemplate(user.name ?? "there", planName, newExpiry.toLocaleDateString(), planPrice, "Monthly");
        sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html }).catch(() => null);
      }
      return NextResponse.json({ ok: true });
    }

    case "cancel_subscription": {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { subscriptionPlanId: null, subscriptionExpiresAt: null },
        });
        await auditLog(tx, session.user.id, "user.cancel_subscription", "User", user.id, { reason });
      });
      await createNotification({
        userId: user.id,
        type: "SYSTEM",
        title: "Subscription cancelled",
        body: reason ? `Your subscription was cancelled. Reason: ${reason}` : "Your subscription was cancelled by an admin.",
        link: "/dashboard/settings/subscription",
      });
      return NextResponse.json({ ok: true });
    }

    case "update_profile": {
      const updates: Record<string, unknown> = {};
      if (username !== undefined) {
        const taken = await prisma.user.findFirst({ where: { username, NOT: { id: user.id } } });
        if (taken) return NextResponse.json({ error: "Username already taken." }, { status: 409 });
        updates.username = username;
      }
      if (email !== undefined) {
        const taken = await prisma.user.findFirst({ where: { email, NOT: { id: user.id } } });
        if (taken) return NextResponse.json({ error: "Email already in use." }, { status: 409 });
        updates.email = email;
      }
      if (name !== undefined) updates.name = name;
      if (bio !== undefined) updates.bio = bio;
      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No fields to update." }, { status: 400 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({ where: { id: user.id }, data: updates });
        await auditLog(tx, session.user.id, "user.update_profile", "User", user.id, updates);
        return u;
      });
      return NextResponse.json({ user: sanitize(updated) });
    }

    case "change_plan": {
      if (!planId) return NextResponse.json({ error: "Provide a planId." }, { status: 400 });
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return NextResponse.json({ error: "Plan not found." }, { status: 404 });
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { subscriptionPlanId: planId, subscriptionExpiresAt: expiry },
        });
        await auditLog(tx, session.user.id, "user.change_plan", "User", user.id, { planId });
      });
      await createNotification({
        userId: user.id,
        type: "SYSTEM",
        title: "Subscription updated",
        body: `Your subscription has been changed to ${plan.name}.`,
        link: "/dashboard/settings/subscription",
      });
      if (user.email) {
        const tpl = subscriptionActivatedTemplate(user.name ?? "there", plan.name, expiry.toLocaleDateString(), `$${Number(plan.priceMonthly).toFixed(2)}`, "Monthly");
        sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html }).catch(() => null);
      }
      return NextResponse.json({ ok: true });
    }
  }
}

function sanitize<T extends { password?: string | null }>(user: T) {
  const { password: _pw, ...safe } = user;
  return safe;
}
