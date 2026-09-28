"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/permissions";
import {
  ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, BadgeCheck, Banknote, ChartLine,
  ChevronDown, ClipboardList, DollarSign, FileText, Flag, Inbox, Landmark, LayoutDashboard,
  LayoutGrid, LifeBuoy, Mail, Mails, Megaphone, Menu, MessageSquare, MessageSquareText,
  MessageSquareWarning, Monitor, Rocket, Scale, ScrollText, Settings, ShieldAlert, ShieldCheck,
  SquarePen, Star, Ticket, ToggleRight, TriangleAlert, UserCog, UserPlus, Users, Wrench, X, Zap,
} from "lucide-react";

// ── Icons (lucide) ────────────────────────────────────────────────────────────
const NAV_ICON = { className: "h-5 w-5", strokeWidth: 1.75, "aria-hidden": true } as const;
const I = {
  overview:      <LayoutDashboard {...NAV_ICON} />,
  analytics:     <ChartLine {...NAV_ICON} />,
  listings:      <ClipboardList {...NAV_ICON} />,
  escrows:       <ShieldCheck {...NAV_ICON} />,
  disputes:      <TriangleAlert {...NAV_ICON} />,
  reports:       <Flag {...NAV_ICON} />,
  deposits:      <ArrowDownToLine {...NAV_ICON} />,
  banktransfer:  <Landmark {...NAV_ICON} />,
  bankaccounts:  <Banknote {...NAV_ICON} />,
  withdrawals:   <ArrowUpFromLine {...NAV_ICON} />,
  transactions:  <ArrowLeftRight {...NAV_ICON} />,
  users:         <Users {...NAV_ICON} />,
  verification:  <BadgeCheck {...NAV_ICON} />,
  subscriptions: <Star {...NAV_ICON} />,
  announcements: <Megaphone {...NAV_ICON} />,
  email:         <Mail {...NAV_ICON} />,
  canned:        <MessageSquareText {...NAV_ICON} />,
  blog:          <SquarePen {...NAV_ICON} />,
  settings:      <Settings {...NAV_ICON} />,
  featureflags:  <ToggleRight {...NAV_ICON} />,
  risk:          <ShieldAlert {...NAV_ICON} />,
  staff:         <UserCog {...NAV_ICON} />,
  legal:         <Scale {...NAV_ICON} />,
  system:        <Monitor {...NAV_ICON} />,
  policies:      <FileText {...NAV_ICON} />,
  promotions:    <Zap {...NAV_ICON} />,
  promoCodes:    <Ticket {...NAV_ICON} />,
  support:       <LifeBuoy {...NAV_ICON} />,
  auditlog:      <ScrollText {...NAV_ICON} />,
  contact:       <Inbox {...NAV_ICON} />,
  emailpool:     <Mails {...NAV_ICON} />,
  apps:          <LayoutGrid {...NAV_ICON} />,
  messages:      <MessageSquare {...NAV_ICON} />,
  marketing:     <Rocket {...NAV_ICON} />,
  pricing:       <DollarSign {...NAV_ICON} />,
  referrals:     <UserPlus {...NAV_ICON} />,
  escsupport:    <LifeBuoy {...NAV_ICON} />,
  maintenance:   <Wrench {...NAV_ICON} />,
  reviews:       <Star {...NAV_ICON} />,
  flagged:       <MessageSquareWarning {...NAV_ICON} />,
  chevron:       <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />,
};

type CountKey = "pendingListings" | "pendingDeposits" | "pendingWithdrawals" | "openDisputes" | "pendingKyc" | "pendingBankTransfers" | "unreadContactMessages" | "unreadOwnMessages" | "openSupportTickets";

