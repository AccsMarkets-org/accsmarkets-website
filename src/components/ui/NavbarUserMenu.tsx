"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { notifyNativeLogout } from "@/lib/native-app";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LayoutDashboard, LogOut, Settings, ShieldCheck, Wallet } from "lucide-react";

export function NavbarUserMenu({ name, image, role }: { name: string; image: string | null; role?: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    // touchstart too: some mobile browsers don't synthesize mousedown reliably,
    // which left the menu stuck open (or eating the next tap) on phones.
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-surface-border bg-surface px-1.5 py-1 text-sm font-medium text-foreground transition-all hover:border-brand-200 hover:shadow-sm active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {image ? (
          <Image src={image} alt={name} width={28} height={28} className="rounded-full" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={2.25} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-xl border border-surface-border bg-background py-1.5 shadow-lg"
          >
            <div className="border-b border-surface-border px-4 py-2.5">
              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              <p className="text-xs text-muted">Manage your account</p>
            </div>
            <div className="py-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4 text-muted" aria-hidden />
                Dashboard
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <Settings className="h-4 w-4 text-muted" aria-hidden />
                Settings
              </Link>
              <Link
                href="/dashboard/wallet"
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <Wallet className="h-4 w-4 text-muted" aria-hidden />
                Wallet
              </Link>
            </div>
            {role === "ADMIN" && (
              <div className="border-t border-surface-border pt-1">
                <Link
                  href="/admin"
                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-500/8"
                  onClick={() => setOpen(false)}
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  Admin Panel
                </Link>
              </div>
            )}
            <div className="border-t border-surface-border pt-1">
              <button
                onClick={() => { notifyNativeLogout(); signOut({ callbackUrl: "/" }); }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/5"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
