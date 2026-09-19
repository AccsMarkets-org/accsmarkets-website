"use client";

import { motion } from "framer-motion";

const VALUES = [
  {
    title: "Trust First",
    desc: "We build systems where both sides feel safe. Security and transparency are never optional.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Ship Fast",
    desc: "We move with urgency. Small team, fast cycles, real impact. Every feature ships with purpose.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Own the Outcome",
    desc: "Everyone owns their domain end-to-end. We don't wait for permission — we solve problems and share context.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
];

export function CareerClient() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <span className="inline-block rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 mb-4">
          Careers
        </span>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Join Our Team</h1>
        <p className="mt-3 mx-auto max-w-lg text-muted">
          We&apos;re building the trust infrastructure for the creator economy&apos;s secondary market.
        </p>
      </motion.div>

      {/* Coming soon notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="mt-12 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-background p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-900/50 text-brand-600">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground">We&apos;re Not Hiring Yet</h2>
        <p className="mt-2 text-sm text-muted max-w-md mx-auto">
          We&apos;re a small, focused team right now. When we open positions, they&apos;ll be listed here.
          In the meantime, follow us on social media for updates.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <a href="https://twitter.com/accsmarkets" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-surface-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-brand-200 hover:bg-brand-500/8 transition-all">
            Follow @accsmarkets
          </a>
        </div>
      </motion.div>

      {/* Values */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-16"
      >
        <h2 className="text-center text-2xl font-bold text-foreground mb-8">What We Value</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
              className="rounded-2xl border border-surface-border bg-background p-6 text-center hover:border-brand-200 hover:shadow-sm transition-all"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                {v.icon}
              </div>
              <h3 className="font-semibold text-foreground">{v.title}</h3>
              <p className="mt-2 text-sm text-muted">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
