"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

// ── SVG icons ──────────────────────────────────────────────────────────────────
const I = {
  overview:    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  listings:    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  offers:      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  escrows:     <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  wallet:      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>,
  messages:    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  notifs:      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  activity:    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  saved:       <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
  search:      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  wanted:      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  referrals:   <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  org:         <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  developer:   <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  settings:    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  chevron:     <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>,
};

export interface DashboardSidebarCounts {
  unreadMessages: number;
  unreadNotifications: number;
  pendingOffers: number;
  activeEscrows: number;
}

type CountKey = keyof DashboardSidebarCounts;

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  countKey?: CountKey;
  sellerOnly?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: "main",
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Overview", icon: I.overview },
    ],
  },
  {
    id: "trading",
    label: "Trading",
    items: [
      { href: "/dashboard/listings", label: "My Listings", icon: I.listings, sellerOnly: true },
      { href: "/dashboard/offers", label: "Offers", icon: I.offers, countKey: "pendingOffers" },
      { href: "/dashboard/escrows", label: "Escrows", icon: I.escrows, countKey: "activeEscrows" },
      { href: "/dashboard/wallet", label: "Wallet", icon: I.wallet },
    ],
  },
  {
    id: "social",
    label: "Inbox",
    items: [
      { href: "/dashboard/messages", label: "Messages", icon: I.messages, countKey: "unreadMessages" },
      { href: "/dashboard/notifications", label: "Notifications", icon: I.notifs, countKey: "unreadNotifications" },
      { href: "/dashboard/activity", label: "Activity", icon: I.activity },
    ],
  },
  {
    id: "discover",
    label: "Discover",
    items: [
      { href: "/dashboard/watchlist", label: "Saved Listings", icon: I.saved },
      { href: "/dashboard/saved-searches", label: "Saved Searches", icon: I.search },
      { href: "/dashboard/wanted", label: "Wanted Posts", icon: I.wanted },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { href: "/dashboard/referrals", label: "Referrals", icon: I.referrals },
      { href: "/dashboard/organization", label: "Organization", icon: I.org },
      { href: "/dashboard/developer", label: "Developer", icon: I.developer },
      { href: "/dashboard/settings", label: "Settings", icon: I.settings },
    ],
  },
];

const EMPTY_COUNTS: DashboardSidebarCounts = {
  unreadMessages: 0,
  unreadNotifications: 0,
  pendingOffers: 0,
  activeEscrows: 0,
};

function Badge({ n, active }: { n: number; active: boolean }) {
  if (n <= 0) return null;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums",
        active ? "bg-white/25 text-white" : "bg-brand-500 text-white",
      )}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

function NavList({
  pathname,
  counts,
  onNav,
  isBuyerOnly,
}: {
  pathname: string;
  counts: DashboardSidebarCounts;
  onNav?: () => void;
  isBuyerOnly: boolean;
}) {
  return (
    <nav className="flex flex-col gap-0.5 px-3 py-4 overflow-y-auto flex-1">
      {NAV_SECTIONS.map((section) => (
        <div key={section.id} className="mb-1.5">
          <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-muted/60 select-none">
            {section.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.filter(item => !(isBuyerOnly && item.sellerOnly)).map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) ||
                (item.href !== "/dashboard" && pathname === item.href);
              const count = item.countKey ? (counts[item.countKey] ?? 0) : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNav}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-foreground/70 hover:bg-brand-500/8 hover:text-foreground dark:hover:bg-brand-950/40",
                  )}
                >
                  <span className={cn("shrink-0 transition-colors", active ? "text-white" : "text-muted group-hover:text-brand-500")}>
                    {item.icon}
                  </span>
                  <span className="flex-1 leading-none">{item.label}</span>
                  <Badge n={count} active={active} />
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Community links */}
      <div className="mb-1.5 mt-auto pt-3 border-t border-surface-border">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted/60 select-none">Community</p>
        <div className="flex items-center justify-around px-3 py-1">
          <a
            href="https://t.me/+JHWDsdkaX0czMTlk"
            target="_blank"
            rel="noopener noreferrer"
            title="Join Telegram"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-brand-500/8 hover:text-brand-500 dark:hover:bg-brand-950/40 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </a>
          <a
            href="https://chat.whatsapp.com/FF635yUd2h96aeY7uDX5Lp"
            target="_blank"
            rel="noopener noreferrer"
            title="Join WhatsApp"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-brand-500/8 hover:text-brand-500 dark:hover:bg-brand-950/40 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </a>
          <a
            href="https://www.facebook.com/accsmarkets/"
            target="_blank"
            rel="noopener noreferrer"
            title="Facebook Page"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-brand-500/8 hover:text-brand-500 dark:hover:bg-brand-950/40 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
          </a>
          <a
            href="https://twitter.com/accsmarkets"
            target="_blank"
            rel="noopener noreferrer"
            title="Twitter / X"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-brand-500/8 hover:text-brand-500 dark:hover:bg-brand-950/40 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
        </div>
      </div>
    </nav>
  );
}

const LOGO = <Logo size="md" />;

interface SidebarProps {
  counts?: DashboardSidebarCounts;
  primaryIntent?: string | null;
}

export function DashboardSidebar({ counts = EMPTY_COUNTS, primaryIntent }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const viewParam = searchParams.get("view");
  // Buyer mode: pure BUYER account, or BOTH user who switched to Buyer view
  const isBuyerOnly =
    primaryIntent === "BUYER" ||
    (primaryIntent === "BOTH" && viewParam === "BUYER");

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-surface-border bg-surface md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-surface-border px-5">
          {LOGO}
        </div>
        {/* Account type badge */}
        {primaryIntent && (
          <div className="px-4 pt-3 pb-1">
            <span className={[
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              primaryIntent === "BUYER"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:bg-blue-950 dark:text-blue-300"
                : primaryIntent === "SELLER"
                ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 dark:bg-green-950 dark:text-green-300"
                : "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 dark:bg-purple-950 dark:text-purple-300",
            ].join(" ")}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {primaryIntent === "BUYER" ? "Buyer Account" : primaryIntent === "SELLER" ? "Seller Account" : "Buyer & Seller"}
            </span>
          </div>
        )}
        <NavList pathname={pathname} counts={counts} isBuyerOnly={isBuyerOnly} />
      </aside>

    </>
  );
}
