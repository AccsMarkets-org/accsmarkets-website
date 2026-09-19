import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { BottomTabBar } from "@/components/ui/BottomTabBar";
import { AnnouncementBanner } from "@/components/ui/AnnouncementBanner";
import { CookieConsentBanner } from "@/components/ui/CookieConsentBanner";
import { CommunityPopup } from "@/components/ui/CommunityPopup";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";

const getMaintenanceSettings = unstable_cache(
  async () =>
    prisma.platformSettings.findUnique({
      where: { id: "singleton" },
      select: { maintenanceMode: true, maintenanceAllowAdmins: true },
    }),
  ["maintenance-settings"],
  { revalidate: 30 }
);

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Check maintenance mode
  const settings = await getMaintenanceSettings();

  if (settings?.maintenanceMode) {
    // Check if user is admin and allowed to bypass
    if (settings.maintenanceAllowAdmins) {
      const session = await getServerSession(authOptions);
      if (session?.user?.role !== "ADMIN") {
        redirect("/maintenance");
      }
    } else {
      redirect("/maintenance");
    }
  }

  const session = await getServerSession(authOptions);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <AnnouncementBanner />
      <div className="flex-1 pb-14 md:pb-0">{children}</div>
      <div className="hidden md:block"><Footer /></div>
      <CookieConsentBanner />
      <CommunityPopup />
      <BottomTabBar isAuthenticated={!!session} />
    </div>
  );
}
