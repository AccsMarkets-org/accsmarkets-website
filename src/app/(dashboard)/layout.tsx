import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { getUserDashboardCounts } from "@/lib/dashboard-cache";
import { DashboardSidebar } from "@/components/ui/DashboardSidebar";
import { BottomTabBar } from "@/components/ui/BottomTabBar";
import { PresencePing } from "@/components/ui/PresencePing";
import { NavbarUserMenu } from "@/components/ui/NavbarUserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AnnouncementBanner } from "@/components/ui/AnnouncementBanner";
import { ProfileCompletionBanner } from "@/components/ui/ProfileCompletionBanner";
import { TermsGate } from "@/components/ui/TermsGate";
import { DashboardHeaderActions } from "@/components/ui/DashboardHeaderActions";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";
import { getMissingProfileFields } from "@/lib/profile-complete";
import { IntelligenceWidget } from "@/components/intelligence/IntelligenceWidget";

const getMaintenanceSettings = unstable_cache(
  async () =>
    prisma.platformSettings.findUnique({
      where: { id: "singleton" },
      select: { maintenanceMode: true, maintenanceAllowAdmins: true },
    }),
  ["maintenance-settings"],
  { revalidate: 30 }
);

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  // Check maintenance mode
  const settings = await getMaintenanceSettings();

  if (settings?.maintenanceMode) {
    if (!settings.maintenanceAllowAdmins || session.user.role !== "ADMIN") {
      redirect("/maintenance");
    }
  }

  const userId = session.user.id;

  const [accepted, walletUser, dashCounts] = await Promise.all([
    prisma.termsAcceptance.findUnique({
      where: { userId_version: { userId, version: CURRENT_TERMS_VERSION } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletBalance: true,
        onboardingCompletedAt: true,
        primaryIntent: true,
        name: true,
        username: true,
        email: true,
        emailVerified: true,
      },
    }),
    getUserDashboardCounts(userId),
  ]);

  const missingProfileFields = walletUser
    ? getMissingProfileFields({
        name: walletUser.name ?? null,
        username: walletUser.username ?? null,
        email: walletUser.email ?? "",
        emailVerified: walletUser.emailVerified ?? null,
      })
    : [];

  const { unreadMessages, unreadNotifications, pendingOffers, activeEscrows } = dashCounts;
  const walletBalance = Number(walletUser?.walletBalance ?? 0);
  const primaryIntent = walletUser?.primaryIntent ?? null;

  return (
    <div className="flex h-screen">
      <DashboardSidebar
        counts={{
          unreadMessages: Number(unreadMessages),
          unreadNotifications: Number(unreadNotifications),
          pendingOffers: Number(pendingOffers),
          activeEscrows: Number(activeEscrows),
        }}
        primaryIntent={primaryIntent}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-surface-border bg-background px-4 md:pl-14 md:pr-6" style={{ height: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)", paddingRight: "max(1rem, env(safe-area-inset-right))" }}>
          {/* min-w-0 + scroll: on narrow phones the action buttons must squeeze
              or scroll — never push the avatar menu (the sign-out path) off-screen. */}
          <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
            <DashboardHeaderActions balance={walletBalance} />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <NotificationBell />
            <NavbarUserMenu
              name={session.user.name ?? session.user.email ?? "Account"}
              image={session.user.image ?? null}
              role={session.user.role ?? null}
            />
          </div>
        </header>
        <AnnouncementBanner />
        {missingProfileFields.length > 0 && (
          <ProfileCompletionBanner missingFields={missingProfileFields} />
        )}
        {/* overflow-y-auto here (not just min-h-screen on the page as a whole)
            makes this the one true scroll region for dashboard content, with
            the sidebar/header staying fixed — required for the Messages page's
            own nested h-full/overflow-hidden layout to get a real bounded
            height to resolve against. Before this fix, the outer shell used
            min-h-screen (unbounded), so the whole window scrolled instead of
            the message pane, and sending a message visibly jumped/scrolled
            the entire page instead of smoothly auto-scrolling just the thread. */}
        <main className="flex-1 overflow-y-auto bg-background p-4 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:p-6 md:pb-6">{children}</main>
      </div>
      <BottomTabBar isAuthenticated unreadMessages={Number(unreadMessages)} />
      {!accepted && <TermsGate userId={userId} />}
      <PresencePing />
      <IntelligenceWidget />
    </div>
  );
}
