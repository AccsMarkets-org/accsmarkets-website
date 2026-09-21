"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, ShieldCheck, Zap } from "lucide-react";

const PLATFORM_SVG_PATHS: Record<string, string> = {
  YouTube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  Instagram:
    "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  TikTok:
    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  "X (Twitter)":
    "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
};

const FLOATING_CARDS = [
  { name: "YouTube", color: "#FF0000", followers: "120K subs", price: "$2,400", x: "6%", y: "12%", delay: 0, depth: 40 },
  { name: "Instagram", color: "#E1306C", followers: "58K followers", price: "$980", x: "78%", y: "8%", delay: 0.6, depth: 60 },
  { name: "TikTok", color: "#010101", followers: "210K followers", price: "$1,850", x: "84%", y: "58%", delay: 1.2, depth: 30 },
  { name: "X (Twitter)", color: "#1DA1F2", followers: "34K followers", price: "$720", x: "2%", y: "62%", delay: 1.8, depth: 50 },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.65, 0.36, 1] } },
};

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient gradient orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-32 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-brand-200/60 blur-3xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.75, 0.55] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-[12%] h-72 w-72 rounded-full bg-brand-400/20 blur-3xl"
          animate={{ y: [0, -24, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[8%] top-[30%] h-64 w-64 rounded-full bg-warning/15 blur-3xl"
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* 3D floating platform cards */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block" style={{ perspective: 1200 }}>
        {FLOATING_CARDS.map((card) => (
          <motion.div
            key={card.name}
            className="absolute w-44 rounded-2xl border border-surface-border bg-background/90 p-4 shadow-card backdrop-blur"
            style={{ left: card.x, top: card.y, transformStyle: "preserve-3d" }}
            initial={{ opacity: 0, rotateX: 18, rotateY: -14, y: 30 }}
            animate={{
              opacity: 1,
              y: [0, -14, 0],
              rotateX: [14, 8, 14],
              rotateY: [-12, -6, -12],
            }}
            transition={{
              opacity: { duration: 0.8, delay: card.delay * 0.3 },
              y: { duration: 6 + card.depth / 20, repeat: Infinity, ease: "easeInOut", delay: card.delay },
              rotateX: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: card.delay },
              rotateY: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: card.delay },
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md"
                style={{ backgroundColor: card.color, transform: "translateZ(24px)" }}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden>
                  <path d={PLATFORM_SVG_PATHS[card.name]} />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">{card.name}</p>
                <p className="text-[11px] text-muted">{card.followers}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-brand-600">{card.price}</span>
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                Escrow
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pb-28 pt-24 text-center"
      >
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-700 dark:border-brand-800 dark:text-brand-400"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
          </span>
          Escrow-protected marketplace
        </motion.span>

        <motion.h1 variants={fadeUp} className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-6xl">
          Buy &amp; sell social media accounts,{" "}
          <span className="bg-gradient-to-r from-brand-500 via-brand-600 to-warning bg-clip-text text-transparent">
            the safe way.
          </span>
        </motion.h1>

        <motion.p variants={fadeUp} className="max-w-xl text-lg text-muted">
          AccsMarkets holds every payment in escrow until the account transfer is verified. No risky
          direct deals, no getting ghosted — just clean handovers.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
          <Link
            href="/listings"
            className="group inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 hover:shadow-brand-600/30"
          >
            Browse listings
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-surface-border bg-background px-7 py-3.5 font-semibold text-foreground transition hover:border-brand-300 hover:bg-brand-500/8"
          >
            Start selling
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-500" aria-hidden />Funds held in escrow</span>
          <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-brand-500" aria-hidden />Crypto deposits</span>
          <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-brand-500" aria-hidden />Verified sellers</span>
        </motion.div>
      </motion.div>
    </section>
  );
}
