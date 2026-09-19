"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  name: string;
  image: string | null;
  email?: string;
}

export function AdminUserMenu({ name, image, email }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "A";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-1.5 py-1 text-sm font-medium text-white transition-all hover:border-white/20 hover:bg-white/10 active:scale-[0.96]"
      >
        {image ? (
          <Image src={image} alt={name} width={28} height={28} className="rounded-full object-cover" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
            {initials}
          </span>
        )}
        <svg
          className={`h-3.5 w-3.5 text-white/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
        >
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
            className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-2xl border border-surface-border bg-background shadow-xl"
          >
            {/* Identity */}
            <div className="px-4 py-3 border-b border-surface-border">
              <div className="flex items-center gap-3">
                {image ? (
                  <Image src={image} alt={name} width={36} height={36} className="rounded-xl object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                  {email && <p className="truncate text-xs text-muted">{email}</p>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-1.5">
              <Link
                href="/admin/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-surface"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-muted">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </span>
                <span className="font-medium">Profile & Settings</span>
              </Link>
            </div>

            {/* Sign out */}
            <div className="border-t border-surface-border p-1.5">
              <button
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-danger/5"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger/10 text-danger">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </span>
                <span className="font-medium text-danger">Sign out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
