"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  {
    href: "/dashboard/settings",
    label: "Profile",
    exact: true,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/settings/security",
    label: "Security",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/settings/sessions",
    label: "Sessions",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/settings/verification",
    label: "Verification",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/settings/notifications",
    label: "Notifications",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/settings/privacy",
    label: "Privacy",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/settings/subscription",
    label: "Subscription",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden sm:flex w-56 shrink-0 flex-col gap-0.5 pt-1">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted/70">Settings</p>
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-muted hover:bg-brand-500/8 hover:text-foreground",
              )}
            >
              <span className={cn("shrink-0 transition", active ? "text-white" : "text-muted group-hover:text-brand-500")}>
                {item.icon}
              </span>
              {item.label}
              {active && (
                <span className="ml-auto">
                  <svg className="h-3 w-3 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </span>
              )}
            </Link>
          );
        })}
      </aside>

      {/* Mobile horizontal pills */}
      <div className="sm:hidden flex gap-1.5 overflow-x-auto pb-3 mb-2 border-b border-surface-border">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "border-brand-400 bg-brand-500 text-white"
                  : "border-surface-border text-muted hover:bg-brand-500/8 hover:text-foreground",
              )}
            >
              <span className={active ? "text-white" : "text-muted"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
