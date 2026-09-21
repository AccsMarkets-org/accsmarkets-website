import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminSidebarCounts } from "@/lib/admin-cache";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminUserMenu } from "@/components/admin/AdminUserMenu";
import { AdminRealtimeUpdates } from "@/components/admin/AdminRealtimeUpdates";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/icon-180.png?v=2",
  },
  title: {
    default: "Admin — AccsMarkets",
    template: "%s — Admin",
  },
  robots: { index: false, follow: false },
  // Its own manifest (name, start_url, theme) so "Add to Home Screen" on any
  // /admin page installs a distinctly-branded app that opens straight into
  // the admin console — not the consumer manifest.json/start_url="/" a
  // nested layout would otherwise inherit from the root layout.
  manifest: "/admin-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AM Admin",
  },
};

// Matches admin-manifest.json's dark theme — without this, the root layout's
// viewport (orange, the consumer brand color) leaks through into the admin
// PWA's status-bar/chrome color.
export function generateViewport(): Viewport {
  return {
    themeColor: "#1a1410",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [counts, unreadOwnMessages] = await Promise.all([
    getAdminSidebarCounts(),
    // Per-viewer, not part of the shared 15s cache above (that cache has a
    // single global key, so a per-admin count doesn't belong in it — it
    // would just serve whichever admin's count happened to populate it
    // first to every other admin for the next 15 seconds).
    prisma.message.count({ where: { recipientId: session.user.id, isRead: false, escrowId: null } }),
  ]);

  return (
    // h-screen (not min-h-screen) so <main>'s flex-1 + overflow-auto below
    // actually creates a bounded, independently-scrolling region — with
    // min-h-screen the outer shell grew with content instead, so the whole
    // window scrolled and pages like Admin Messages (which need a real
    // internal scroll pane) sent messages by jumping/scrolling the entire
    // page rather than smoothly auto-scrolling just the thread.
    <div className="flex h-screen">
      <AdminSidebar counts={{ ...counts, unreadOwnMessages }} />
      <div className="flex flex-1 flex-col min-w-0">
        {/* pt/height account for the safe-area inset so this doesn't render
            under the status bar / notch in standalone PWA mode (regular
            Safari tabs have their own chrome eating that space, so this
            only becomes visible once installed). */}
        <header
          className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border bg-background pl-14 pr-4 md:px-6"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
        >
          <span className="rounded-full bg-brand-950 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-100">
            Admin
          </span>
          <div className="flex items-center gap-2">
            <ConnectionStatus />
            <AdminUserMenu
              name={session.user.name ?? session.user.email ?? "Admin"}
              image={session.user.image ?? null}
              email={session.user.email ?? undefined}
            />
          </div>
        </header>
        <main
          className="flex-1 overflow-auto bg-background p-4 md:p-6"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
          {/* Invisible socket listener — shows a toast when admin queue events
              arrive so the admin can refresh without a manual page reload. */}
          <AdminRealtimeUpdates />
        </main>
      </div>
    </div>
  );
}
