"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/constants";

const INTENTS = [
  {
    value: "BUYER" as const,
    label: "Buy Accounts",
    desc: "I want to purchase social media accounts",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
  },
  {
    value: "SELLER" as const,
    label: "Sell Accounts",
    desc: "I want to sell my social media accounts",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
  {
    value: "BOTH" as const,
    label: "Buy & Sell",
    desc: "I want to do both buying and selling",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
];

const PLATFORMS = [
  { value: "YOUTUBE", label: "YouTube", color: "bg-red-500" },
  { value: "INSTAGRAM", label: "Instagram", color: "bg-gradient-to-br from-purple-500 to-pink-500" },
  { value: "TIKTOK", label: "TikTok", color: "bg-black" },
  { value: "TELEGRAM", label: "Telegram", color: "bg-sky-500" },
  { value: "TWITTER_X", label: "Twitter/X", color: "bg-neutral-900" },
  { value: "FACEBOOK", label: "Facebook", color: "bg-blue-600" },
  { value: "SNAPCHAT", label: "Snapchat", color: "bg-yellow-400" },
  { value: "PINTEREST", label: "Pinterest", color: "bg-red-600" },
  { value: "LINKEDIN", label: "LinkedIn", color: "bg-blue-700" },
  { value: "WEBSITE", label: "Website", color: "bg-emerald-500" },
];

const REASONS = [
  { value: "NO_LONGER_NEEDED", label: "No longer needed", icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
  )},
  { value: "FUNDING_NEW_PROJECT", label: "Funding a project", icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
  )},
  { value: "DIVERSIFYING", label: "Diversifying", icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  )},
  { value: "OTHER", label: "Other reason", icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
  )},
];

const stepVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -60 : 60, opacity: 0 }),
};

