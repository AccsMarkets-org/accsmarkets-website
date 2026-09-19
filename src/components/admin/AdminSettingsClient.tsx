"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { AdminWebAuthnSettings } from "@/components/admin/AdminWebAuthnSettings";
// ── Types ─────────────────────────────────────────────────────────────────────

interface ConnectedAccount { provider: string; providerAccountId: string }
interface ActiveSession { id: string; userAgent: string | null; ip: string | null; lastSeenAt: string; createdAt: string }

interface ProfileData {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
  createdAt: string;
  accounts: ConnectedAccount[];
  activeSessions: ActiveSession[];
}

// Serialized version — all Decimal fields converted to number, all Dates to string
interface SerializedSettings {
  id: string;
  siteName: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  requireEmailVerification: boolean;
  minDeposit: number;
  minWithdrawal: number;
  escrowTransferDays: number;
  disputeWindowHours: number;
  highValueEscrowThreshold: number;
  listingReviewHours: number;
  bankTransferShortfallToleranceUsd: number;
  bankTransferShortfallTolerancePct: number;
  walletAddressTrc20: string | null;
  walletAddressBep20: string | null;
  walletAddressErc20: string | null;
  walletAddressMatic: string | null;
  walletAddressSol: string | null;
  updatedAt: string;
  [key: string]: unknown;
}

interface Props {
  profile: ProfileData;
  settings: SerializedSettings;
}

// ── Sidebar nav items ─────────────────────────────────────────────────────────

