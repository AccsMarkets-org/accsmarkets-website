"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Captcha } from "@/components/ui/Captcha";
import { PasswordStrength } from "@/components/ui/PasswordStrength";

const TRUST_BADGES = [
  { label: "Escrow Protected", icon: (<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>) },
  { label: "Verified Sellers", icon: (<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>) },
  { label: "Buyer Protection", icon: (<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>) },
];

const STATS = [
  { value: "$2.4M+", label: "through escrow" },
  { value: "3,200+", label: "transfers" },
  { value: "4.9★", label: "avg rating" },
];

const INTENTS = [
  {
    value: "BUY" as const,
    label: "Buyer",
    sub: "Browse & purchase accounts",
    badge: null,
    icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>),
  },
  {
    value: "SELL" as const,
    label: "Seller",
    sub: "List & sell your accounts",
    badge: "KYC required",
    icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>),
  },
  {
    value: "BOTH" as const,
    label: "Buy & Sell",
    sub: "Do both on one account",
    badge: "KYC required to sell",
    icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>),
  },
];

function TrustPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex lg:w-[480px] flex-col justify-between bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-10 text-white relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -left-10 bottom-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-10">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-black backdrop-blur-sm">A</span>
          <span className="text-xl font-bold">AccsMarkets</span>
        </div>
        <h2 className="text-3xl font-bold leading-tight">
          Join 10,000+ buyers &amp; sellers.
        </h2>
        <p className="mt-4 text-white/70 text-sm leading-relaxed">
          Every sale is backed by our escrow system — funds are held securely until you confirm the account is yours.
        </p>

        <div className="mt-10 flex flex-wrap gap-2">
          {["YouTube", "Instagram", "TikTok", "Telegram", "Facebook", "Twitter/X"].map((p) => (
            <span key={p} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm border border-white/10">
              {p}
            </span>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-3 gap-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-white/60 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex gap-5 pt-8 border-t border-white/15">
        {TRUST_BADGES.map((b) => (
          <div key={b.label} className="flex items-center gap-1.5 text-xs text-white/80">
            {b.icon}
            <span>{b.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [intent, setIntent] = useState<"BUY" | "SELL" | "BOTH" | "">("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) sessionStorage.setItem("ref_code", ref);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setLoading(true);
    const refCode = sessionStorage.getItem("ref_code") ?? undefined;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, captchaToken, refCode, intent: intent || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      sessionStorage.removeItem("ref_code");
      setSubmitted(true);
      toast.success("Account created — check your email to verify.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isSeller = intent === "SELL" || intent === "BOTH";

  if (submitted) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10"
        >
          <svg className="h-8 w-8 text-success" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </motion.div>
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted">
          We sent a verification link to <strong className="text-foreground">{form.email}</strong>. Verify your email before you can log in.
        </p>
        {isSeller && (
          <div className="mt-2 w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-left">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">Next step for sellers</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              After logging in, go to <strong>Settings → Verification</strong> to complete phone + ID verification. You&apos;ll need it before posting your first listing.
            </p>
          </div>
        )}
        <Link href="/login" className="mt-2 text-sm font-medium text-brand-600 hover:underline">
          Back to login
        </Link>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <TrustPanel />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16"
      >
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden text-center">
            <div className="inline-flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-black text-white">A</span>
              <span className="text-xl font-bold"><span className="text-brand-500">Accs</span><span className="text-brand-700">Markets</span></span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
          <p className="mt-1 text-sm text-muted">Buy and sell social media accounts, safely.</p>

          {/* Intent picker */}
          <div className="mt-6">
            <p className="mb-2.5 text-sm font-medium text-foreground">I&apos;m here to:</p>
            <div className="grid grid-cols-3 gap-2">
              {INTENTS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIntent(opt.value)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3.5 text-xs font-medium transition-all ${
                    intent === opt.value
                      ? "border-brand-400 bg-brand-500/10 text-brand-700 dark:text-brand-400 shadow-sm"
                      : "border-surface-border bg-background text-muted hover:border-brand-200 hover:bg-surface"
                  }`}
                >
                  {intent === opt.value && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white">
                      <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  )}
                  <span className={intent === opt.value ? "text-brand-600" : "text-muted"}>{opt.icon}</span>
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-[10px] font-normal text-muted leading-tight text-center">{opt.sub}</span>
                  {opt.badge && (
                    <span className="mt-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* KYC callout — shown when seller intent is selected */}
            <AnimatePresence>
              {(intent === "SELL" || intent === "BOTH") && (
                <motion.div
                  key="kyc-callout"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 10 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                    <svg className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      <p className="font-semibold">Seller accounts require KYC verification</p>
                      <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                        You can sign up now and complete phone + ID verification afterward — takes ~2 minutes. Buyers can purchase without any verification.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <Input
              label="Full name"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="relative">
              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <span className="pointer-events-none absolute right-3 top-[38px] text-muted">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-muted hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            <Captcha onVerify={setCaptchaToken} />

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm text-danger"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button type="submit" isLoading={loading} disabled={!captchaToken} className="w-full" size="lg">
              Create account
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-surface-border" />
            or continue with
            <span className="h-px flex-1 bg-surface-border" />
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-surface-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-surface hover:shadow-sm active:scale-[0.98]"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>

          {/* Trust badges strip (mobile only) */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 lg:hidden">
            {TRUST_BADGES.map((b) => (
              <div key={b.label} className="flex items-center gap-1.5 text-xs text-muted">
                {b.icon}
                <span>{b.label}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