const STEP_LABELS = ["Location", "Intent", "WhatsApp", "Platforms", "Reason"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [countryCode, setCountryCode] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [intent, setIntent] = useState<"BUYER" | "SELLER" | "BOTH" | "">("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // WhatsApp verification step — reuses the same endpoints as
  // /dashboard/verify-whatsapp. Not required to finish onboarding (the real
  // enforcement is the 403 gate on listing/buying/chat), just surfaced early
  // so it's not a surprise later.
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(true);
  const [phone, setPhone] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "code">("phone");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpConfirming, setOtpConfirming] = useState(false);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => setPhoneVerified(Boolean((d.user ?? d).phoneVerified)))
      .catch(() => {})
      .finally(() => setCheckingPhone(false));
  }, []);

  async function sendWhatsAppCode() {
    setOtpSending(true);
    try {
      const res = await fetch("/api/verification/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send code");
      toast.success("Code sent on WhatsApp!");
      setOtpStep("code");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setOtpSending(false);
    }
  }

  async function confirmWhatsAppCode() {
    setOtpConfirming(true);
    try {
      const res = await fetch("/api/verification/phone/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Incorrect code");
      toast.success("WhatsApp number verified!");
      setPhoneVerified(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setOtpConfirming(false);
    }
  }

  const isSeller = intent === "SELLER" || intent === "BOTH";
  const totalSteps = isSeller ? 5 : 3;

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      countrySearch === "" ||
      c.name.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function goNext() {
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: countryCode || undefined,
          primaryIntent: intent || undefined,
          sellIntentPlatforms: isSeller ? platforms : undefined,
          sellReason: isSeller && reason ? reason : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("All set! Welcome to AccsMarkets.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong — continuing anyway.");
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    // Persist whatever the user has already selected before navigating away
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countryCode: countryCode || undefined,
        primaryIntent: intent || undefined,
        sellIntentPlatforms: isSeller ? platforms : undefined,
        sellReason: isSeller && reason ? reason : undefined,
      }),
    }).catch(() => null);
    router.push("/dashboard");
  }

  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar progress (desktop only) */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-surface-border bg-surface/50 p-8">
        <div className="mb-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700">
              <span className="text-xs font-black text-white">A</span>
            </div>
            <span className="font-black text-foreground">
              <span className="text-brand-500">Accs</span>
              <span className="text-brand-700">Markets</span>
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {STEP_LABELS.slice(0, totalSteps).map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div key={label} className="flex items-center gap-3 py-2.5">
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                  isActive && "bg-brand-500 text-white shadow-md shadow-brand-500/30",
                  isDone && "bg-success/20 text-success",
                  !isActive && !isDone && "bg-surface-border text-muted",
                )}>
                  {isDone ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted",
                )}>
                  {label}
                </span>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button onClick={skip} className="text-sm text-muted hover:text-foreground transition-colors">
            Skip setup →
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Mobile progress bar */}
          <div className="mb-8 lg:hidden">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-brand-500 uppercase tracking-widest">
                Step {step} of {totalSteps}
              </p>
              <button onClick={skip} className="text-xs text-muted hover:underline">
                Skip
              </button>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-border overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                animate={{ width: `${Math.max(progress, 10)}%` }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {/* Step content with animation */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Step 1 — Country */}
              {step === 1 && (
                <div className="flex flex-col gap-5">
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                      className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600"
                    >
                      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                    <h1 className="text-2xl font-bold text-foreground">Where are you based?</h1>
                    <p className="mt-2 text-sm text-muted">Helps us show relevant listings and detect fraud.</p>
                  </div>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search country..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="h-11 w-full rounded-xl border border-surface-border bg-background pl-10 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                    {filteredCountries.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setCountryCode(c.code)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all text-left",
                          countryCode === c.code
                            ? "border-brand-400 bg-brand-500/10 font-medium text-brand-700 dark:text-brand-400 shadow-sm shadow-brand-200/50"
                            : "border-surface-border hover:border-brand-200 hover:bg-surface/50",
                        )}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                        {countryCode === c.code && (
                          <svg className="ml-auto h-4 w-4 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={skip} className="text-sm text-muted hover:text-foreground transition-colors lg:hidden">
                      Skip for now
                    </button>
                    <div className="lg:hidden" />
                    <Button onClick={goNext} disabled={!countryCode}>
                      Continue
                      <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2 — Intent */}
              {step === 2 && (
                <div className="flex flex-col gap-5">
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                      className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600"
                    >
                      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </motion.div>
                    <h1 className="text-2xl font-bold text-foreground">What brings you here?</h1>
                    <p className="mt-2 text-sm text-muted">We&apos;ll personalise your experience based on your goal.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {INTENTS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setIntent(opt.value)}
                        className={cn(
                          "flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                          intent === opt.value
                            ? "border-brand-400 bg-brand-500/10 shadow-sm shadow-brand-200/50"
                            : "border-surface-border hover:border-brand-200 hover:bg-surface/30",
                        )}
                      >
                        <div className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                          intent === opt.value ? "bg-brand-500 text-white" : "bg-surface text-muted",
                        )}>
                          {opt.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{opt.label}</p>
                          <p className="text-xs text-muted mt-0.5">{opt.desc}</p>
                        </div>
                        <div className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border-2 shrink-0 transition-all",
                          intent === opt.value ? "border-brand-500 bg-brand-500" : "border-surface-border",
                        )}>
                          {intent === opt.value && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                      Back
                    </button>
                    <Button onClick={goNext} disabled={!intent}>
                      Continue
                      <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3 — WhatsApp verification (everyone) */}
              {step === 3 && (
                <div className="flex flex-col gap-5">
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                      className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600"
                    >
                      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                    </motion.div>
                    <h1 className="text-2xl font-bold text-foreground">Verify your WhatsApp</h1>
                    <p className="mt-2 text-sm text-muted">
                      Required before you can list, buy, or message other users — keeps the marketplace free of fake accounts.
                    </p>
                  </div>

                  {checkingPhone ? null : phoneVerified ? (
                    <div className="rounded-2xl border border-success/30 bg-success/5 p-5 text-center">
                      <p className="flex items-center justify-center gap-2 font-semibold text-success">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                        WhatsApp verified
                      </p>
                    </div>
                  ) : otpStep === "phone" ? (
                    <div className="flex flex-col gap-3">
                      <Input
                        label="WhatsApp number (with country code)"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+15551234567"
                      />
                      <Button onClick={sendWhatsAppCode} isLoading={otpSending} disabled={!phone} className="self-start">
                        Send code on WhatsApp
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="rounded-xl border border-brand-200 bg-brand-500/10 px-4 py-3 text-sm">
                        <p className="font-medium text-brand-700">Check WhatsApp</p>
                        <p className="mt-0.5 text-brand-600">A 6-digit code was sent to <span className="font-semibold">{phone}</span>.</p>
                      </div>
                      <Input
                        label="Verification code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setOtpStep("phone")}>Back</Button>
                        <Button onClick={confirmWhatsAppCode} isLoading={otpConfirming} disabled={otpCode.length < 6}>Confirm</Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                      Back
                    </button>
                    {isSeller ? (
                      <Button onClick={goNext}>
                        {phoneVerified ? "Continue" : "Skip for now"}
                        <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                      </Button>
                    ) : (
                      <Button onClick={handleSave} isLoading={saving}>
                        {phoneVerified ? "Finish setup" : "Skip & finish setup"}
                        <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4 — Platforms (seller only) */}
              {step === 4 && isSeller && (
                <div className="flex flex-col gap-5">
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                      className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600"
                    >
                      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </motion.div>
                    <h1 className="text-2xl font-bold text-foreground">Which platforms?</h1>
                    <p className="mt-2 text-sm text-muted">Select all the platforms you plan to list accounts on.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => togglePlatform(p.value)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-all text-left",
                          platforms.includes(p.value)
                            ? "border-brand-400 bg-brand-500/10 font-medium text-brand-700 dark:text-brand-400 shadow-sm shadow-brand-200/50"
                            : "border-surface-border hover:border-brand-200 hover:bg-surface/30",
                        )}
                      >
                        <span className={cn("h-3 w-3 rounded-full shrink-0", p.color)} />
                        <span className="flex-1">{p.label}</span>
                        {platforms.includes(p.value) && (
                          <svg className="h-4 w-4 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                      Back
                    </button>
                    <Button onClick={goNext}>
                      Continue
                      <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5 — Reason (seller only) */}
              {step === 5 && isSeller && (
                <div className="flex flex-col gap-5">
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                      className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600"
                    >
                      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                    <h1 className="text-2xl font-bold text-foreground">Why are you selling?</h1>
                    <p className="mt-2 text-sm text-muted">Buyers appreciate knowing the motivation behind a sale.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {REASONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setReason(r.value)}
                        className={cn(
                          "flex flex-col items-center gap-2.5 rounded-2xl border p-5 text-sm transition-all",
                          reason === r.value
                            ? "border-brand-400 bg-brand-500/10 font-medium text-brand-700 dark:text-brand-400 shadow-sm shadow-brand-200/50"
                            : "border-surface-border hover:border-brand-200 hover:bg-surface/30",
                        )}
                      >
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                          reason === r.value ? "bg-brand-500 text-white" : "bg-surface text-muted",
                        )}>
                          {r.icon}
                        </div>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                      Back
                    </button>
                    <Button onClick={handleSave} isLoading={saving}>
                      Finish setup
                      <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
