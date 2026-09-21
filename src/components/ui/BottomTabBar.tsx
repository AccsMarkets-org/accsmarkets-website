"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, LogIn, MessageSquare, Tag, User, Wallet } from "lucide-react";

const TAB_ICON = { className: "h-[22px] w-[22px]", strokeWidth: 1.75, "aria-hidden": true } as const;

interface BottomTabBarProps {
  isAuthenticated?: boolean;
  unreadMessages?: number;
}

interface Tab {
  href: string;
  label: string;
  exact: boolean;
  badgeKey?: "messages";
  icon: JSX.Element;
}

const AUTH_TABS: Tab[] = [
  {
    href: "/dashboard",
    label: "Home",
    exact: true,
    icon: <House {...TAB_ICON} />,
  },
  {
    href: "/listings",
    label: "Browse",
    exact: false,
    icon: <LayoutGrid {...TAB_ICON} />,
  },
  {
    href: "/dashboard/messages",
    label: "Messages",
    exact: false,
    badgeKey: "messages" as const,
    icon: <MessageSquare {...TAB_ICON} />,
  },
  {
    href: "/dashboard/wallet",
    label: "Wallet",
    exact: false,
    icon: <Wallet {...TAB_ICON} />,
  },
  {
    href: "/dashboard/settings",
    label: "Profile",
    exact: false,
    icon: <User {...TAB_ICON} />,
  },
];

const GUEST_TABS: Tab[] = [
  {
    href: "/",
    label: "Home",
    exact: true,
    icon: <House {...TAB_ICON} />,
  },
  {
    href: "/listings",
    label: "Browse",
    exact: false,
    icon: <LayoutGrid {...TAB_ICON} />,
  },
  {
    href: "/pricing",
    label: "Pricing",
    exact: false,
    icon: <Tag {...TAB_ICON} />,
  },
  {
    href: "/login",
    label: "Sign In",
    exact: false,
    icon: <LogIn {...TAB_ICON} />,
  },
];

export function BottomTabBar({ isAuthenticated = false, unreadMessages = 0 }: BottomTabBarProps) {
  const pathname = usePathname();
  const tabs = isAuthenticated ? AUTH_TABS : GUEST_TABS;

  return (
    <nav
      aria-label="Primary"
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
              className="flex flex-col items-center justify-center gap-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
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
