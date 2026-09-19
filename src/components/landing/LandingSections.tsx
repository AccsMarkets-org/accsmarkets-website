"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

/* ---------- Stats band with count-up ---------- */

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1400;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

export function StatsBand({
  listings,
  completedEscrows,
  sellers,
}: {
  listings: number;
  completedEscrows: number;
  sellers: number;
}) {
  const stats = [
    { label: "Accounts listed", value: Math.max(listings, 1), suffix: "+" },
    { label: "Escrows completed", value: Math.max(completedEscrows, 1), suffix: "+" },
    { label: "Active sellers", value: Math.max(sellers, 1), suffix: "+" },
    { label: "Escrow protection", value: 100, suffix: "%" },
  ];

  return (
    <section className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-16 sm:grid-cols-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.5 }}
          className="text-center"
        >
          <p className="text-3xl font-extrabold text-brand-600 sm:text-4xl">
            <CountUp target={stat.value} suffix={stat.suffix} />
          </p>
          <p className="mt-1 text-sm text-muted">{stat.label}</p>
        </motion.div>
      ))}
    </section>
  );
}

/* ---------- How it works ---------- */

const STEPS = [
  {
    n: "01",
    title: "Buyer funds escrow",
    body: "Payment (price + fee) is locked in the platform wallet. The seller sees the funds are real before sharing anything.",
    icon: "💰",
  },
  {
    n: "02",
    title: "Seller hands over the account",
    body: "Credentials and transfer details are submitted through an encrypted channel — never over DMs.",
    icon: "🔐",
  },
  {
    n: "03",
    title: "Buyer verifies, funds release",
    body: "Once the buyer confirms access, the seller is paid the full price instantly. Trust scores go up for both.",
    icon: "✅",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-surface py-20">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            How it works
          </span>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Escrow in three steps</h2>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="relative rounded-2xl border border-surface-border bg-background p-6 shadow-card"
            >
              <span className="absolute right-5 top-4 text-4xl font-black text-brand-100">{step.n}</span>
              <span className="text-3xl">{step.icon}</span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Security section ---------- */

const SECURITY_POINTS = [
  { icon: "🛡️", title: "Funds held in escrow", body: "Money only moves when the buyer confirms the transfer worked." },
  { icon: "🔍", title: "Every listing reviewed", body: "Human moderation plus automated scam detection on all listings." },
  { icon: "🔒", title: "Encrypted handovers", body: "Account credentials are encrypted at rest — visible only to the buyer." },
  { icon: "⭐", title: "Trust scores & badges", body: "Seller reputations are earned from completed escrows, not claimed." },
];

export function SecuritySection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            Built for safety
          </span>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            The middleman you can actually trust
          </h2>
          <p className="mt-4 text-muted">
            Account trading is full of ghosting, chargebacks, and fake sellers. AccsMarkets removes
            the leap of faith: the platform holds the money, verifies the handover, and only then
            pays the seller.
          </p>
          <Link
            href="/escrow-guide"
            className="mt-6 inline-block rounded-xl border border-brand-300 bg-brand-500/10 px-5 py-2.5 text-sm font-semibold text-brand-700 dark:text-brand-300 transition hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-950/40 dark:hover:bg-brand-900/50"
          >
            Read the escrow guide →
          </Link>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          {SECURITY_POINTS.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-2xl border border-surface-border bg-surface p-5 shadow-card"
            >
              <span className="text-2xl">{point.icon}</span>
              <h3 className="mt-3 text-sm font-semibold">{point.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{point.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing ---------- */

const PLANS = [
  { name: "FREE", price: 0, listings: 3, fee: "5%", highlight: false },
  { name: "STARTER", price: 5, listings: 15, fee: "4%", highlight: false },
  { name: "PRO", price: 15, listings: 50, fee: "3%", highlight: true },
  { name: "ENTERPRISE", price: 30, listings: 999, fee: "2%", highlight: false },
];

export function PricingSection() {
  return (
    <section className="bg-surface py-20">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-brand-600">Pricing</span>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Plans that scale with your hustle</h2>
          <p className="mt-3 text-muted">Lower escrow fees and more listing slots as you grow.</p>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={
                plan.highlight
                  ? "relative rounded-2xl border-2 border-brand-500 bg-background p-6 shadow-lg shadow-brand-500/10"
                  : "rounded-2xl border border-surface-border bg-background p-6 shadow-card"
              }
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <p className="text-sm font-semibold text-muted">{plan.name}</p>
              <p className="mt-2 text-3xl font-extrabold">
                ${plan.price}
                <span className="text-sm font-medium text-muted">/mo</span>
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-muted">
                <li>✓ {plan.listings === 999 ? "Unlimited" : plan.listings} active listings</li>
                <li>✓ {plan.fee} escrow fee</li>
                <li>✓ Full buyer protection</li>
              </ul>
              <Link
                href="/register"
                className={
                  plan.highlight
                    ? "mt-6 block rounded-xl bg-brand-500 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-600"
                    : "mt-6 block rounded-xl border border-surface-border py-2.5 text-center text-sm font-semibold text-foreground transition hover:bg-brand-500/8"
                }
              >
                Get started
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

const FAQS = [
  {
    q: "How does the escrow protect me as a buyer?",
    a: "Your payment sits in the platform wallet — the seller never touches it until you confirm you've received full access to the account. If the deal falls through before the seller submits credentials, you get a full refund including the fee.",
  },
  {
    q: "How do sellers get paid?",
    a: "The moment the buyer confirms the transfer (or an admin completes the escrow), the full sale price is credited to your wallet. The platform fee is paid by the buyer on top of your price — you always receive 100% of what you listed.",
  },
  {
    q: "What payment methods are supported?",
    a: "Wallet deposits are crypto-based: USDT and native coins over TRON, BNB Chain, Ethereum, Polygon, and Solana via NOWPayments — plus manual USDT deposits confirmed by our team.",
  },
  {
    q: "Is selling social media accounts allowed?",
    a: "Platform terms vary and transfers carry inherent platform-policy risk. AccsMarkets provides the escrow and verification layer; buyers and sellers are responsible for compliance with each platform's terms of service.",
  },
  {
    q: "What happens if something goes wrong mid-transfer?",
    a: "Either party can open a dispute. Both sides submit evidence and our team reviews the escrow timeline, chat, and credentials trail before ruling a refund or release.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center"
      >
        <span className="text-sm font-semibold uppercase tracking-widest text-brand-600">FAQ</span>
        <h2 className="mt-2 text-3xl font-bold">Questions, answered</h2>
      </motion.div>

      <div className="mt-10 flex flex-col gap-3">
        {FAQS.map((faq, i) => (
          <motion.div
            key={faq.q}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="overflow-hidden rounded-2xl border border-surface-border bg-surface"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold"
            >
              {faq.q}
              <motion.span animate={{ rotate: open === i ? 45 : 0 }} className="ml-4 text-lg text-brand-500">
                +
              </motion.span>
            </button>
            <motion.div
              initial={false}
              animate={{ height: open === i ? "auto" : 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <p className="px-5 pb-4 text-sm leading-relaxed text-muted">{faq.a}</p>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */

export function FinalCta() {
  return (
    <section className="px-6 pb-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-8 py-16 text-center text-white shadow-xl shadow-brand-500/20"
      >
        <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <h2 className="relative text-3xl font-extrabold sm:text-4xl">
          Ready to make your first safe deal?
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-white/85">
          Create a free account, browse escrow-protected listings, or put your own account up for
          sale in minutes.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="rounded-xl bg-white px-7 py-3.5 font-semibold text-brand-700 dark:text-brand-400 shadow-lg transition hover:bg-brand-500/8"
          >
            Create free account
          </Link>
          <Link
            href="/listings"
            className="rounded-xl border border-white/40 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10"
          >
            Browse listings
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
