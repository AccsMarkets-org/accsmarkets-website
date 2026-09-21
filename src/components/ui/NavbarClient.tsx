"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "./Logo";
import { NavbarUserMenu } from "./NavbarUserMenu";
import { CurrencySwitcher } from "@/components/currency/CurrencySwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { Bell, Menu, X } from "lucide-react";

interface NavbarClientProps {
  user: { name: string; image: string | null } | null;
  unreadCount: number;
}

const NAV_LINKS = [
  { href: "/listings", label: "Browse" },
  { href: "/pricing", label: "Pricing" },
  { href: "/escrow-guide", label: "How it works" },
  { href: "/blog", label: "Blog" },
];

export function NavbarClient({ user, unreadCount }: NavbarClientProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 10);
      if (y > lastScrollY.current && y > 80) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          hidden ? "-translate-y-full" : "translate-y-0"
        } ${
          scrolled
            ? "border-surface-border/80 bg-background/95 backdrop-blur-xl shadow-sm py-0"
            : "border-transparent bg-background/80 backdrop-blur-md py-0"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className={`mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 transition-all duration-300 ${
          scrolled ? "h-14" : "h-16"
        }`}>
          {/* Left: Logo */}
          <div className="flex items-center gap-8">
            <Logo size="md" />

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "text-brand-600" : "text-muted hover:text-foreground hover:bg-surface"
                    }`}
                  >
                    {link.label}
                    {active && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="absolute inset-x-1 -bottom-[13px] h-0.5 rounded-full bg-brand-500"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
              {user && (
                <Link
                  href="/dashboard"
                  className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith("/dashboard") ? "text-brand-600" : "text-muted hover:text-foreground hover:bg-surface"
                  }`}
                >
                  Dashboard
                  {pathname.startsWith("/dashboard") && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-x-1 -bottom-[13px] h-0.5 rounded-full bg-brand-500"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              )}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden sm:block"><CurrencySwitcher /></span>
            {user && (
              <Link
                href="/dashboard/notifications"
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Bell className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <NavbarUserMenu name={user.name} image={user.image} />
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground hover:bg-surface"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-md active:scale-[0.97]"
                >
                  Get started
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-background shadow-2xl md:hidden"
            >
              <div className="flex h-16 items-center justify-between border-b border-surface-border px-5">
                <span className="text-sm font-bold text-foreground">Menu</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                {NAV_LINKS.map((link, i) => {
                  const active = pathname === link.href || pathname.startsWith(link.href + "/");
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        href={link.href}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                          active
                            ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                            : "text-foreground hover:bg-surface"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
                {user && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: NAV_LINKS.length * 0.05 }}
                  >
                    <Link
                      href="/dashboard"
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        pathname.startsWith("/dashboard")
                          ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                          : "text-foreground hover:bg-surface"
                      }`}
                    >
                      Dashboard
                    </Link>
                  </motion.div>
                )}
              </div>
              {!user && (
                <div className="border-t border-surface-border p-4">
                  <Link
                    href="/login"
                    className="mb-2 block rounded-xl border border-surface-border px-4 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-surface"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="block rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                  >
                    Get started free
                  </Link>
                </div>
              )}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
