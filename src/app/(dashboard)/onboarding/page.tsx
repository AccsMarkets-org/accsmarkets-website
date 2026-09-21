"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

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

// Step definitions
const STEPS = [
  { id: 1, label: "Account", desc: "Choose your role" },
  { id: 2, label: "Profile", desc: "Set up your profile" },
  { id: 3, label: "Verify", desc: "Verify your identity" },
  { id: 4, label: "Start", desc: "You're all set" },
];

const stepVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -60 : 60, opacity: 0 }),
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1: Account type
  const [intent, setIntent] = useState<"BUYER" | "SELLER" | "BOTH" | "">("");

  // Step 2: Profile
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Step 3: Verify — email
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Step 3: Verify — phone / WhatsApp
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(true);
  const [phone, setPhone] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "code">("phone");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpConfirming, setOtpConfirming] = useState(false);

  // Step 4 / final save
  const [saving, setSaving] = useState(false);

  // Pre-fill user data
  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => {
        const u = d.user ?? d;
        setPhoneVerified(Boolean(u.phoneVerified));
        setEmailVerified(Boolean(u.emailVerified));
        if (u.name) setName(u.name);
        if (u.username) setUsername(u.username);
        if (u.image) setAvatarUrl(u.image);
        if (u.bio) setBio(u.bio);
      })
      .catch(() => {})
      .finally(() => setCheckingPhone(false));
  }, []);

  function goNext() { setDirection(1); setStep((s) => s + 1); }
  function goBack() { setDirection(-1); setStep((s) => s - 1); }

  // ── Avatar upload ────────────────────────────────────────────────────────────
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large (max 5 MB)"); return; }
    setAvatarUploading(true);
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUri }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setAvatarUrl(data.url);
      toast.success("Avatar uploaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  // ── Save profile (step 2) ────────────────────────────────────────────────────
  async function saveProfile() {
    setProfileSaving(true);
    try {
      const body: Record<string, string> = {};
      if (name.trim()) body.name = name.trim();
      if (username.trim()) body.username = username.trim();
      if (avatarUrl) body.imageUrl = avatarUrl;
      if (bio.trim()) body.bio = bio.trim();
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save profile");
      toast.success("Profile saved!");
      goNext();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving profile");
    } finally {
      setProfileSaving(false);
    }
  }

  // ── Email verification ───────────────────────────────────────────────────────
  async function sendEmailVerification() {
    setEmailSending(true);
    try {
      const res = await fetch("/api/verification/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to send verification email");
      }
      toast.success("Verification email sent!");
      setEmailSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setEmailSending(false);
    }
  }

  // ── WhatsApp OTP ─────────────────────────────────────────────────────────────
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

  // ── Final save & redirect ────────────────────────────────────────────────────
  async function handleFinish() {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryIntent: intent || undefined,
        }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch {
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryIntent: intent || undefined }),
    }).catch(() => null);
    router.push("/dashboard");
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
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
          {STEPS.map((s) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-3 py-2.5">
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                  isActive && "bg-brand-500 text-white shadow-md shadow-brand-500/30",
                  isDone && "bg-success/20 text-success",
                  !isActive && !isDone && "bg-surface-border text-muted",
                )}>
                  {isDone ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                  ) : s.id}
                </div>
                <div>
                  <p className={cn("text-sm font-medium transition-colors", isActive ? "text-foreground" : "text-muted")}>
                    {s.label}
                  </p>
                  <p className="text-xs text-muted">{s.desc}</p>
                </div>
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
          {/* Mobile progress */}
          <div className="mb-8 lg:hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-brand-500 uppercase tracking-widest">
                Step {step} of {STEPS.length}
              </p>
              <button onClick={skip} className="text-xs text-muted hover:underline">Skip</button>
            </div>
            {/* Progress dots */}
            <div className="flex gap-2">
              {STEPS.map((s) => (
                <div key={s.id} className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  step === s.id ? "flex-1 bg-brand-500" : step > s.id ? "w-2 bg-brand-300" : "w-2 bg-surface-border"
                )} />
              ))}
            </div>
          </div>

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
              {/* ── Step 1: Account type ──────────────────────────────────────── */}
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
                    <button type="button" onClick={skip} className="text-sm text-muted hover:text-foreground transition-colors lg:hidden">
                      Skip for now
                    </button>
                    <div className="lg:hidden" />
                    <Button onClick={goNext} disabled={!intent}>
                      Continue
                      <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Profile ───────────────────────────────────────────── */}
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
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </motion.div>
                    <h1 className="text-2xl font-bold text-foreground">Set up your profile</h1>
                    <p className="mt-2 text-sm text-muted">Help buyers and sellers recognise you on the marketplace.</p>
                  </div>

                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-full bg-surface border-2 border-surface-border overflow-hidden flex items-center justify-center">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <svg className="h-10 w-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <label className={cn(
                        "absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-background transition-colors",
                        avatarUploading ? "bg-muted" : "bg-brand-500 hover:bg-brand-600"
                      )}>
                        {avatarUploading ? (
                          <svg className="h-3.5 w-3.5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                        )}
                        <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} disabled={avatarUploading} />
                      </label>
                    </div>
                    <p className="text-xs text-muted">Upload avatar (optional)</p>
                  </div>

                  <Input
                    label="Display name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    maxLength={60}
                  />

                  <div>
                    <Input
                      label="Username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      placeholder="e.g. john_doe"
                      maxLength={30}
                    />
                    <p className="mt-1 text-xs text-muted">Letters, numbers and underscores only.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Bio <span className="text-muted font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell buyers/sellers a bit about yourself…"
                      rows={3}
                      maxLength={300}
                      className="w-full rounded-xl border border-surface-border bg-background px-3 py-2.5 text-sm resize-none focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
                    />
                    <p className="mt-1 text-right text-xs text-muted">{bio.length}/300</p>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                      Back
                    </button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={goNext} type="button">
                        Skip
                      </Button>
                      <Button onClick={saveProfile} isLoading={profileSaving}>
                        Save & Continue
                        <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Verify ────────────────────────────────────────────── */}
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
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </motion.div>
                    <h1 className="text-2xl font-bold text-foreground">Verify your identity</h1>
                    <p className="mt-2 text-sm text-muted">Keeps the marketplace safe from fake accounts.</p>
                  </div>

                  {/* Email verification */}
                  <div className="rounded-2xl border border-surface-border bg-surface p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        emailVerified ? "bg-success/20 text-success" : "bg-brand-500/10 text-brand-600"
                      )}>
                        {emailVerified ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">Email verification</p>
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            emailVerified
                              ? "bg-success/10 text-success"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          )}>
                            {emailVerified ? "Verified" : "Required"}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">Confirm your email address to access all features.</p>
                        {!emailVerified && (
                          <div className="mt-2">
                            {emailSent ? (
                              <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                                Check your inbox and click the verification link.
                              </p>
                            ) : (
                              <button
                                onClick={sendEmailVerification}
                                disabled={emailSending}
                                className="text-xs font-semibold text-brand-600 hover:underline disabled:opacity-60"
                              >
                                {emailSending ? "Sending…" : "Send verification email →"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Phone / WhatsApp verification */}
                  <div className="rounded-2xl border border-surface-border bg-surface p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        phoneVerified ? "bg-success/20 text-success" : "bg-surface-border text-muted"
                      )}>
                        {phoneVerified ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">Phone (WhatsApp)</p>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-border text-muted">
                            {phoneVerified ? "Verified" : "Optional"}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">For WhatsApp notifications — optional.</p>

                        {!checkingPhone && !phoneVerified && (
                          <div className="mt-3">
                            {otpStep === "phone" ? (
                              <div className="flex flex-col gap-2">
                                <Input
                                  label="WhatsApp number (with country code)"
                                  type="tel"
                                  value={phone}
                                  onChange={(e) => setPhone(e.target.value)}
                                  placeholder="+15551234567"
                                />
                                <div className="flex items-center gap-3">
                                  <Button
                                    onClick={sendWhatsAppCode}
                                    isLoading={otpSending}
                                    disabled={!phone}
                                    className="self-start"
                                  >
                                    Verify via WhatsApp
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <div className="rounded-xl border border-brand-200 bg-brand-500/10 px-3 py-2 text-xs">
                                  <p className="font-medium text-brand-700">Check WhatsApp</p>
                                  <p className="mt-0.5 text-brand-600">Code sent to <span className="font-semibold">{phone}</span>.</p>
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
                          </div>
                        )}
                      </div>
                    </div>
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

              {/* ── Step 4: Completion ────────────────────────────────────────── */}
              {step === 4 && (
                <div className="flex flex-col items-center gap-6 text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                    className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-500/30"
                  >
                    <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>

                  <div>
                    <h1 className="text-3xl font-black text-foreground">You&apos;re all set!</h1>
                    <p className="mt-3 text-sm text-muted max-w-sm mx-auto">
                      Welcome to AccsMarkets. Your account is ready.
                      {!emailVerified && (
                        <span className="block mt-2 text-amber-600 dark:text-amber-400">
                          Reminder: verify your email to unlock all features.
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="w-full max-w-xs flex flex-col gap-3">
                    <Button onClick={handleFinish} isLoading={saving} className="w-full py-3 text-base">
                      Go to Dashboard
                      <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </Button>
                    <p className="text-xs text-muted">
                      You can always update your profile in{" "}
                      <a href="/dashboard/settings" className="text-brand-500 hover:underline">Settings</a>.
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="w-full rounded-2xl border border-surface-border bg-surface p-4 text-left">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Your Setup</p>
                    <div className="flex flex-col gap-2">
                      {[
                        { label: "Account type", value: intent || "Not set", done: Boolean(intent) },
                        { label: "Display name", value: name || "Not set", done: Boolean(name) },
                        { label: "Username", value: username ? `@${username}` : "Not set", done: Boolean(username) },
                        { label: "Email", value: emailVerified ? "Verified" : "Not verified", done: emailVerified },
                        { label: "WhatsApp", value: phoneVerified ? "Verified" : "Not verified", done: phoneVerified },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-sm">
                          <span className="text-muted">{item.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={cn("font-medium", item.done ? "text-foreground" : "text-muted")}>
                              {item.value}
                            </span>
                            {item.done ? (
                              <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                            ) : (
                              <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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
