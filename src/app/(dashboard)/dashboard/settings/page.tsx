import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { VERIFIED_BADGE_STYLE, getTrustTier } from "@/lib/constants";
import { AchievementBadgeShelf } from "@/components/ui/AchievementBadge";
import { CurrencySelector } from "@/components/settings/CurrencySelector";
import { cn } from "@/lib/utils";
import { isPendingSecret } from "@/lib/totp";
import { SettingsSection, AnimatedRing } from "./SettingsClient";
import { SignOutSection } from "@/components/settings/SignOutSection";
import { ArrowRight } from "lucide-react";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const [user, sessionCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session!.user.id },
      include: {
        subscriptionPlan: true,
        achievementBadges: true,
        twoFactorAuth: { select: { id: true, secret: true } },
        phoneVerification: { select: { phoneNumber: true, verifiedAt: true } },
      },
    }),
    prisma.activeSession.count({ where: { userId: session!.user.id } }),
  ]);

  const badge = VERIFIED_BADGE_STYLE[user.verifiedBadge];
  const tier = getTrustTier(user.trustScore);
  // A TwoFactorAuth row can exist in an unconfirmed "pending" state (setup started,
  // code never verified) — that must not count as enabled.
  const twoFaEnabled = Boolean(user.twoFactorAuth) && !isPendingSecret(user.twoFactorAuth!.secret);
  const initial = (user.username ?? user.name ?? user.email ?? "?")[0].toUpperCase();

  const securityScore =
    (twoFaEnabled ? 40 : 0) +
    (user.kycLevel === "ID_VERIFIED" ? 40 : user.kycLevel === "PHONE" ? 20 : user.kycLevel === "EMAIL" ? 10 : 0) +
    (user.emailVerified ? 20 : 0);

  return (
    <div className="flex flex-col gap-6">

      {/* Settings navigation grid */}
      <SettingsSection delay={0}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            {
              href: "/dashboard/settings",
              label: "Profile",
              sub: "Name, bio, avatar",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ),
              color: "bg-brand-100 dark:bg-brand-900/50 text-brand-600",
            },
            {
              href: "/dashboard/settings/security",
              label: "Security",
              sub: "2FA, password, WebAuthn",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              ),
              color: "bg-success/10 text-success",
            },
            {
              href: "/dashboard/settings/verification",
              label: "Verification",
              sub: "KYC level & identity",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                </svg>
              ),
              color: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
            },
            {
              href: "/dashboard/settings/sessions",
              label: "Sessions",
              sub: "Logged-in devices",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <path d="M8 21h8M12 17v4"/>
                </svg>
              ),
              color: "bg-surface-border text-muted",
            },
            {
              href: "/dashboard/settings/notifications",
              label: "Notifications",
              sub: "Email & push alerts",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              ),
              color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
            },
            {
              href: "/dashboard/settings/privacy",
              label: "Privacy",
              sub: "Visibility & data sharing",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              ),
              color: "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400",
            },
            {
              href: "/dashboard/settings/connected-accounts",
              label: "Connected",
              sub: "Google & linked accounts",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
              ),
              color: "bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400",
            },
            {
              href: "/dashboard/settings/data",
              label: "Data & Privacy",
              sub: "Export or delete account",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                </svg>
              ),
              color: "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
            },
          ].map(({ href, label, sub, icon, color }) => (
            <Link key={href} href={href}>
              <div className="flex flex-col gap-2 rounded-xl border border-surface-border bg-background p-3.5 hover:border-brand-300 hover:shadow-sm transition cursor-pointer h-full">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", color)}>
                  {icon}
                </div>
                <div className="mt-0.5">
                  <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
                  <p className="text-[11px] text-muted mt-0.5 leading-snug">{sub}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </SettingsSection>

      {/* Profile banner */}
      <SettingsSection delay={0.05}>
        <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-gradient-to-r from-brand-500/10 via-brand-400/5 to-transparent">
          <div className="flex flex-wrap items-center gap-5 p-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-3xl font-bold text-white shadow-lg">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt={user.name ?? ""} className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  initial
                )}
              </div>
              {badge.visible && (
                <span className={cn("absolute -bottom-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow", badge.className)}>
                  {badge.label}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{user.name ?? user.username ?? "Your Profile"}</h1>
                {user.username && (
                  <span className="text-sm text-muted">@{user.username}</span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", tier.className)}>
                  {tier.label} · {user.trustScore}/100
                </span>
                <span className="rounded-full border border-surface-border bg-surface px-2.5 py-0.5 text-xs text-muted">
                  {user.subscriptionPlan?.name ?? "FREE"} plan
                </span>
                <span className="rounded-full border border-surface-border bg-surface px-2.5 py-0.5 text-xs text-muted">
                  {user.kycLevel.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Animated security score ring */}
            <div className="flex shrink-0 flex-col items-center gap-1">
              <AnimatedRing score={securityScore} />
              <p className="text-[10px] text-muted">Security</p>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Security quick tiles */}
      <SettingsSection delay={0.08}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/dashboard/settings/security">
          <Card className={cn("flex flex-col gap-2 transition hover:border-brand-300", twoFaEnabled ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5")}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Two-Factor Auth</p>
              <div className={cn("flex h-6 w-6 items-center justify-center rounded-full", twoFaEnabled ? "bg-success/20 text-success" : "bg-warning/20 text-warning")}>
                {twoFaEnabled ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                )}
              </div>
            </div>
            <p className={cn("text-lg font-bold", twoFaEnabled ? "text-success" : "text-warning")}>
              {twoFaEnabled ? "Enabled" : "Disabled"}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              {twoFaEnabled ? "Your account is protected" : "Enable for extra security"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </p>
          </Card>
        </Link>

        <Link href="/dashboard/settings/verification">
          <Card className="flex flex-col gap-2 transition hover:border-brand-300">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Verification</p>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
            </div>
            <p className="text-lg font-bold text-foreground">{user.kycLevel.replace("_", " ")}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              {user.kycLevel === "ID_VERIFIED" ? "Fully verified" : "Upgrade for higher limits"}
              {user.kycLevel !== "ID_VERIFIED" && <ArrowRight className="h-3.5 w-3.5" aria-hidden />}
            </p>
          </Card>
        </Link>

        <Link href="/dashboard/settings/sessions">
          <Card className="flex flex-col gap-2 transition hover:border-brand-300">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Active Sessions</p>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-border text-muted">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <path d="M8 21h8M12 17v4"/>
                </svg>
              </div>
            </div>
            <p className="text-lg font-bold text-foreground">{sessionCount}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              Manage logged-in devices
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </p>
          </Card>
        </Link>
      </div>
      </SettingsSection>

      {/* Profile form */}
      <SettingsSection delay={0.15}>
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/50 text-brand-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Account Details</h2>
            <p className="text-xs text-muted">Update your public profile</p>
          </div>
        </div>
        <ProfileForm
          initialName={user.name ?? ""}
          initialUsername={user.username ?? ""}
          initialBio={user.bio ?? ""}
          initialSocialLinks={(user.socialLinks as Record<string, string> | null) ?? {}}
          initialImage={user.image}
          initialCountryCode={user.countryCode ?? null}
          initialPhone={user.phoneVerification?.phoneNumber ?? null}
          phoneVerified={Boolean(user.phoneVerification?.verifiedAt) && (user.kycLevel === "PHONE" || user.kycLevel === "ID_VERIFIED")}
        />
      </Card>
      </SettingsSection>

      {/* Achievements */}
      {user.achievementBadges.length > 0 && (
        <SettingsSection delay={0.22}>
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Achievements</h2>
              <p className="text-xs text-muted">{user.achievementBadges.length} badge{user.achievementBadges.length !== 1 ? "s" : ""} earned</p>
            </div>
          </div>
          <AchievementBadgeShelf badges={user.achievementBadges.map((b) => b.badge)} />
        </Card>
        </SettingsSection>
      )}

      {/* Account status */}
      <SettingsSection delay={0.28}>
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-border text-muted">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Account Status</h2>
            <p className="text-xs text-muted">Read-only account info</p>
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4">
          {[
            { label: "Email", value: user.email, cls: "text-foreground" },
            { label: "Plan", value: user.subscriptionPlan?.name ?? "FREE", cls: "text-foreground" },
            { label: "Trust score", value: `${user.trustScore}/100 · ${tier.label}`, cls: tier.className },
            { label: "Verified badge", value: badge.visible ? badge.label : "None", cls: badge.className || "text-muted" },
            { label: "Account status", value: user.isBanned ? "Banned" : "Active", cls: user.isBanned ? "text-danger font-semibold" : "text-success font-semibold" },
            { label: "Member since", value: new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" }), cls: "text-muted" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="flex flex-col gap-0.5 rounded-xl border border-surface-border bg-surface px-3 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted/70">{label}</dt>
              <dd className={cn("text-sm font-medium", cls)}>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      </SettingsSection>

      {/* Display currency */}
      <SettingsSection delay={0.34}>
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Display Currency</h2>
            <p className="text-xs text-muted">Used for showing prices throughout the site</p>
          </div>
        </div>
        <CurrencySelector initial={user.displayCurrency ?? "USD"} />
      </Card>
      </SettingsSection>

      {/* Sign out */}
      <SettingsSection delay={0.4}>
        <SignOutSection />
      </SettingsSection>
    </div>
  );
}
