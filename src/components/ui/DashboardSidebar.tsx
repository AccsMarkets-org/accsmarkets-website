"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import {
  Activity, Bell, Bookmark, Building2, CirclePlus, ClipboardList, CodeXml, LayoutDashboard,
  LifeBuoy, Menu, MessageSquare, Scale, Search, Settings, ShieldCheck, Tag, Users, Wallet, X, Zap,
} from "lucide-react";

// ── Icons (lucide) ─────────────────────────────────────────────────────────────
const NAV_ICON = { className: "h-5 w-5", strokeWidth: 1.75, "aria-hidden": true } as const;
const I = {
  overview:    <LayoutDashboard {...NAV_ICON} />,
  listings:    <ClipboardList {...NAV_ICON} />,
  offers:      <Tag {...NAV_ICON} />,
  escrows:     <ShieldCheck {...NAV_ICON} />,
  wallet:      <Wallet {...NAV_ICON} />,
  messages:    <MessageSquare {...NAV_ICON} />,
  notifs:      <Bell {...NAV_ICON} />,
  activity:    <Activity {...NAV_ICON} />,
  saved:       <Bookmark {...NAV_ICON} />,
  search:      <Search {...NAV_ICON} />,
  wanted:      <CirclePlus {...NAV_ICON} />,
  referrals:   <Users {...NAV_ICON} />,
  org:         <Building2 {...NAV_ICON} />,
  developer:   <CodeXml {...NAV_ICON} />,
  settings:    <Settings {...NAV_ICON} />,
  promotions:  <Zap {...NAV_ICON} />,
  support:     <LifeBuoy {...NAV_ICON} />,
  disputes:    <Scale {...NAV_ICON} />,
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
      { href: "/dashboard/promotions", label: "Promotions", icon: I.promotions, sellerOnly: true },
      { href: "/dashboard/offers", label: "Offers", icon: I.offers, countKey: "pendingOffers" },
      { href: "/dashboard/escrows", label: "Escrows", icon: I.escrows, countKey: "activeEscrows" },
      { href: "/dashboard/disputes", label: "Disputes", icon: I.disputes },
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
      { href: "/dashboard/support", label: "Support", icon: I.support },
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
            aria-label="Join Telegram"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-brand-500/8 hover:text-brand-500 dark:hover:bg-brand-950/40 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </a>
          <a
            href="https://chat.whatsapp.com/FF635yUd2h96aeY7uDX5Lp"
            target="_blank"
            rel="noopener noreferrer"
            title="Join WhatsApp"
            aria-label="Join WhatsApp"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-brand-500/8 hover:text-brand-500 dark:hover:bg-brand-950/40 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </a>
          <a
            href="https://www.facebook.com/accsmarkets/"
            target="_blank"
            rel="noopener noreferrer"
            title="Facebook Page"
            aria-label="Facebook Page"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-brand-500/8 hover:text-brand-500 dark:hover:bg-brand-950/40 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
          </a>
          <a
            href="https://twitter.com/accsmarkets"
            target="_blank"
            rel="noopener noreferrer"
            title="Twitter / X"
            aria-label="Twitter / X"
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

function AccountTypeBadge({ primaryIntent }: { primaryIntent: string }) {
  return (
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
  );
}

export function DashboardSidebar({ counts = EMPTY_COUNTS, primaryIntent }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const viewParam = searchParams.get("view");
  // Buyer mode: pure BUYER account, or BOTH user who switched to Buyer view
  const isBuyerOnly =
    primaryIntent === "BUYER" ||
    (primaryIntent === "BOTH" && viewParam === "BUYER");

  // Close the mobile drawer on Escape and lock body scroll while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-surface-border bg-surface md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-surface-border px-5">
          {LOGO}
        </div>
        {/* Account type badge */}
        {primaryIntent && <AccountTypeBadge primaryIntent={primaryIntent} />}
        <NavList pathname={pathname} counts={counts} isBuyerOnly={isBuyerOnly} />
      </aside>

      {/* Mobile hamburger — sits inside the header row on the left; the header
          reserves left padding for it on < md. Offset by the safe-area inset so
          it doesn't render under the status bar in an installed PWA. */}
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed left-3 z-40 flex h-10 w-10 items-center justify-center rounded-xl text-foreground/80 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:hidden"
        style={{ top: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </button>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard navigation"
            className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-surface-border bg-surface shadow-xl md:hidden"
          >
            <div
              className="flex shrink-0 items-center justify-between border-b border-surface-border px-4"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(4rem + env(safe-area-inset-top, 0px))" }}
            >
              {LOGO}
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-brand-500/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            {primaryIntent && <AccountTypeBadge primaryIntent={primaryIntent} />}
            <div className="flex min-h-0 flex-1 flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <NavList pathname={pathname} counts={counts} isBuyerOnly={isBuyerOnly} onNav={() => setOpen(false)} />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
