"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomTabBarProps {
  isAuthenticated?: boolean;
  unreadMessages?: number;
}

const AUTH_TABS = [
  {
    href: "/dashboard",
    label: "Home",
    exact: true,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: "/listings",
    label: "Browse",
    exact: false,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/messages",
    label: "Messages",
    exact: false,
    badgeKey: "messages" as const,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/wallet",
    label: "Wallet",
    exact: false,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Profile",
    exact: false,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

const GUEST_TABS = [
  {
    href: "/",
    label: "Home",
    exact: true,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: "/listings",
    label: "Browse",
    exact: false,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/pricing",
    label: "Pricing",
    exact: false,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
  },
  {
    href: "/login",
    label: "Sign In",
    exact: false,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export function BottomTabBar({ isAuthenticated = false, unreadMessages = 0 }: BottomTabBarProps) {
  const pathname = usePathname();
  const tabs = isAuthenticated ? AUTH_TABS : GUEST_TABS;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-surface-border bg-background/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        className="grid h-14"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
      >
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const badge = tab.badgeKey === "messages" ? unreadMessages : 0;

          return (
            <Link
              key={tab.href + tab.label}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-[3px]"
              aria-current={active ? "page" : undefined}
            >
              <span className={`relative ${active ? "text-brand-500" : "text-muted/70"}`}>
                {tab.icon}
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex min-w-[14px] h-3.5 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-medium leading-none ${active ? "text-brand-500" : "text-muted/70"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
