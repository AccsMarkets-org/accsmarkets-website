"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// ── SVG icons ─────────────────────────────────────────────────────────────────
const I = {
  overview:     <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  analytics:    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  listings:     <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  escrows:      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  disputes:     <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  reports:      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  deposits:     <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v14m0 0l-4-4m4 4l4-4"/><rect x="3" y="18" width="18" height="4" rx="1"/></svg>,
  banktransfer: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  bankaccounts: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  withdrawals:  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22V8m0 0l-4 4m4-4l4 4"/><rect x="3" y="2" width="18" height="4" rx="1"/></svg>,
  transactions: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
  users:        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  verification: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  subscriptions:<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  announcements:<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  email:        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  canned:       <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  blog:         <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  settings:     <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  featureflags: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  risk:         <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  staff:        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/><circle cx="19" cy="8" r="2"/><line x1="19" y1="6" x2="19" y2="10"/></svg>,
  legal:        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22V12M2 17l10 5 10-5M2 12l10 5 10-5M2 7l10 5 10-5L12 2 2 7z"/></svg>,
  system:       <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  policies:     <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  emailpool:    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M12 12H4"/><path d="M20 12h-4"/></svg>,
  apps:         <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/></svg>,
  messages:     <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  marketing:    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a2 2 0 11-3.2 2.4L6 16"/></svg>,
  pricing:      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  referrals:    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  escsupport:   <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg>,
  maintenance:  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
  chevron:      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>,
};

type CountKey = "pendingListings" | "pendingDeposits" | "pendingWithdrawals" | "openDisputes" | "pendingKyc" | "pendingBankTransfers" | "unreadContactMessages" | "unreadOwnMessages";

export interface AdminSidebarCounts {
  pendingListings: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  openDisputes: number;
  pendingKyc: number;
  pendingBankTransfers: number;
  unreadContactMessages: number;
  unreadOwnMessages: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  countKey?: CountKey;
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
      { href: "/admin", label: "Overview", icon: I.overview },
      { href: "/admin/messages", label: "Messages", icon: I.messages, countKey: "unreadOwnMessages" },
      { href: "/admin/analytics", label: "Analytics", icon: I.analytics },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { href: "/admin/listings", label: "Listings", icon: I.listings, countKey: "pendingListings" },
      { href: "/admin/escrows", label: "Escrows", icon: I.escrows },
      { href: "/admin/escrow-support", label: "Escrow Support", icon: I.escsupport },
      { href: "/admin/disputes", label: "Disputes", icon: I.disputes, countKey: "openDisputes" },
      { href: "/admin/reports", label: "Reports", icon: I.reports },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { href: "/admin/deposits", label: "Deposits", icon: I.deposits, countKey: "pendingDeposits" },
      { href: "/admin/bank-transfers", label: "Bank Transfers", icon: I.banktransfer, countKey: "pendingBankTransfers" },
      { href: "/admin/withdrawals", label: "Withdrawals", icon: I.withdrawals, countKey: "pendingWithdrawals" },
      { href: "/admin/transactions", label: "Transactions", icon: I.transactions },
      { href: "/admin/bank-accounts", label: "Bank Accounts", icon: I.bankaccounts },
      { href: "/admin/pricing", label: "Pricing", icon: I.pricing },
    ],
  },
  {
    id: "users",
    label: "Users",
    items: [
      { href: "/admin/users", label: "Users", icon: I.users },
      { href: "/admin/verification", label: "Verification", icon: I.verification, countKey: "pendingKyc" },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: I.subscriptions },
      { href: "/admin/referrals", label: "Referrals", icon: I.referrals },
    ],
  },
  {
    id: "ops",
    label: "Ops",
    items: [
      { href: "/admin/announcements", label: "Announcements", icon: I.announcements },
      { href: "/admin/email-templates", label: "Email Templates", icon: I.email },
      { href: "/admin/canned-responses", label: "Canned Responses", icon: I.canned },
      { href: "/admin/blog", label: "Blog", icon: I.blog },
      { href: "/admin/marketing", label: "Marketing", icon: I.marketing },
      { href: "/admin/contact-messages", label: "Contact Inbox", icon: I.email, countKey: "unreadContactMessages" },
    ],
  },
  {
    id: "team",
    label: "Team",
    items: [
      { href: "/admin/staff", label: "Staff & Roles", icon: I.staff },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: I.settings },
      { href: "/admin/maintenance", label: "Maintenance Mode", icon: I.maintenance },
      { href: "/admin/feature-flags", label: "Feature Flags", icon: I.featureflags },
      { href: "/admin/risk", label: "Risk", icon: I.risk },
      { href: "/admin/legal", label: "Legal", icon: I.legal },
      { href: "/admin/system", label: "System", icon: I.system },
    ],
  },
  {
    id: "developer",
    label: "Developer",
    items: [
      { href: "/admin/transfer-policies", label: "Transfer Policies", icon: I.policies },
      { href: "/admin/escrow-emails", label: "Escrow Email Pool", icon: I.emailpool },
      { href: "/admin/apps", label: "App Directory", icon: I.apps },
    ],
  },
];

const COLLAPSED_DEFAULT = new Set<string>();

function AdminNavList({
  pathname,
  counts,
  onNav,
}: {
  pathname: string;
  counts: AdminSidebarCounts;
  onNav?: () => void;
}) {
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
      {NAV_SECTIONS.map((section) => {
        const isCollapsed = collapsed.has(section.id);
        const sectionHasUrgent = section.items.some((item) => item.countKey && counts[item.countKey] > 0);

        return (
          <div key={section.id} className="mb-1">
            <button
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
                  const count = item.countKey ? counts[item.countKey] : 0;
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
};

export function AdminSidebar({ counts = EMPTY_COUNTS }: SidebarProps) {
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
          <AdminNavList pathname={pathname} counts={counts} />
        </div>
      </aside>

      {/* Mobile hamburger — offset by the safe-area inset so it doesn't render
          under the status bar / notch when running as an installed standalone
          app (that inset is 0 in a normal Safari tab, which is why this only
          showed up once the PWA was actually installed). */}
      <button
        aria-label="Open admin navigation"
        onClick={() => setOpen(true)}
        className="fixed left-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl bg-black shadow-sm md:hidden"
        style={{ top: "calc(1rem + env(safe-area-inset-top, 0px))" }}
      >
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
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
                className="flex h-10 w-10 items-center justify-center rounded-lg text-brand-200 hover:bg-white/10"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <AdminNavList pathname={pathname} counts={counts} onNav={() => setOpen(false)} />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