const NAV = [
  {
    group: "Account",
    items: [
      { id: "profile",   label: "Profile",            icon: "M12 12c2.7 0 4-1.8 4-4s-1.3-4-4-4-4 1.8-4 4 1.3 4 4 4zm0 2c-4 0-6 1.8-6 4v1h12v-1c0-2.2-2-4-6-4z" },
      { id: "security",  label: "Password & Security", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
      { id: "connected", label: "Connected Accounts",  icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z" },
      { id: "sessions",  label: "Sessions",            icon: "M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8" },
    ],
  },
  {
    group: "Platform",
    items: [
      { id: "general",   label: "General",             icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
      { id: "financial", label: "Financial Limits",    icon: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
      { id: "wallets",   label: "Crypto Wallets",      icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
      { id: "escrow",    label: "Escrow & Disputes",   icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4" },
      { id: "transfers", label: "Bank Transfers",      icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
    ],
  },
] as const;

type TabId =
  | "profile" | "security" | "connected" | "sessions"
  | "general" | "financial" | "wallets" | "escrow" | "transfers";

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 16, scale: 0.96 }}
      className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl ${
        ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
      }`}
    >
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        {ok
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}
      </svg>
      {msg}
    </motion.div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-xl border border-surface-border bg-background px-3.5 text-base text-foreground placeholder:text-muted/60 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition sm:text-sm ${props.className ?? ""}`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-surface-border bg-background px-3.5 py-2.5 text-base text-foreground placeholder:text-muted/60 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none transition sm:text-sm ${props.className ?? ""}`}
    />
  );
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 text-sm text-muted">{sub}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}

function SaveButton({ saving, label = "Save changes" }: { saving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition"
    >
      {saving && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      )}
      {saving ? "Saving…" : label}
    </button>
  );
}


function ToggleRow({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ── Avatar Upload ─────────────────────────────────────────────────────────────

function AvatarUpload({ current, name, onChange }: { current: string | null; name: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(current);
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "A";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
      setPreview(data.url);
    } catch (err) {
      console.error("Avatar upload failed", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        {preview
          ? <img src={preview} alt={name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-brand-500/30" />
          : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-white">{initials}</div>
        }
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
            <svg className="h-6 w-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
            </svg>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{name || "Admin"}</p>
        <p className="mt-0.5 text-xs text-muted">Administrator · AccsMarkets</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="rounded-xl border border-surface-border bg-background px-4 py-1.5 text-xs font-medium text-foreground hover:border-brand-400 hover:text-brand-600 transition disabled:opacity-50">
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          {preview && (
            <button type="button" onClick={() => { setPreview(null); onChange(""); }}
              className="rounded-xl border border-surface-border px-4 py-1.5 text-xs font-medium text-muted hover:text-danger hover:border-danger/30 transition">
              Remove
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab({ profile, onToast }: { profile: ProfileData; onToast: (ok: boolean, msg: string) => void }) {
  const { update } = useSession();
  const [form, setForm] = useState({
    name: profile.name ?? "",
    username: profile.username ?? "",
    bio: profile.bio ?? "",
    image: profile.image ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profile", ...form }),
      });
      const data = await res.json();
      if (!res.ok) { onToast(false, data.error ?? "Save failed"); return; }
      await update({ name: form.name, image: form.image });
      onToast(true, "Profile updated");
    } catch { onToast(false, "Network error"); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <SectionHeader title="Photo" sub="This will be shown on your admin profile and activity logs." />
        <AvatarUpload current={form.image || null} name={form.name} onChange={(url) => setForm((f) => ({ ...f, image: url }))} />
      </Card>

      <Card>
        <SectionHeader title="Basic Information" sub="Your public-facing name, username, and bio." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Admin" required />
          </Field>
          <Field label="Username" hint="Lowercase letters, numbers, underscores only.">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">@</span>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} className="pl-7" placeholder="admin" />
            </div>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Email address" hint="Contact your developer to change the admin email.">
            <Input value={profile.email ?? ""} disabled className="opacity-50 cursor-not-allowed" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Bio" hint="Brief description shown in admin activity logs (300 chars max).">
            <Textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} rows={3} maxLength={300} placeholder="Platform administrator at AccsMarkets…" />
            <p className="mt-1 text-right text-xs text-muted">{form.bio.length}/300</p>
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <SaveButton saving={saving} />
      </div>
    </form>
  );
}

// ── Security tab ──────────────────────────────────────────────────────────────

function SecurityTab({ onToast }: { onToast: (ok: boolean, msg: string) => void }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const strength = (() => {
    const p = form.newPassword;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-500"][strength];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) { onToast(false, "Passwords don't match"); return; }
    if (form.newPassword.length < 8) { onToast(false, "Password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { onToast(false, data.error ?? "Failed"); return; }
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onToast(true, "Password changed successfully");
    } catch { onToast(false, "Network error"); } finally { setSaving(false); }
  }

  function PwInput({ value, onChange, show, onToggle, placeholder }: {
    value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string;
  }) {
    return (
      <div className="relative">
        <Input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pr-10" required />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            {show
              ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
              : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
            }
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <SectionHeader title="Change Password" sub="Use a strong, unique password you don't use anywhere else." />
        <div className="flex flex-col gap-4 max-w-md">
          <Field label="Current password">
            <PwInput value={form.currentPassword} onChange={(v) => setForm((f) => ({ ...f, currentPassword: v }))} show={showCurrent} onToggle={() => setShowCurrent((x) => !x)} placeholder="Current password" />
          </Field>
          <Field label="New password">
            <PwInput value={form.newPassword} onChange={(v) => setForm((f) => ({ ...f, newPassword: v }))} show={showNew} onToggle={() => setShowNew((x) => !x)} placeholder="Min. 8 characters" />
            {form.newPassword && (
              <div className="mt-1.5 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : "bg-surface-border"}`} />
                  ))}
                </div>
                <p className="text-xs text-muted">{strengthLabel}</p>
              </div>
            )}
          </Field>
          <Field label="Confirm new password">
            <Input type="password" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat new password" required
              className={form.confirmPassword && form.confirmPassword !== form.newPassword ? "border-danger/60 focus:border-danger" : ""} />
            {form.confirmPassword && form.confirmPassword !== form.newPassword && (
              <p className="text-xs text-danger mt-1">Passwords don't match</p>
            )}
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <SaveButton saving={saving} label="Change password" />
      </div>
    </form>
    <TwoFASection onToast={onToast} />
    <AdminWebAuthnSettings />
    </div>
  );
}

// ── 2FA setup widget ──────────────────────────────────────────────────────────

