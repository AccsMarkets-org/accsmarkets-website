import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default async function MaintenancePage() {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
    select: {
      maintenanceMode: true,
      maintenanceTitle: true,
      maintenanceMessage: true,
      maintenanceEndTime: true,
    },
  });

  // Only redirect back to main site when BOTH the DB flag AND the env var are off.
  // If the env var is still "true" the middleware will just send users back here → loop.
  if (!settings?.maintenanceMode && process.env.MAINTENANCE_MODE !== "true") {
    redirect("https://accsmarkets.org");
  }

  const title = settings.maintenanceTitle || "Maintenance in Progress";
  const message = settings.maintenanceMessage || "We're currently performing scheduled maintenance. We'll be back online shortly. Thank you for your patience.";
  const endTime = settings.maintenanceEndTime;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface to-background p-6">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
          <svg className="h-10 w-10 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-3">
          {title}
        </h1>

        {/* Message */}
        <p className="text-muted mb-6 leading-relaxed">
          {message}
        </p>

        {/* End Time */}
        {endTime && new Date(endTime) > new Date() && (
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-surface border border-surface-border px-5 py-2.5">
            <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="text-sm text-muted">Expected back:</span>
            <span className="text-sm font-semibold text-foreground">
              {new Date(endTime).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}

        {/* Progress Animation */}
        <div className="mb-8">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
            <div className="h-full w-1/3 rounded-full bg-warning animate-[shimmer_2s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* Status Updates */}
        <div className="rounded-2xl border border-surface-border bg-surface/50 p-5 text-left mb-8">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
            </span>
            Status
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted">
              <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M5 13l4 4L19 7" />
              </svg>
              Database backup complete
            </div>
            <div className="flex items-center gap-2 text-muted">
              <svg className="h-4 w-4 animate-spin text-warning" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              System updates in progress
            </div>
            <div className="flex items-center gap-2 text-muted opacity-50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
              </svg>
              Final verification pending
            </div>
          </div>
        </div>

        {/* Contact */}
        <p className="text-xs text-muted mb-4">
          Need urgent assistance? Contact us at{" "}
          <a href="mailto:support@accsmarkets.org" className="text-brand-600 hover:underline">
            support@accsmarkets.org
          </a>
        </p>

        {/* Social / Status Links */}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="https://twitter.com/accsmarkets"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            @accsmarkets
          </Link>
          <span className="text-surface-border">•</span>
          <Link
            href="/status"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            Status page
          </Link>
        </div>
      </div>
    </div>
  );
}
