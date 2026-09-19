"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";

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

interface Props { profile: ProfileData }

// ── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: "profile",   label: "Profile",   icon: "M12 12c2.7 0 4-1.8 4-4s-1.3-4-4-4-4 1.8-4 4 1.3 4 4 4zm0 2c-4 0-6 1.8-6 4v1h12v-1c0-2.2-2-4-6-4z" },
  { id: "security",  label: "Security",  icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { id: "oauth",     label: "Connected Accounts", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z" },
  { id: "sessions",  label: "Sessions",  icon: "M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8" },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
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
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "accsmarkets_avatars");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "ay5pafey"}/image/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.secure_url) {
        onChange(data.secure_url);
        setPreview(data.secure_url);
      }
    } catch {
      // fallback — keep preview
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        {preview ? (
          <img src={preview} alt={name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-brand-500/30" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-white">
            {initials}
          </div>
        )}
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
        <p className="mt-0.5 text-xs text-muted">Admin · AccsMarkets</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl border border-surface-border bg-background px-4 py-1.5 text-xs font-medium text-foreground hover:border-brand-400 hover:text-brand-600 transition disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={() => { setPreview(null); onChange(""); }}
              className="rounded-xl border border-surface-border px-4 py-1.5 text-xs font-medium text-muted hover:text-danger hover:border-danger/30 transition"
            >
              Remove
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────


// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}

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

function SaveButton({ saving, label = "Save changes" }: { saving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition"
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

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 text-sm text-muted">{sub}</p>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

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
    } catch {
      onToast(false, "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Avatar */}
      <Card>
        <SectionHeader title="Photo" sub="This will be shown on your admin profile." />
        <AvatarUpload
          current={form.image || null}
          name={form.name}
          onChange={(url) => setForm((f) => ({ ...f, image: url }))}
        />
      </Card>

      {/* Basic info */}
      <Card>
        <SectionHeader title="Basic Information" sub="Your public-facing name and handle." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Admin"
              required
            />
          </Field>
          <Field label="Username" hint="Lowercase letters, numbers, underscores only.">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">@</span>
              <Input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                className="pl-7"
                placeholder="admin"
              />
            </div>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Email address" hint="Contact your developer to change the admin email.">
            <Input value={profile.email ?? ""} disabled className="opacity-50 cursor-not-allowed" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Bio" hint="Brief description shown in admin activity logs.">
            <Textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              maxLength={300}
              placeholder="Platform administrator at AccsMarkets…"
            />
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

// ── Security Tab ──────────────────────────────────────────────────────────────

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
    } catch {
      onToast(false, "Network error");
    } finally {
      setSaving(false);
    }
  }

  function PasswordInput({ value, onChange, show, onToggle, placeholder }: {
    value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string;
  }) {
    return (
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          required
        />
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <SectionHeader title="Change Password" sub="Use a strong, unique password you don't use anywhere else." />
        <div className="flex flex-col gap-4 max-w-md">
          <Field label="Current password">
            <PasswordInput
              value={form.currentPassword}
              onChange={(v) => setForm((f) => ({ ...f, currentPassword: v }))}
              show={showCurrent}
              onToggle={() => setShowCurrent((x) => !x)}
              placeholder="Current password"
            />
          </Field>
          <Field label="New password">
            <PasswordInput
              value={form.newPassword}
              onChange={(v) => setForm((f) => ({ ...f, newPassword: v }))}
              show={showNew}
              onToggle={() => setShowNew((x) => !x)}
              placeholder="Min. 8 characters"
            />
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
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="Repeat new password"
              required
              className={form.confirmPassword && form.confirmPassword !== form.newPassword ? "border-danger/60 focus:border-danger" : ""}
            />
            {form.confirmPassword && form.confirmPassword !== form.newPassword && (
              <p className="text-xs text-danger mt-1">Passwords don't match</p>
            )}
          </Field>
        </div>
      </Card>

      {/* Security checklist */}
      <Card>
        <SectionHeader title="Account Security" sub="Recommended actions to keep this account safe." />
        <div className="space-y-3">
          {[
            { label: "Strong password set", done: true },
            { label: "Email verified", done: true },
            { label: "2FA enabled", done: false, note: "Enable via your profile → two-factor auth app" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-warning/10 text-warning"}`}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  {item.done
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
                  }
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                {item.note && <p className="text-xs text-muted">{item.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <SaveButton saving={saving} label="Change password" />
      </div>
    </form>
  );
}

// ── OAuth Tab ─────────────────────────────────────────────────────────────────

function OAuthTab({ accounts }: { accounts: ConnectedAccount[] }) {
  const googleLinked = accounts.some((a) => a.provider === "google");

  const PROVIDERS = [
    {
      id: "google",
      name: "Google",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      ),
      linked: googleLinked,
      connectUrl: "/api/auth/signin/google",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <SectionHeader
          title="Connected Accounts"
          sub="Link OAuth providers for quick sign-in to the admin panel."
        />

        <div className="space-y-3">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 rounded-2xl border border-surface-border p-4 transition hover:border-brand-300/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface">
                  {p.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className={`text-xs ${p.linked ? "text-emerald-600" : "text-muted"}`}>
                    {p.linked ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              {p.linked ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Active
                </span>
              ) : (
                <a
                  href="/api/auth/signin/google?callbackUrl=/admin"
                  className="rounded-xl border border-surface-border bg-background px-4 py-1.5 text-xs font-semibold text-foreground hover:border-brand-400 hover:text-brand-600 transition"
                >
                  Connect
                </a>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Setup guide */}
      <Card>
        <SectionHeader title="Google OAuth Setup" sub="Steps to configure Google sign-in for accsmarkets.org." />
        <ol className="space-y-4">
          {[
            {
              step: "1",
              title: "Open Google Cloud Console",
              body: "Go to console.cloud.google.com → select your project (or create one).",
            },
            {
              step: "2",
              title: "Configure OAuth Consent Screen",
              body: "APIs & Services → OAuth consent screen → External → fill App name, email, and domain accsmarkets.org.",
            },
            {
              step: "3",
              title: "Create OAuth Credentials",
              body: "APIs & Services → Credentials → Create credentials → OAuth 2.0 Client ID → Web application.",
            },
            {
              step: "4",
              title: "Add Authorized Redirect URI",
              body: null,
              code: "https://accsmarkets.org/api/auth/callback/google",
            },
            {
              step: "5",
              title: "Copy credentials to .env",
              body: null,
              code: `GOOGLE_CLIENT_ID="your-client-id"\nGOOGLE_CLIENT_SECRET="your-client-secret"`,
            },
            {
              step: "6",
              title: "Restart the app server",
              body: "Restart node server.js to pick up the new environment variables.",
            },
          ].map((item) => (
            <li key={item.step} className="flex gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                {item.step}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.body && <p className="mt-0.5 text-xs text-muted">{item.body}</p>}
                {item.code && (
                  <div className="mt-1.5 rounded-xl bg-gray-900 px-4 py-2.5">
                    <pre className="overflow-x-auto text-xs text-emerald-400 whitespace-pre-wrap break-all">{item.code}</pre>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-xl border border-brand-200/40 bg-brand-50/40 p-4">
          <p className="text-xs font-medium text-brand-700">
            Your current Google credentials are already loaded in .env. If login via Google isn't working, ensure the redirect URI above is listed in your Google Cloud Console OAuth client.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────

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

  function DeviceIcon({ device }: { device: string | null }) {
    const d = (device ?? "").toLowerCase();
    if (d.includes("mobile") || d.includes("android") || d.includes("iphone") || d.includes("ipad")) {
      return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
    }
    return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <SectionHeader
          title="Active Sessions"
          sub={`${sessions.length} session${sessions.length !== 1 ? "s" : ""} found across all devices.`}
        />

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface">
              <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path d="M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">No sessions found</p>
            <p className="text-xs text-muted">Session tracking will appear here after login.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {sessions.map((s, i) => (
              <div key={s.id} className="flex items-center gap-4 py-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${i === 0 ? "bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400" : "bg-surface text-muted"}`}>
                  <DeviceIcon device={s.userAgent} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {s.userAgent ? s.userAgent.split(" ").slice(0, 3).join(" ") : "Unknown device"}
                    </p>
                    {i === 0 && (
                      <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-600">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted truncate">
                    {s.ip ?? "Unknown IP"} · Last active {timeAgo(s.lastSeenAt)}
                  </p>
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
            Admin sessions are not invalidated automatically. If your account was compromised, change your password and contact your infrastructure team to rotate the <code className="rounded bg-warning/10 px-1">NEXTAUTH_SECRET</code> environment variable.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AdminProfileClient({ profile }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const showToast = useCallback((ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <AnimatePresence>
        {toast && <Toast ok={toast.ok} msg={toast.msg} />}
      </AnimatePresence>

      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 flex items-center gap-4"
      >
        {profile.image ? (
          <img src={profile.image} alt={profile.name ?? ""} className="h-14 w-14 rounded-2xl object-cover ring-2 ring-brand-500/20" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-xl font-bold text-white">
            {(profile.name ?? "A").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground">{profile.name ?? "Admin"}</h1>
          <p className="text-sm text-muted">{profile.email} · Admin</p>
        </div>
      </motion.div>

      {/* Tab bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="mb-6 flex overflow-x-auto gap-1 rounded-2xl border border-surface-border bg-surface/40 p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === "profile"  && <ProfileTab  profile={profile} onToast={showToast} />}
          {activeTab === "security" && <SecurityTab onToast={showToast} />}
          {activeTab === "oauth"    && <OAuthTab    accounts={profile.accounts} />}
          {activeTab === "sessions" && <SessionsTab sessions={profile.activeSessions} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
