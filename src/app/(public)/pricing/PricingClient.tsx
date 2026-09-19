"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PLAN_BULLET_FEATURES, PLAN_META } from "@/lib/plan-features";

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  listingLimit: number;
  escrowFeeRate: number;
  minFee: number;
}

interface PricingClientProps {
  plans: Plan[];
  currentPlanId: string | null;
  isLoggedIn: boolean;
}

export function PricingClient({ plans, currentPlanId, isLoggedIn }: PricingClientProps) {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <span className="inline-block rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600">
          Pricing
        </span>
        <h1 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-muted">
          Choose the plan that fits your needs. Upgrade or downgrade anytime. All plans include escrow protection.
        </p>

        {/* Toggle */}
        <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-surface-border bg-surface p-1">
          <button
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              !annual ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              annual ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            Annual
            <span className="ml-1.5 inline-block rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
              -17%
            </span>
          </button>
        </div>
      </motion.div>

      {/* Cards */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan, i) => {
          const meta = PLAN_META[plan.name] ?? { tagline: "" };
          const features = PLAN_BULLET_FEATURES[plan.name] ?? [];
          const isCurrent = plan.id === currentPlanId;
          const price = annual ? Math.round(plan.priceMonthly * 10) / 12 : plan.priceMonthly;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all hover:shadow-lg ${
                meta.popular
                  ? "border-brand-300 bg-brand-50/30 shadow-md ring-1 ring-brand-200"
                  : "border-surface-border bg-background hover:border-brand-200"
              }`}
            >
              {meta.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                  Most popular
                </span>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="mt-0.5 text-xs text-muted">{meta.tagline}</p>
              </div>

              <div className="mb-6">
                {plan.priceMonthly === 0 ? (
                  <span className="text-3xl font-bold text-foreground">Free</span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      ${price.toFixed(price % 1 === 0 ? 0 : 2)}
                    </span>
                    <span className="text-sm text-muted">/mo</span>
                  </div>
                )}
                {annual && plan.priceMonthly > 0 && (
                  <p className="mt-1 text-xs text-success">
                    Billed ${(price * 12).toFixed(0)}/year (save ${((plan.priceMonthly * 12) - (price * 12)).toFixed(0)})
                  </p>
                )}
              </div>

              <div className="mb-6 flex flex-col gap-2.5 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                  <span className="text-muted">Listings</span>
                  <span className="font-semibold text-foreground">
                    {plan.listingLimit >= 999 ? "Unlimited" : plan.listingLimit}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                  <span className="text-muted">Escrow fee</span>
                  <span className="font-semibold text-foreground">{(plan.escrowFeeRate * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                  <span className="text-muted">Min fee</span>
                  <span className="font-semibold text-foreground">${plan.minFee}</span>
                </div>
              </div>

              <ul className="mb-6 flex flex-1 flex-col gap-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <span className="mt-auto flex items-center justify-center rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm font-medium text-muted">
                  Current plan
                </span>
              ) : (
                <Link
                  href={isLoggedIn ? "/dashboard/settings/subscription" : "/register"}
                  className={`mt-auto flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] ${
                    meta.popular
                      ? "bg-brand-500 text-white shadow-sm hover:bg-brand-600 hover:shadow-md"
                      : "border border-surface-border bg-background text-foreground hover:border-brand-200 hover:shadow-sm"
                  }`}
                >
                  {plan.priceMonthly === 0 ? "Get started free" : "Upgrade"}
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Comparison table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-20"
      >
        <h2 className="text-center text-2xl font-bold text-foreground">Compare all plans</h2>
        <p className="mt-2 text-center text-sm text-muted">Everything included in each tier at a glance.</p>

        <div className="mt-8 overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface">
                <th className="px-4 py-3 text-left font-medium text-muted">Feature</th>
                {plans.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-center font-semibold text-foreground">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CompareRow label="Active listings" values={plans.map((p) => p.listingLimit >= 999 ? "Unlimited" : String(p.listingLimit))} />
              <CompareRow label="Escrow fee" values={plans.map((p) => `${(p.escrowFeeRate * 100).toFixed(0)}%`)} />
              <CompareRow label="Minimum fee" values={plans.map((p) => `$${p.minFee}`)} />
              <CompareRow label="Channel name visible" values={["No", "Yes", "Yes", "Yes"]} />
              <CompareRow label="Channel URL visible" values={["No", "No", "Yes", "Yes"]} />
              <CompareRow label="Priority placement" values={["No", "No", "Yes", "Yes"]} />
              <CompareRow label="Bulk tools" values={["No", "No", "Yes", "Yes"]} />
              <CompareRow label="API access" values={["No", "No", "No", "Yes"]} />
              <CompareRow label="Dedicated support" values={["No", "No", "Yes", "Yes"]} />
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* FAQ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-20 mx-auto max-w-2xl"
      >
        <h2 className="text-center text-2xl font-bold text-foreground">Frequently asked questions</h2>
        <div className="mt-8 flex flex-col gap-4">
          <FaqItem
            q="Can I cancel or downgrade at any time?"
            a="Yes. You can downgrade to a lower plan at any time — your current plan features remain active until the end of the billing cycle."
          />
          <FaqItem
            q="How does the escrow fee work?"
            a="The escrow fee is charged only when a sale completes successfully. It's a percentage of the sale price, with a minimum fee per transaction. Higher plans have lower fees."
          />
          <FaqItem
            q="What payment methods are accepted?"
            a="We accept cryptocurrency (BTC, USDT, ETH across multiple networks) for plan subscriptions. You can also pay from your AccsMarkets wallet balance."
          />
          <FaqItem
            q="Do I need a paid plan to buy accounts?"
            a="No. The Free plan is sufficient for buying. Paid plans are most valuable for sellers who want lower fees, more listings, and better visibility."
          />
          <FaqItem
            q="Is there a free trial for paid plans?"
            a="We don't offer trials, but you can start with the Free plan and upgrade when you're ready. There's no long-term commitment."
          />
        </div>
      </motion.div>

      {/* Enterprise CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-20 rounded-2xl border border-surface-border bg-gradient-to-br from-surface to-background p-8 text-center sm:p-12"
      >
        <h3 className="text-xl font-bold text-foreground">Need custom limits or a tailored solution?</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          For agencies managing multiple accounts or high-volume brokers, we offer custom plans with dedicated support and SLAs.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.97]"
        >
          Contact sales
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
      </motion.div>
    </div>
  );
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-b border-surface-border last:border-0">
      <td className="px-4 py-3 text-muted">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-4 py-3 text-center">
          {v === "Yes" ? (
            <svg className="mx-auto h-4 w-4 text-success" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          ) : v === "No" ? (
            <svg className="mx-auto h-4 w-4 text-muted/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <span className="font-medium text-foreground">{v}</span>
          )}
        </td>
      ))}
    </tr>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-surface-border bg-background transition-colors hover:border-brand-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground"
      >
        {q}
        <svg
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm leading-relaxed text-muted">
          {a}
        </div>
      )}
    </div>
  );
}