function TwoFASection({ onToast }: { onToast: (ok: boolean, msg: string) => void }) {
  const [status, setStatus] = useState<"loading" | "off" | "setup" | "on">("loading");
  const [otpauth, setOtpauth] = useState("");
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disabling, setDisabling] = useState(false);
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  useEffect(() => {
    fetch("/api/admin/2fa/status").then((r) => r.json()).then((d) => {
      setStatus(d.enabled ? "on" : "off");
    }).catch(() => setStatus("off"));
  }, []);

  async function startSetup() {
    try {
      const res = await fetch("/api/admin/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setOtpauth(data.otpauth);
      setSecret(data.secret);
      setStatus("setup");
    } catch (err) { onToast(false, err instanceof Error ? err.message : "Error"); }
  }

  async function verify() {
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid code");
      setBackupCodes(data.backupCodes);
      setStatus("on");
      onToast(true, "2FA enabled successfully");
    } catch (err) { onToast(false, err instanceof Error ? err.message : "Error"); }
    finally { setVerifying(false); }
  }

  async function disable() {
    setDisabling(true);
    try {
      const res = await fetch("/api/admin/2fa/disable", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword, code: disableCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setStatus("off");
      setBackupCodes([]);
      setConfirmingDisable(false);
      setDisablePassword("");
      setDisableCode("");
      onToast(true, "2FA disabled");
    } catch (err) {
      onToast(false, err instanceof Error ? err.message : "Failed to disable 2FA");
    } finally {
      setDisabling(false);
    }
  }

  if (status === "loading") return null;

  return (
    <Card>
      <SectionHeader title="Two-Factor Authentication (2FA)" sub="Add an extra layer of security to your admin account." />

      {status === "on" && backupCodes.length === 0 && !confirmingDisable && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">2FA is enabled</p>
              <p className="text-xs text-emerald-600">Your account is protected with an authenticator app.</p>
            </div>
          </div>
          <button
            onClick={() => setConfirmingDisable(true)}
            className="shrink-0 rounded-lg border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition"
          >
            Disable 2FA
          </button>
        </div>
      )}

      {status === "on" && backupCodes.length === 0 && confirmingDisable && (
        <div className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-4">
          <p className="text-sm font-semibold text-danger">Confirm your identity to disable 2FA</p>
          <p className="text-xs text-muted">This makes your account less secure. Enter your password and a current authenticator code to continue.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className="flex-1 rounded-xl border border-surface-border bg-background px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full rounded-xl border border-surface-border bg-background px-3.5 py-2.5 text-center font-mono tracking-widest focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:w-32"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={disable}
              disabled={disabling || !disablePassword || disableCode.length < 6}
              className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-50 transition"
            >
              {disabling ? "Disabling…" : "Confirm disable"}
            </button>
            <button
              onClick={() => { setConfirmingDisable(false); setDisablePassword(""); setDisableCode(""); }}
              className="rounded-xl border border-surface-border px-4 py-2 text-sm text-muted hover:text-foreground transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === "off" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
            <svg className="h-4 w-4 shrink-0 mt-0.5 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            <p className="text-xs text-amber-700 dark:text-amber-400">2FA is not enabled. We strongly recommend enabling it for admin accounts.</p>
          </div>
          <button
            onClick={startSetup}
            className="self-start rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition"
          >
            Set up 2FA →
          </button>
        </div>
      )}

      {status === "setup" && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted">Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to confirm.</p>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="rounded-2xl border border-surface-border bg-white p-3 shrink-0">
              {otpauth && <QRCodeSVG value={otpauth} size={160} />}
            </div>
            <div className="flex flex-col gap-3 flex-1">
              <div>
                <p className="text-xs font-medium text-muted mb-1">Or enter the secret key manually:</p>
                <p className="rounded-xl bg-gray-900 px-3 py-2 font-mono text-sm text-emerald-400 break-all">{secret}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">6-digit verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-32 rounded-xl border border-surface-border bg-background px-3.5 py-2.5 text-center font-mono text-lg tracking-widest focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={verify}
                  disabled={token.length < 6 || verifying}
                  className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition"
                >
                  {verifying ? "Verifying…" : "Enable 2FA"}
                </button>
                <button
                  onClick={() => { setStatus("off"); setToken(""); }}
                  className="rounded-xl border border-surface-border px-4 py-2 text-sm text-muted hover:text-foreground transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup codes after just enabling */}
      {backupCodes.length > 0 && (
        <div className="mt-4 rounded-2xl border border-surface-border bg-surface p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Save your backup codes</p>
          <p className="mb-3 text-xs text-muted">Store these in a safe place. Each code can only be used once if you lose access to your authenticator app.</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {backupCodes.map((c) => (
              <code key={c} className="rounded-lg bg-gray-900 px-2.5 py-1.5 text-center font-mono text-xs text-emerald-400">{c}</code>
            ))}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(backupCodes.join("\n"));
              onToast(true, "Backup codes copied");
            }}
            className="mt-3 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition"
          >
            Copy all codes
          </button>
        </div>
      )}
    </Card>
  );
}