export interface AdminSidebarCounts {
  pendingListings: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  openDisputes: number;
  pendingKyc: number;
  pendingBankTransfers: number;
  unreadContactMessages: number;
  unreadOwnMessages: number;
  openSupportTickets?: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  countKey?: CountKey;
  /** Staff permission required to see this link. Must match the
   *  requireAdmin(...) call in the target page — the page is the real gate,
   *  this only hides links the viewer couldn't open anyway. */
  permission?: Permission;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: "platform",
    label: "Platform",
    items: [
      { href: "/admin", label: "Overview", icon: I.overview, permission: "VIEW_ANALYTICS" },
      { href: "/admin/messages", label: "Messages", icon: I.messages, countKey: "unreadOwnMessages", permission: "MANAGE_USERS" },
      { href: "/admin/analytics", label: "Analytics", icon: I.analytics, permission: "VIEW_ANALYTICS" },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { href: "/admin/listings", label: "Listings", icon: I.listings, countKey: "pendingListings", permission: "MANAGE_LISTINGS" },
      { href: "/admin/promotions", label: "Promotions", icon: I.promotions, permission: "MANAGE_LISTINGS" },
      { href: "/admin/escrows", label: "Escrows", icon: I.escrows, permission: "MANAGE_ESCROWS" },
      { href: "/admin/escrow-support", label: "Escrow Support", icon: I.escsupport, permission: "MANAGE_ESCROW_MESSAGES" },
      { href: "/admin/disputes", label: "Disputes", icon: I.disputes, countKey: "openDisputes", permission: "MANAGE_DISPUTES" },
      { href: "/admin/reports", label: "Reports", icon: I.reports, permission: "MANAGE_REPORTS" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { href: "/admin/deposits", label: "Deposits", icon: I.deposits, countKey: "pendingDeposits", permission: "MANAGE_FINANCE" },
      { href: "/admin/bank-transfers", label: "Bank Transfers", icon: I.banktransfer, countKey: "pendingBankTransfers", permission: "MANAGE_FINANCE" },
      { href: "/admin/withdrawals", label: "Withdrawals", icon: I.withdrawals, countKey: "pendingWithdrawals", permission: "MANAGE_FINANCE" },
      { href: "/admin/transactions", label: "Transactions", icon: I.transactions, permission: "MANAGE_FINANCE" },
      { href: "/admin/bank-accounts", label: "Bank Accounts", icon: I.bankaccounts, permission: "MANAGE_FINANCE" },
      { href: "/admin/pricing", label: "Pricing", icon: I.pricing, permission: "MANAGE_PRICING" },
    ],
  },
  {
    id: "users",
    label: "Users",
    items: [
      { href: "/admin/users", label: "Users", icon: I.users, permission: "MANAGE_USERS" },
      { href: "/admin/verification", label: "Verification", icon: I.verification, countKey: "pendingKyc", permission: "MANAGE_KYC" },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: I.subscriptions, permission: "MANAGE_USERS" },
      { href: "/admin/referrals", label: "Referrals", icon: I.referrals, permission: "MANAGE_REFERRALS" },
      { href: "/admin/reviews", label: "Reviews", icon: I.reviews, permission: "MANAGE_USERS" },
      { href: "/admin/flagged-messages", label: "Flagged Messages", icon: I.flagged, permission: "MANAGE_USERS" },
    ],
  },
  {
    id: "ops",
    label: "Ops",
    items: [
      { href: "/admin/announcements", label: "Announcements", icon: I.announcements, permission: "MANAGE_MARKETING" },
      { href: "/admin/email-templates", label: "Email Templates", icon: I.email, permission: "MANAGE_MARKETING" },
      { href: "/admin/canned-responses", label: "Canned Responses", icon: I.canned, permission: "MANAGE_USERS" },
      { href: "/admin/blog", label: "Blog", icon: I.blog, permission: "MANAGE_BLOG" },
      { href: "/admin/marketing", label: "Marketing", icon: I.marketing, permission: "MANAGE_MARKETING" },
      { href: "/admin/promo-codes", label: "Promo codes", icon: I.promoCodes, permission: "MANAGE_MARKETING" },
      { href: "/admin/support", label: "Support Tickets", icon: I.support, countKey: "openSupportTickets", permission: "MANAGE_USERS" },
      { href: "/admin/contact-messages", label: "Contact Inbox", icon: I.contact, countKey: "unreadContactMessages", permission: "MANAGE_USERS" },
    ],
  },
  {
    id: "team",
    label: "Team",
    items: [
      { href: "/admin/staff", label: "Staff & Roles", icon: I.staff, permission: "MANAGE_STAFF" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: I.settings, permission: "MANAGE_SETTINGS" },
      { href: "/admin/maintenance", label: "Maintenance Mode", icon: I.maintenance, permission: "MANAGE_SETTINGS" },
      { href: "/admin/feature-flags", label: "Feature Flags", icon: I.featureflags, permission: "MANAGE_SETTINGS" },
      { href: "/admin/risk", label: "Risk", icon: I.risk, permission: "MANAGE_USERS" },
      { href: "/admin/legal", label: "Legal", icon: I.legal, permission: "MANAGE_USERS" },
      { href: "/admin/audit-log", label: "Audit Log", icon: I.auditlog, permission: "VIEW_AUDIT_LOG" },
      { href: "/admin/system", label: "System", icon: I.system, permission: "VIEW_ANALYTICS" },
    ],
  },
  {
    id: "developer",
    label: "Developer",
    items: [
      { href: "/admin/transfer-policies", label: "Transfer Policies", icon: I.policies, permission: "MANAGE_LISTINGS" },
      { href: "/admin/escrow-emails", label: "Escrow Email Pool", icon: I.emailpool, permission: "MANAGE_ESCROWS" },
      { href: "/admin/apps", label: "App Directory", icon: I.apps, permission: "MANAGE_USERS" },
    ],
  },
];

