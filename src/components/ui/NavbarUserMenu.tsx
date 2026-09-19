"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { notifyNativeLogout } from "@/lib/native-app";
import { motion, AnimatePresence } from "framer-motion";

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
        className="flex items-center gap-2 rounded-full border border-surface-border bg-surface px-1.5 py-1 text-sm font-medium text-foreground transition-all hover:border-brand-200 hover:shadow-sm active:scale-[0.96]"
      >
        {image ? (
          <Image src={image} alt={name} width={28} height={28} className="rounded-full" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <svg className={`h-3.5 w-3.5 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" />
        </svg>
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
                <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                Dashboard
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Settings
              </Link>
              <Link
                href="/dashboard/wallet"
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
                </svg>
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
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Admin Panel
                </Link>
              </div>
            )}
            <div className="border-t border-surface-border pt-1">
              <button
                onClick={() => { notifyNativeLogout(); signOut({ callbackUrl: "/" }); }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/5"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