// ── Connected Accounts tab ────────────────────────────────────────────────────

function ConnectedTab({ accounts }: { accounts: ConnectedAccount[] }) {
  const googleLinked = accounts.some((a) => a.provider === "google");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <SectionHeader title="Connected Accounts" sub="Link OAuth providers for quick sign-in to the admin panel." />
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-surface-border p-4 transition hover:border-brand-300/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Google</p>
                <p className={`text-xs ${googleLinked ? "text-emerald-600" : "text-muted"}`}>{googleLinked ? "Connected" : "Not connected"}</p>
              </div>
            </div>
            {googleLinked ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Active
              </span>
            ) : (
              <a href="/api/auth/signin/google?callbackUrl=/admin" className="rounded-xl border border-surface-border bg-background px-4 py-1.5 text-xs font-semibold text-foreground hover:border-brand-400 hover:text-brand-600 transition">
                Connect
              </a>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Google OAuth Setup" sub="Steps to enable Google sign-in on accsmarkets.org." />
        <ol className="space-y-4">
          {[
            { step: "1", title: "Open Google Cloud Console", body: "Go to console.cloud.google.com → select or create your project." },
            { step: "2", title: "Configure OAuth Consent Screen", body: "APIs & Services → OAuth consent screen → External → fill App name, email, and domain accsmarkets.org." },
            { step: "3", title: "Create OAuth Credentials", body: "APIs & Services → Credentials → Create credentials → OAuth 2.0 Client ID → Web application." },
            { step: "4", title: "Add Authorized Redirect URI", code: "https://accsmarkets.org/api/auth/callback/google" },
            { step: "5", title: "Copy credentials to .env", code: `GOOGLE_CLIENT_ID="your-client-id"\nGOOGLE_CLIENT_SECRET="your-client-secret"` },
            { step: "6", title: "Restart the app server", body: "Restart the Node process to pick up new environment variables." },
          ].map((item) => (
            <li key={item.step} className="flex gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">{item.step}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {"body" in item && item.body && <p className="mt-0.5 text-xs text-muted">{item.body}</p>}
                {"code" in item && item.code && (
                  <div className="mt-1.5 rounded-xl bg-gray-900 px-4 py-2.5">
                    <pre className="overflow-x-auto text-xs text-emerald-400 whitespace-pre-wrap break-all">{item.code}</pre>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

// ── Sessions tab ──────────────────────────────────────────────────────────────

function SessionsTab({ sessions }: { sessions: ActiveSession[] }) {
  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function DeviceIcon({ ua }: { ua: string | null }) {
    const d = (ua ?? "").toLowerCase();
    if (d.includes("mobile") || d.includes("android") || d.includes("iphone") || d.includes("ipad")) {
      return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
    }
    return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <SectionHeader title="Active Sessions" sub={`${sessions.length} session${sessions.length !== 1 ? "s" : ""} found across all devices.`} />
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface">
              <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8" /></svg>
            </div>
            <p className="text-sm font-medium text-foreground">No sessions found</p>
            <p className="text-xs text-muted">Session tracking will appear here after login.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {sessions.map((s, i) => (
              <div key={s.id} className="flex items-center gap-4 py-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${i === 0 ? "bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400" : "bg-surface text-muted"}`}>
                  <DeviceIcon ua={s.userAgent} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {s.userAgent ? s.userAgent.split(" ").slice(0, 3).join(" ") : "Unknown device"}
                    </p>
                    {i === 0 && <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-600">Current</span>}
                  </div>
                  <p className="text-xs text-muted truncate">{s.ip ?? "Unknown IP"} · Last active {timeAgo(s.lastSeenAt)}</p>
                </div>
                <p className="text-xs text-muted shrink-0">{new Date(s.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title="Security Notice" sub="If you see an unrecognised session, change your password immediately." />
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <svg className="h-5 w-5 shrink-0 text-warning mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-xs text-warning/90 leading-relaxed">
            Admin sessions are not invalidated automatically. If your account was compromised, change your password and rotate the <code className="rounded bg-warning/10 px-1">NEXTAUTH_SECRET</code> environment variable.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ── Platform → General tab ─────────────────────────────────────────────────────

function GeneralTab({ settings, onToast }: { settings: SerializedSettings; onToast: (ok: boolean, msg: string) => void }) {
  const [form, setForm] = useState({
    siteName: settings.siteName,
    maintenanceMode: settings.maintenanceMode,
    registrationOpen: settings.registrationOpen,
    requireEmailVerification: settings.requireEmailVerification,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { onToast(false, "Save failed"); return; }
      onToast(true, "General settings saved");
    } catch { onToast(false, "Network error"); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <SectionHeader title="Site Identity" sub="Name and branding shown across the platform." />
        <Field label="Site name" hint="Displayed in browser tabs and system emails.">
          <Input value={form.siteName} onChange={(e) => setForm((f) => ({ ...f, siteName: e.target.value }))} required />
        </Field>
      </Card>
      <Card>
        <SectionHeader title="Access Controls" sub="Enable or disable core platform features." />
        <div className="divide-y divide-surface-border">
          <ToggleRow checked={form.maintenanceMode} onChange={(v) => setForm((f) => ({ ...f, maintenanceMode: v }))} label="Maintenance mode" description="Shows a maintenance page to all non-admin visitors." />
          <ToggleRow checked={form.registrationOpen} onChange={(v) => setForm((f) => ({ ...f, registrationOpen: v }))} label="Registration open" description="Allow new users to sign up." />
          <ToggleRow checked={form.requireEmailVerification} onChange={(v) => setForm((f) => ({ ...f, requireEmailVerification: v }))} label="Require email verification" description="Users must verify their email before accessing the platform." />
        </div>
      </Card>
      <div className="flex justify-end"><SaveButton saving={saving} /></div>
    </form>
  );
}

// ── Platform → Financial tab ───────────────────────────────────────────────────

function FinancialTab({ settings, onToast }: { settings: SerializedSettings; onToast: (ok: boolean, msg: string) => void }) {
  const [form, setForm] = useState({
    minDeposit: String(settings.minDeposit),
    minWithdrawal: String(settings.minWithdrawal),
    listingReviewHours: String(settings.listingReviewHours),
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { onToast(false, "Save failed"); return; }
      onToast(true, "Financial limits saved");
    } catch { onToast(false, "Network error"); } finally { setSaving(false); }
  }

  function numField(field: keyof typeof form, min = 0, step?: string) {
    return (
      <input type="number" value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
        className="h-10 w-40 rounded-xl border border-surface-border bg-background px-3.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm" min={min} step={step} required />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <SectionHeader title="Deposit & Withdrawal" sub="Minimum amounts users can move on the platform." />
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Min deposit (USD)" hint="Minimum amount a user can deposit.">
            {numField("minDeposit")}
          </Field>
          <Field label="Min withdrawal (USD)" hint="Minimum amount a user can withdraw.">
            {numField("minWithdrawal")}
          </Field>
        </div>
      </Card>
      <Card>
        <SectionHeader title="Listing Review" sub="Moderation timing for new listings." />
        <Field label="Listing review window (hours)" hint="Time allowed before a pending listing is auto-approved.">
          {numField("listingReviewHours", 1)}
        </Field>
      </Card>
      <div className="flex justify-end"><SaveButton saving={saving} /></div>
    </form>
  );
}

// ── Platform → Escrow tab ──────────────────────────────────────────────────────

function EscrowTab({ settings, onToast }: { settings: SerializedSettings; onToast: (ok: boolean, msg: string) => void }) {
  const [form, setForm] = useState({
    escrowTransferDays: String(settings.escrowTransferDays),
    disputeWindowHours: String(settings.disputeWindowHours),
    highValueEscrowThreshold: String(settings.highValueEscrowThreshold),
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { onToast(false, "Save failed"); return; }
      onToast(true, "Escrow settings saved");
    } catch { onToast(false, "Network error"); } finally { setSaving(false); }
  }

  function numField(field: keyof typeof form, min = 0) {
    return (
      <input type="number" value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
        className="h-10 w-40 rounded-xl border border-surface-border bg-background px-3.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm" min={min} required />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <SectionHeader title="Escrow Timings" sub="Time windows that govern buyer transfers and dispute eligibility." />
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Transfer deadline (days)" hint="Days buyer has to complete the account transfer.">
            {numField("escrowTransferDays", 1)}
          </Field>
          <Field label="Dispute window (hours)" hint="Hours after transfer to raise a dispute.">
            {numField("disputeWindowHours", 1)}
          </Field>
        </div>
      </Card>
      <Card>
        <SectionHeader title="High-Value Threshold" sub="Escrows above this amount receive extra scrutiny." />
        <Field label="High-value threshold (USD)" hint="Escrows above this are flagged as high-value.">
          {numField("highValueEscrowThreshold")}
        </Field>
      </Card>
      <div className="flex justify-end"><SaveButton saving={saving} /></div>
    </form>
  );
}

// ── Platform → Bank Transfers tab ─────────────────────────────────────────────

function TransfersTab({ settings, onToast }: { settings: SerializedSettings; onToast: (ok: boolean, msg: string) => void }) {
  const [form, setForm] = useState({
    bankTransferShortfallToleranceUsd: String(settings.bankTransferShortfallToleranceUsd),
    bankTransferShortfallTolerancePct: String(settings.bankTransferShortfallTolerancePct),
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { onToast(false, "Save failed"); return; }
      onToast(true, "Bank transfer settings saved");
    } catch { onToast(false, "Network error"); } finally { setSaving(false); }
  }

  function numField(field: keyof typeof form, step: string) {
    return (
      <input type="number" value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
        className="h-10 w-40 rounded-xl border border-surface-border bg-background px-3.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm" min={0} step={step} required />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <SectionHeader title="Shortfall Tolerance" sub="Accept bank transfers that are slightly under the expected amount." />
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Flat tolerance (USD)" hint="USD amount under expected that is still accepted.">
            {numField("bankTransferShortfallToleranceUsd", "0.01")}
          </Field>
          <Field label="Percentage tolerance (%)" hint="Percentage under expected that is still accepted.">
            {numField("bankTransferShortfallTolerancePct", "0.001")}
          </Field>
        </div>
        <div className="mt-5 rounded-xl border border-brand-200/40 bg-brand-50/40 p-4">
          <p className="text-xs font-medium text-brand-700">
            If both tolerances are set, a transfer is accepted if it satisfies <strong>either</strong> condition.
          </p>
        </div>
      </Card>
      <div className="flex justify-end"><SaveButton saving={saving} /></div>
    </form>
  );
}

// ── Crypto Wallets tab ────────────────────────────────────────────────────────

const NETWORKS = [
  { key: "walletAddressTrc20", label: "USDT TRC20 (Tron)", placeholder: "T...", badge: "TRX" },
  { key: "walletAddressBep20", label: "USDT BEP20 (BNB Smart Chain)", placeholder: "0x...", badge: "BSC" },
  { key: "walletAddressErc20", label: "USDT ERC20 (Ethereum)", placeholder: "0x...", badge: "ETH" },
  { key: "walletAddressMatic", label: "USDT POLYGON (Matic)", placeholder: "0x...", badge: "MATIC" },
  { key: "walletAddressSol",   label: "USDT SOL (Solana)", placeholder: "...", badge: "SOL" },
] as const;

function WalletsTab({ settings, onToast }: { settings: SerializedSettings; onToast: (ok: boolean, msg: string) => void }) {
  const [form, setForm] = useState({
    walletAddressTrc20: settings.walletAddressTrc20 ?? "",
    walletAddressBep20: settings.walletAddressBep20 ?? "",
    walletAddressErc20: settings.walletAddressErc20 ?? "",
    walletAddressMatic: settings.walletAddressMatic ?? "",
    walletAddressSol:   settings.walletAddressSol   ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function copyAddress(addr: string, key: string) {
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddressTrc20: form.walletAddressTrc20 || null,
          walletAddressBep20: form.walletAddressBep20 || null,
          walletAddressErc20: form.walletAddressErc20 || null,
          walletAddressMatic: form.walletAddressMatic || null,
          walletAddressSol:   form.walletAddressSol   || null,
        }),
      });
      if (!res.ok) { onToast(false, "Save failed"); return; }
      onToast(true, "Wallet addresses saved");
    } catch { onToast(false, "Network error"); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <SectionHeader
          title="Deposit Wallet Addresses"
          sub="These addresses are shown to users on the Manual USDT deposit page. Leave blank to hide a network."
        />
        <div className="flex flex-col gap-5">
          {NETWORKS.map(({ key, label, placeholder, badge }) => (
            <Field key={key} label={label}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold text-muted border border-surface-border">
                  {badge}
                </span>
                <Input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="pl-16 pr-10 font-mono text-xs"
                />
                {form[key as keyof typeof form] && (
                  <button
                    type="button"
                    onClick={() => copyAddress(form[key as keyof typeof form], key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-brand-500 transition"
                    title="Copy address"
                  >
                    {copied === key ? (
                      <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7"/></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    )}
                  </button>
                )}
              </div>
            </Field>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Instructions" sub="How wallet addresses are used on the platform." />
        <div className="space-y-2 text-sm text-muted">
          <p>• Users who select <strong className="text-foreground">Manual USDT deposit</strong> are shown the address for their chosen network.</p>
          <p>• Addresses are served from <code className="rounded bg-surface px-1 text-xs text-foreground">/api/wallet/deposit/wallet-config</code> (authenticated).</p>
          <p>• Leaving a network blank hides it from the deposit form — users will not see that option.</p>
          <p>• Always double-check addresses before saving — incorrect addresses result in permanently lost funds.</p>
        </div>
      </Card>

      <div className="flex justify-end">
        <SaveButton saving={saving} label="Save wallet addresses" />
      </div>
    </form>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AdminSettingsClient({ profile, settings }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const showToast = useCallback((ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <div className="flex gap-8">
      <AnimatePresence>
        {toast && <Toast ok={toast.ok} msg={toast.msg} />}
      </AnimatePresence>

      {/* Sidebar navigation */}
      <aside className="hidden md:block w-52 shrink-0">
        <div className="sticky top-6 flex flex-col gap-6">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted">{group.group}</p>
              <nav className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as TabId)}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-left transition-all ${
                        active ? "bg-brand-50 text-brand-600" : "text-muted hover:bg-surface hover:text-foreground"
                      }`}
                    >
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* Mobile tab selector */}
      <div className="md:hidden mb-4 w-full">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabId)}
          className="w-full rounded-xl border border-surface-border bg-background px-3.5 py-2.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm"
        >
          {NAV.map((group) =>
            group.items.map((item) => (
              <option key={item.id} value={item.id}>{group.group} → {item.label}</option>
            ))
          )}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "profile"   && <ProfileTab profile={profile} onToast={showToast} />}
            {activeTab === "security"  && <SecurityTab onToast={showToast} />}
            {activeTab === "connected" && <ConnectedTab accounts={profile.accounts} />}
            {activeTab === "sessions"  && <SessionsTab sessions={profile.activeSessions} />}
            {activeTab === "general"   && <GeneralTab settings={settings} onToast={showToast} />}
            {activeTab === "financial" && <FinancialTab settings={settings} onToast={showToast} />}
            {activeTab === "wallets"   && <WalletsTab settings={settings} onToast={showToast} />}
            {activeTab === "escrow"    && <EscrowTab settings={settings} onToast={showToast} />}
            {activeTab === "transfers" && <TransfersTab settings={settings} onToast={showToast} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
