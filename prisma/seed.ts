import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PLANS = [
  { name: "FREE",       priceMonthly: 0,  listingLimit: 5,   escrowFeeRate: 0.05, minFee: 4 },
  { name: "STARTER",    priceMonthly: 6,  listingLimit: 20,  escrowFeeRate: 0.04, minFee: 3 },
  { name: "PRO",        priceMonthly: 15, listingLimit: 75,  escrowFeeRate: 0.03, minFee: 2 },
  { name: "ENTERPRISE", priceMonthly: 30, listingLimit: 999, escrowFeeRate: 0.02, minFee: 1 },
] as const;

const TRANSFER_POLICIES = [
  { platform: "YOUTUBE",    transferDays: 3, allowTrustless: true,  trustlessBootstrapDays: 7, policyNote: "YouTube channels transfer via manager email invite. Buyer must have a Google account.",                                   sourceNote: "YouTube Creator Studio" },
  { platform: "INSTAGRAM",  transferDays: 3, allowTrustless: false, trustlessBootstrapDays: 7, policyNote: "Instagram accounts transfer via email/phone change. Requires 2FA disable first.",                                      sourceNote: "Instagram Help Center" },
  { platform: "TIKTOK",     transferDays: 2, allowTrustless: false, trustlessBootstrapDays: 5, policyNote: "TikTok accounts transfer via email change. Phone number must be removed first.",                                        sourceNote: "TikTok Support" },
  { platform: "TWITTER_X",  transferDays: 2, allowTrustless: false, trustlessBootstrapDays: 5, policyNote: "X accounts transfer via email/phone change. Premium subscription does NOT transfer.",                                  sourceNote: "X Help Center" },
  { platform: "TELEGRAM",   transferDays: 1, allowTrustless: false, trustlessBootstrapDays: 3, policyNote: "Telegram channels transfer via admin rights. Groups transfer via owner change.",                                       sourceNote: "Telegram FAQ" },
  { platform: "FACEBOOK",   transferDays: 3, allowTrustless: false, trustlessBootstrapDays: 7, policyNote: "Facebook pages transfer via admin role assignment. Personal profiles cannot be transferred.",                          sourceNote: "Facebook Business Help" },
] as const;

async function main() {
  console.log("=== AccsMarkets Seed ===\n");

  // ── Subscription plans ────────────────────────────────────────────────────
  console.log("1. Subscription plans...");
  for (const plan of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where:  { name: plan.name },
      update: { priceMonthly: plan.priceMonthly, listingLimit: plan.listingLimit, escrowFeeRate: plan.escrowFeeRate, minFee: plan.minFee },
      create: plan,
    });
  }
  const freePlan       = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { name: "FREE" } });
  const enterprisePlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { name: "ENTERPRISE" } });

  // ── Platform settings ─────────────────────────────────────────────────────
  console.log("2. Platform settings...");
  await prisma.platformSettings.upsert({
    where:  { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // ── Admin accounts ────────────────────────────────────────────────────────
  console.log("3. Admin accounts...");
  const adminHash = await bcrypt.hash("Admin1234!", 12);

  const admin = await prisma.user.upsert({
    where:  { email: "admin@accsmarkets.org" },
    update: { role: "ADMIN" },
    create: {
      email:              "admin@accsmarkets.org",
      password:           adminHash,
      name:               "Platform Admin",
      username:           "admin",
      role:               "ADMIN",
      emailVerified:      new Date(),
      kycLevel:           "ID_VERIFIED",
      verifiedBadge:      "GOLD",
      trustScore:         100,
      walletBalance:      5000,
      subscriptionPlanId: enterprisePlan.id,
      countryCode:        "US",
    },
  });

  const support = await prisma.user.upsert({
    where:  { email: "support@accsmarkets.org" },
    update: { verifiedBadge: "OFFICIAL", role: "ADMIN" },
    create: {
      email:              "support@accsmarkets.org",
      password:           adminHash,
      name:               "AccsMarkets Support",
      username:           "support",
      role:               "ADMIN",
      emailVerified:      new Date(),
      kycLevel:           "ID_VERIFIED",
      verifiedBadge:      "OFFICIAL",
      trustScore:         100,
      subscriptionPlanId: freePlan.id,
      countryCode:        "US",
    },
  });

  await prisma.platformSettings.update({
    where: { id: "singleton" },
    data:  { officialSupportUserId: support.id },
  });

  console.log(`   admin@accsmarkets.org (id: ${admin.id})`);
  console.log(`   support@accsmarkets.org (id: ${support.id})`);

  // ── Transfer policies ─────────────────────────────────────────────────────
  console.log("4. Transfer policies...");
  for (const p of TRANSFER_POLICIES) {
    await prisma.platformTransferPolicy.upsert({
      where:  { platform: p.platform },
      update: p,
      create: p,
    });
  }

  // ── Deposit method fees ───────────────────────────────────────────────────
  console.log("5. Deposit method fees...");
  const fees = [
    { method: "crypto",        feeRate: 0,    minFee: 0, maxFee: null },
    { method: "bank_transfer", feeRate: 0.01, minFee: 2, maxFee: 50   },
    { method: "card",          feeRate: 0.025,minFee: 1, maxFee: null },
  ];
  for (const f of fees) {
    await prisma.depositMethodFee.upsert({
      where:  { method: f.method },
      update: { feeRate: f.feeRate, minFee: f.minFee, maxFee: f.maxFee, isActive: true },
      create: { ...f, isActive: true },
    });
  }

  console.log("\n=== Seed Complete ===");
  console.log("  admin@accsmarkets.org   / Admin1234!");
  console.log("  support@accsmarkets.org / Admin1234!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
