"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function parseError(raw: string): string {
  if (raw === "MISSING_CREDENTIALS") return "Enter your email and password.";
  if (raw === "ACCOUNT_BANNED") return "This account has been suspended.";
  if (raw === "EMAIL_NOT_VERIFIED") return "EMAIL_NOT_VERIFIED";
  if (raw === "TOTP_REQUIRED") return "TOTP_REQUIRED";
  if (raw === "INVALID_TOTP") return "Incorrect authentication code. Try again.";
  if (raw === "ACCOUNT_LOCKED") return "Too many failed attempts — try again in 15 minutes.";
  if (raw.startsWith("INVALID_CREDENTIALS:")) {
    const n = raw.split(":")[1];
    return `Incorrect email or password. ${n} attempt${n === "1" ? "" : "s"} remaining.`;
  }
  if (raw === "INVALID_CREDENTIALS") return "Incorrect email or password.";
  return "Login failed. Try again.";
}

const TRUST_BADGES = [
  {
    label: "Escrow Protected",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "Verified Sellers",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    label: "Buyer Protection",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
      </svg>
    ),
  },
];

export function LoginFormClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [needTotp, setNeedTotp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        ...(needTotp && { totpCode }),
        redirect: false,
      });
      if (res?.error) {
        const msg = parseError(res.error);
        if (msg === "TOTP_REQUIRED") {
          setNeedTotp(true);
          setError(null);
        } else {
          setError(msg);
          if (needTotp) setTotpCode("");
        }
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong. Please try again.");
      toast.success("Verification email sent — check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
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
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-black text-white">
              A
            </span>
            <span className="text-xl font-bold">
              <span className="text-brand-500">Accs</span>
              <span className="text-brand-700 dark:text-brand-400">Markets</span>
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to your account to continue.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {!needTotp ? (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="relative">
                  <Input
                    label="Email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <span className="pointer-events-none absolute right-3 top-[38px] text-muted">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                </div>
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] text-muted hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                  <div className="mt-1 text-right">
                    <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="totp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center gap-3 rounded-xl bg-brand-500/10 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/50 text-brand-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <p className="text-sm text-foreground">
                    Two-factor authentication is enabled. Enter your 6-digit code.
                  </p>
                </div>
                <Input
                  label="Authentication code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  required
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\s/g, ""))}
                  autoFocus
                />
                <button
                  type="button"
                  className="self-start flex items-center gap-1 text-xs text-brand-600 hover:underline"
                  onClick={() => {
                    setNeedTotp(false);
                    setTotpCode("");
                    setError(null);
                  }}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to password
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error === "EMAIL_NOT_VERIFIED" ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm text-warning-foreground">
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>
                    Please verify your email before logging in.{" "}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="font-medium underline disabled:opacity-60"
                    >
                      Resend email
                    </button>
                  </span>
                </div>
              </motion.div>
            ) : error ? (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-sm text-danger"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <Button type="submit" isLoading={loading} className="w-full" size="lg">
            {needTotp ? "Verify code" : "Log in"}
          </Button>
        </form>

        {!needTotp && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-surface-border" />
              or continue with
              <span className="h-px flex-1 bg-surface-border" />
            </div>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-surface-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-surface hover:shadow-sm active:scale-[0.98]"
              onClick={() => signIn("google", { callbackUrl })}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
          </>
        )}

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
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
