"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BadgeCheck, Bell, ChevronRight, Lock, MonitorSmartphone, ShieldCheck, Star, User } from "lucide-react";

const NAV = [
  {
    href: "/dashboard/settings",
    label: "Profile",
    exact: true,
    icon: <User className="h-4 w-4" aria-hidden />,
  },
  {
    href: "/dashboard/settings/security",
    label: "Security",
    icon: <Lock className="h-4 w-4" aria-hidden />,
  },
  {
    href: "/dashboard/settings/sessions",
    label: "Sessions",
    icon: <MonitorSmartphone className="h-4 w-4" aria-hidden />,
  },
  {
    href: "/dashboard/settings/verification",
    label: "Verification",
    icon: <BadgeCheck className="h-4 w-4" aria-hidden />,
  },
  {
    href: "/dashboard/settings/notifications",
    label: "Notifications",
    icon: <Bell className="h-4 w-4" aria-hidden />,
  },
  {
    href: "/dashboard/settings/privacy",
    label: "Privacy",
    icon: <ShieldCheck className="h-4 w-4" aria-hidden />,
  },
  {
    href: "/dashboard/settings/subscription",
    label: "Subscription",
    icon: <Star className="h-4 w-4" aria-hidden />,
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
                <span className="ml-auto"><ChevronRight className="h-3.5 w-3.5 text-white/70" aria-hidden /></span>
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