/** Effective permission set for the viewer: "ALL" for owner-level admins
 *  (no staff role), otherwise the staff role's permission list. */
export type AllowedPermissions = Permission[] | "ALL";

function filterNavSections(allowed: AllowedPermissions): NavSection[] {
  if (allowed === "ALL") return NAV_SECTIONS;
  const set = new Set<string>(allowed);
  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || set.has(item.permission)),
    }))
    .filter((section) => section.items.length > 0);
}

const COLLAPSED_DEFAULT = new Set<string>();

function AdminNavList({
  pathname,
  counts,
  allowed,
  onNav,
}: {
  pathname: string;
  counts: AdminSidebarCounts;
  allowed: AllowedPermissions;
  onNav?: () => void;
}) {
  const sections = filterNavSections(allowed);
  const [collapsed, setCollapsed] = useState<Set<string>>(COLLAPSED_DEFAULT);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_nav_collapsed");
      if (saved) setCollapsed(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  function toggleSection(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem("admin_nav_collapsed", JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  return (
    <nav className="flex flex-col gap-0.5 px-2 py-3 overflow-y-auto">
      {sections.map((section) => {
        const isCollapsed = collapsed.has(section.id);
        const sectionHasUrgent = section.items.some((item) => item.countKey && (counts[item.countKey] ?? 0) > 0);

        return (
          <div key={section.id} className="mb-1">
            <button
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-500/60 hover:text-brand-400 transition"
            >
              <span className="flex items-center gap-1.5">
                {section.label}
                {!isCollapsed ? null : sectionHasUrgent ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                ) : null}
              </span>
              <span className={cn("transition-transform", isCollapsed ? "" : "rotate-180")}>
                {I.chevron}
              </span>
            </button>

            {!isCollapsed && (
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
                  const count = item.countKey ? (counts[item.countKey] ?? 0) : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNav}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                        active
                          ? "bg-brand-500 text-white"
                          : "text-brand-200/70 hover:bg-white/5 hover:text-brand-100",
                      )}
                    >
                      <span className={cn("shrink-0", active ? "text-white" : "text-brand-400")}>
                        {item.icon}
                      </span>
                      <span className="flex-1 leading-none">{item.label}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                            active ? "bg-white/20 text-white" : "bg-danger text-white",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

const ADMIN_LOGO = (
  <Link href="/admin" className="flex items-center gap-2.5 text-base font-bold text-white">
    <Image src="/logo.png" alt="AccsMarkets" width={32} height={32} className="h-8 w-8 object-contain" />
    <span className="tracking-tight">AccsMarkets</span>
  </Link>
);

interface SidebarProps {
  counts?: AdminSidebarCounts;
  /** Computed server-side in the admin layout from the viewer's staff role. */
  allowed?: AllowedPermissions;
}

const EMPTY_COUNTS: AdminSidebarCounts = {
  pendingListings: 0,
  pendingDeposits: 0,
  pendingWithdrawals: 0,
  openDisputes: 0,
  pendingKyc: 0,
  pendingBankTransfers: 0,
  unreadContactMessages: 0,
  unreadOwnMessages: 0,
  openSupportTickets: 0,
};

export function AdminSidebar({ counts = EMPTY_COUNTS, allowed = "ALL" }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-black md:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4">
          {ADMIN_LOGO}
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNavList pathname={pathname} counts={counts} allowed={allowed} />
        </div>
      </aside>

      {/* Mobile hamburger — offset by the safe-area inset so it doesn't render
          under the status bar / notch when running as an installed standalone
          app (that inset is 0 in a normal Safari tab, which is why this only
          showed up once the PWA was actually installed). */}
      <button
        aria-label="Open admin navigation"
        onClick={() => setOpen(true)}
        className="fixed left-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl bg-black shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 md:hidden"
        style={{ top: "calc(1rem + env(safe-area-inset-top, 0px))" }}
      >
        <Menu className="h-5 w-5 text-white" strokeWidth={1.75} aria-hidden />
      </button>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-black shadow-xl md:hidden">
            <div
              className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
            >
              {ADMIN_LOGO}
              <button
                aria-label="Close admin navigation"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-brand-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <AdminNavList pathname={pathname} counts={counts} allowed={allowed} onNav={() => setOpen(false)} />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
