import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSettingsClient } from "@/components/admin/AdminSettingsClient";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/admin/login");

  const [user, rawSettings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        bio: true,
        createdAt: true,
        accounts: { select: { provider: true, providerAccountId: true } },
        activeSessions: {
          orderBy: { lastSeenAt: "desc" },
          take: 10,
          select: { id: true, userAgent: true, ip: true, lastSeenAt: true, createdAt: true },
        },
      },
    }),
    prisma.platformSettings.upsert({ where: { id: "singleton" }, create: {}, update: {} }),
  ]);

  if (!user) redirect("/admin/login");

  const profile = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    activeSessions: user.activeSessions.map((s) => ({
      ...s,
      lastSeenAt: s.lastSeenAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    })),
  };

  // Prisma Decimal and Date fields cannot be passed directly to Client Components
  const settings = {
    ...rawSettings,
    minDeposit: rawSettings.minDeposit.toNumber(),
    minWithdrawal: rawSettings.minWithdrawal.toNumber(),
    highValueEscrowThreshold: rawSettings.highValueEscrowThreshold.toNumber(),
    // bankTransferShortfallToleranceUsd is now Decimal (was Float) — needs the
    // same conversion. bankTransferShortfallTolerancePct is still a plain
    // Float and needs none.
    bankTransferShortfallToleranceUsd: rawSettings.bankTransferShortfallToleranceUsd.toNumber(),
    updatedAt: rawSettings.updatedAt.toISOString(),
    maintenanceEndTime: rawSettings.maintenanceEndTime?.toISOString() ?? null,
    walletAddressTrc20: rawSettings.walletAddressTrc20 ?? null,
    walletAddressBep20: rawSettings.walletAddressBep20 ?? null,
    walletAddressErc20: rawSettings.walletAddressErc20 ?? null,
    walletAddressMatic: rawSettings.walletAddressMatic ?? null,
    walletAddressSol:   rawSettings.walletAddressSol   ?? null,
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AdminPageHeader
        title="Settings"
        subtitle="Manage your profile, security, and platform configuration"
      />
      <AdminSettingsClient profile={profile} settings={settings} />
    </div>
  );
}
