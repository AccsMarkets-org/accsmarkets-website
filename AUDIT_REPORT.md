# AccsMarkets — Complete Deep-Dive Audit Report

**Date:** 2026-09-16
**Scope:** Full codebase (read-only analysis, no code changes made) — 1657-line Prisma schema (75 models), ~223 API route files, 112 pages across public/dashboard/admin, 133 shared components, all `src/lib` business logic, all deployment/config/scripts.
**Method:** Parallel deep-read audit across 6 top-level workstreams (which further split into 17 total sub-audits) — database, public frontend, dashboard frontend, admin panel + authorization, core business logic, integrations/background jobs, and tests/config/cross-cutting concerns. Every finding below is backed by a specific file path and, wherever practical, a line number, verified by actually reading the code — not inferred from filenames or page titles.

> **Read this first:** `README.md` and `MILESTONE_2_PLAN.md` are **stale and materially wrong** about what's built. They describe dispute resolution, TOTP 2FA, WebAuthn, achievement badges, reviews, KYC, and subscriptions as "deferred to Milestone 2." **All of these are fully implemented in the current code.** Conversely, the README claims hCaptcha protects signup — it does not; verification is hard-stubbed to always pass. Do not use the README as a source of truth for feature status; this document supersedes it.

---

## A. Executive Summary

**What this project is:** A production, feature-rich escrow marketplace for buying/selling social media accounts (Next.js 14 App Router, TypeScript, Prisma/MySQL, NextAuth, Socket.IO, custom `server.js`). It is materially larger and more complete than its own README suggests — 75 database models, 223 API routes, a full admin console (42 pages), a full user dashboard (31 pages), a full public marketing/SEO site (39 pages), a developer API portal, an AI blog-automation pipeline, and a multi-rail payment system (crypto via NOWPayments, manual USDT, bank wire, Stripe card scaffolding).

**Overall maturity: mid-to-late-stage production build with a few load-bearing gaps.** The core money-moving path (list → offer → fund escrow → submit credentials → verify → transfer → complete/dispute → payout) is real, transactionally sound in the places that matter most, and thoroughly built out on both client and server. The weak points are concentrated in **authorization depth** (admin RBAC and 2FA), a **handful of specific broken flows** (bank-wire withdrawal, hCaptcha, one escrow state-machine bypass), and **operational hygiene** (zero automated tests, stale deployment configs, silent-failure logging gaps).

**Strongest areas:**
- The escrow state machine and money-moving transactions (fund, complete, cancel, dispute-resolve) are correctly wrapped in `$transaction` with in-transaction re-checks against race conditions.
- Dispute resolution is a complete, phased system (evidence → review → mediation/ruling → appeal) with a full audit trail — despite docs claiming it doesn't exist yet.
- The listing creation wizard, escrow detail page, and messaging system are the most thoroughly built features in the app — real-time, validated, error-handled, no shortcuts found.
- Credential encryption (AES-256-GCM) is implemented correctly with no hardcoded keys and proper buyer/status-gated access.
- 92% of API routes that accept a JSON body validate it with Zod.

**Weakest areas:**
- **Admin authorization has a critical hole**: admin password login silently bypasses TOTP 2FA entirely, and the granular staff-permission system (`StaffRole`) is enforced on well under 20% of the routes it should gate — a staff account scoped to "blog only" can, today, ban users, move money, and change platform settings.
- **hCaptcha is a no-op** despite real credentials being configured — signup has zero actual bot protection, and the frontend `<Captcha>` component isn't even rendered on the register page.
- **Bank-wire withdrawal is completely non-functional** — a payload/schema mismatch means every submission gets HTTP 400. This is a real, live money-feature gap, not a cosmetic bug.
- **Zero automated tests** exist anywhere in the codebase for a live financial marketplace.
- Deployment configuration is split across three contradictory pictures (Windows/PM2 — the real one; Docker Compose; Vercel) and two of the three are confirmed stale/dead, including a fully-configured AI blog pipeline with no working trigger.

**Biggest missing functionality:** Subscription cancellation/downgrade (no path exists at all once a user upgrades), enforced granular admin permissions, working bank-wire withdrawal, real bot protection on signup, and an automated test suite.

**Biggest production risks (ranked):**
1. Admin accounts effectively cannot be protected by 2FA against password compromise (auth.ts:113).
2. Any admin-role staff account has unrestricted access regardless of the permissions the owner assigned them.
3. Wallet debit paths (escrow purchase, withdrawal approval) use read-then-write balance arithmetic instead of atomic decrements — a real (if unconfirmed-in-production) double-spend race under concurrent load.
4. Signup has no working bot/abuse protection.
5. Bank-wire withdrawals silently fail for every user who tries them.

---

## B. Project Architecture

- **Framework:** Next.js 14 (App Router), TypeScript, custom Node server (`server.js`) — **not** Vercel serverless, because Socket.IO requires a long-lived process (this is explicit and correct in the README, but contradicted by a stale `vercel.json`).
- **Database:** MySQL 8.4 via Prisma ORM, 75 models, single "baseline" migration (no incremental history retained).
- **Auth:** NextAuth with a credentials provider (email/password + TOTP), Google OAuth, and a separate WebAuthn/passkey credentials provider scoped to the admin subdomain.
- **Real-time:** Socket.IO, mounted on the same HTTP server as Next.js (`server.js` + `socket-server.js`), used for messaging, escrow status pushes, and admin live views. Explicitly designed to **no-op safely** if disconnected — REST is the source of truth, sockets are a convenience layer only.
- **Payments:** NOWPayments (crypto, HMAC-SHA512-verified, idempotent), manual USDT (admin-confirmed), bank wire (admin-confirmed, receipt/invoice generation), Stripe (fully coded but the `stripe` npm package isn't installed and no keys are configured — completely inert today).
- **Storage:** Google Drive (primary) with Cloudinary fallback for uploads; Google Drive also used for hourly/daily DB backup uploads.
- **Background processing:** BullMQ + Redis is fully optional — the app is designed to gracefully fall back to direct/synchronous processing when Redis is absent (which it currently is in production). A separate `worker.js` process exists for when Redis *is* configured, but has no process-supervisor entry for the real (non-Docker) deployment.
- **Admin subdomain routing:** `admin.accsmarkets.org` and `maintenance.accsmarkets.org` are handled by host-based logic in `src/middleware.ts`, rewriting to `/admin/*` and `/maintenance` respectively.
- **Real deployment topology (verified this session and by the audit):** PM2 process manager + Windows Task Scheduler watchdog scripts on a bare Windows Server VM, fronted by a Cloudflare Tunnel. `docker-compose.yml`/`Dockerfile` and `vercel.json` are both **stale, unused artifacts** of alternate deployment plans that were never kept in sync with reality (confirmed: `docker-compose.yml` references the wrong encryption-key env var name; `vercel.json`'s cron targets a route that only accepts `POST`, while Vercel Cron calls via `GET`, and relies on a `CRON_SECRET` that's never set).
- **Third-party content platforms:** Opinly (external CMS for `/resources/*`, Svix-signature-verified webhook) and a custom "AutoSEO" blog-sync webhook — two distinct content pipelines, separate from the in-house AI blog-generation system (Groq/Grok/OpenAI/Gemini fallback chain).

---

## C. Complete Existing Feature List

Legend: ✅ Fully Implemented · 🟡 Partial · 🔴 Missing · ⚠️ Implemented but Broken · 🧪 Prototype/Mock · 🛠 Needs Improvement

| Module | Feature | Status | Frontend | Backend | Database | Prod Ready | Notes |
|---|---|---|---|---|---|---|---|
| **Auth** | Email/password login + lockout | ✅ | `login/page.tsx` | `src/lib/auth.ts` | `User`, `LoginAttempt` | Y | 5-attempt/15-min lockout via DB table, real |
| Auth | Google OAuth | ✅ | login/register pages | NextAuth google provider | `Account` | Y | Standard, auto-verifies |
| Auth | Email verification (mandatory) | ✅ | `verify-email/page.tsx` | `api/auth/verify-email` | `VerificationToken` | Y | Real token flow |
| Auth | TOTP 2FA (setup/verify/disable) | ✅ | `settings/security/page.tsx` | `api/auth/2fa/*`, `src/lib/totp.ts` | `TwoFactorAuth` | Y | Real RFC 4226/6238 math. **Enforced at login for regular users only — bypassed entirely for ADMIN role (see Security §I)** |
| Auth | WebAuthn/passkey (admin only) | ✅ | `admin/login/page.tsx` | inline in `src/lib/auth.ts`, `api/admin/webauthn/*` | `WebAuthnCredential` | Y | README wrongly calls this "Milestone 2" |
| Auth | Password reset | ✅ | `forgot-password`, `reset-password` | `api/auth/forgot-password`, `reset-password` | `VerificationToken` | Y | Anti-enumeration (same response either way); ⚠️ client silently shows success even on fetch failure/rate-limit (no `res.ok` check) |
| Auth | hCaptcha bot protection | ⚠️ **Broken** | `Captcha.tsx` (real widget, real keys) | `src/lib/hcaptcha.ts` | — | **N** | `verifyCaptcha()` hardcoded `return true`. Register page never even renders `<Captcha>`. Zero real bot protection despite configured keys |
| **Onboarding** | Buyer/seller intent wizard | ✅ | `onboarding/page.tsx` | `api/onboarding` | `User` | Y | Deliberately fails open (navigates on save error) |
| **Listings** | Create (3-step wizard) | ✅ | `ListingWizard.tsx` | `api/listings` | `Listing` | Y | Most complete flow in the app; real ownership verification, auto-moderation, draft autosave |
| Listings | Ownership verification (YouTube/Telegram API) | ✅ | `OwnershipVerifier.tsx` | `api/listings/verify/*` | — | Y | Manual platforms → admin review flag |
| Listings | Auto-moderation scoring | ✅ | — | `src/lib/moderation.ts` | `Listing.status` | Y | Blocks ≥40 score, re-runs on every edit |
| Listings | Edit (5-tab form, forces re-review) | ✅ | `EditListingForm.tsx` | `api/listings/[id]` PATCH | `Listing` | Y | |
| Listings | Delete | ✅ | listings page | `api/listings/[id]` DELETE | `Listing` | Y | Only DRAFT/PENDING/REJECTED deletable |
| Listings | Admin approve/reject/suspend | ✅ | `admin/listings/[id]` | `api/admin/listings/[id]` | `Listing`, `AdminAuditLog` | Y | Transactional, audited, IndexNow ping on approve |
| Listings | Browse/search/filter | ✅ | `listings/page.tsx`, `ListingFilters.tsx` | direct Prisma (server component) | `Listing` | Y | Private listings correctly excluded from public browse |
| Listings | Plan-based listing limits | ✅ | — | `api/listings` create-gate | `SubscriptionPlan.listingLimit` | Y | Enforced against live DB value, not the display-only `plan-features.ts` |
| Listings | Private listings + invites | ✅ | `PrivateListingInvites.tsx` | `api/listings/[id]/invite` | `PrivateListingInvite` | Y | Full GET/POST/DELETE |
| Listings | Auctions (bidding) | ✅ | listing detail | `api/listings/[id]/bids` | `AuctionBid` | Y | No DB-level guard against tied top bids (app-logic only) |
| Listings | Saved searches + alerts | ✅ | `saved-searches/page.tsx` | `api/saved-searches` | `SavedSearch` | Y | |
| Listings | Watchlist | ✅ | `watchlist/page.tsx` | direct Prisma | `Watchlist` | Y | |
| Listings | "Wanted" buy-requests | ✅ | `wanted/page.tsx`, `wanted/new` | `api/wanted-listings` | `WantedListing` | Y | |
| **Offers** | Send/accept/decline/counter/cancel | ✅ | `OfferList.tsx`, `MakeOfferForm.tsx` | `api/offers`, `api/offers/[id]` | `Offer` | Y | Accept auto-declines other pending offers |
| Offers | 72h auto-expiry | 🟡 | — | lazy-check on read + `api/internal/sweep` | `Offer` | Partial | Lazy-checked on every read/action; the proactive sweep endpoint exists and is production-ready code but **is not confirmed to be running on any active schedule** on the live box (see §J) |
| Offers | Chat-embedded offers | ✅ | `ChatOfferCard`, `SendOfferModal` (in `MessageThread.tsx`) | `api/messages/chat-offer*` | `Message` | Y | |
| **Escrow** | Full state machine | 🟡 | `EscrowStepper`, `EscrowActions` | `src/lib/escrow-state-machine.ts` + 10 routes | `Escrow` | Mostly Y | **One route bypasses the state machine entirely** (see §E) |
| Escrow | Fund/checkout | ✅ | `CheckoutForm.tsx` | `api/escrows` POST | `Escrow`, `Transaction` | Y | Transactional, in-tx re-check |
| Escrow | Credential submit + AES-256-GCM handoff | ✅ | `EscrowActions.tsx` | `api/escrows/[id]/submit` | `Escrow` | Y | Correct crypto, buyer/status-gated decrypt |
| Escrow | Manager-add flow (YouTube-style transfer) | ✅ | `EscrowActions.tsx` | `submit-manager-add`, `add-buyer-manager`, `confirm-handover` | `Escrow`, `EscrowManagerEmail` | Y | |
| Escrow | Trustless admin handover | ✅ | admin escrow page | `api/admin/escrows/[id]/execute-trustless-handover` | `Escrow` | Y | |
| Escrow | Complete | ✅ | `EscrowActions.tsx` | `api/escrows/[id]/complete` | `Escrow`, `Transaction` | Y | Transactional double-release guard |
| Escrow | Cancel (FUNDED/AWAITING_MANAGER_ADD) | ✅ | `EscrowActions.tsx` | `api/escrows/[id]/cancel` | `Escrow`, `Transaction` | Y | Full refund incl. fee, correct |
| Escrow | Split-payment milestones | ⚠️ **Broken transition** | `MilestoneChecklist`, `ProposeMilestones` | `api/escrows/[id]/milestones/*` | `EscrowMilestone` | N | Release route sets `VERIFIED→COMPLETED` directly, bypassing `assertTransition` — the one confirmed state-machine violation |
| Escrow | Dispute (open/evidence/mediation/phases/ruling) | ✅ | `DisputeEvidenceForm`, admin dispute pages | `api/escrows/[id]/dispute*`, `api/admin/disputes/*` | `Dispute`, `DisputeEvidence`, `DisputeTimeline` | Y | Complete phased system; README wrongly calls it unbuilt. Gap: deadlines not auto-swept |
| Escrow | Reviews | ✅ | `ReviewForm.tsx` | `api/reviews` | `Review` | Y | `@@unique([escrowId,reviewerId])` prevents duplicates |
| Escrow | Trust score (+5 on completion) | 🛠 | — | 3+ completion routes | `User.trustScore` | Y but one-directional | No penalty path for disputes lost/cancellations |
| Escrow | Achievement badges | ✅ | `AchievementBadgeShelf` | `src/lib/badges.ts` | `UserAchievementBadge` | Y | Real aggregation, seller-only by design |
| **Messaging** | Real-time DMs | ✅ | `MessageThread.tsx` (1474 lines), `ConversationList.tsx` | `api/messages*` | `Message` | Y | REST-first, socket is best-effort convenience only — no message loss on disconnect |
| Messaging | Escrow chat | ✅ | embedded in escrow detail | `api/escrows/[id]/messages` | `Message` | Y | |
| Messaging | File attachments | ✅ | `MessageThread.tsx` | `api/upload/message` | — | Y | |
| Messaging | Admin canned responses | ✅ | admin support tools | `api/admin/canned-responses` | `CannedResponse` | Y | |
| **Notifications** | In-app + push (web + Expo mobile) | ✅ | bell dropdown, `notifications/page.tsx` | `src/lib/notifications.ts` (36 call sites) | `Notification`, `PushSubscription` | Y | DB-first, survives offline. Gaps: offer-cancel, withdrawal-request, deposit-creation don't notify |
| **Wallet** | Balance, transaction history | ✅ | `WalletClient.tsx` | direct Prisma | `Transaction` | Y | |
| Wallet | Crypto deposit (NOWPayments) | ✅ | `DepositWidget.tsx` | `api/wallet/deposit`, `webhooks/nowpayments` | `CryptoWallet` | Y | HMAC-SHA512 verified, idempotent |
| Wallet | Manual USDT deposit | ✅ | `DepositWidget.tsx` | `api/wallet/deposit/manual` + admin confirm | `CryptoWallet` | Y | Idempotent, rate-limited |
| Wallet | Bank-wire deposit | ✅ | `DepositWidget.tsx`, order tracking page | `api/wallet/deposit/bank-transfer/*` | `BankTransferOrder` | Y | Mark-sent, invoice, admin verify all real |
| Wallet | Card deposit (Stripe) | ⚠️ **Inert** | Elements form (hidden if no key) | `api/wallet/deposit/card`, `webhooks/stripe` | `FiatPayment` | **N** | Fully coded but `stripe` package not installed, no keys — always 503 |
| Wallet | Crypto withdrawal | ✅ | `withdraw/page.tsx` | `api/wallet/withdraw` | `Transaction` | Y | Rate-limited 3/hr; debit deferred to admin approval (transactional) |
| Wallet | Bank-wire withdrawal | ⚠️ **Completely broken** | `withdraw/page.tsx` bank tab | `api/wallet/withdraw` (same route) | `Transaction` | **N** | Payload the form sends never matches the schema the route validates against — every submission is HTTP 400 |
| Wallet | Admin deposit/withdrawal approval | ✅ | admin deposits/withdrawals pages | `api/admin/deposits/[id]`, `withdrawals/[id]` | `Transaction`, `AdminAuditLog` | Y | Transactional, idempotent, audited |
| **Subscriptions** | View plans, upgrade (balance or crypto) | ✅ | `settings/subscription`, `SubscribePlanGrid.tsx` | `api/payments/subscribe*` | `SubscriptionPlan` | Y | |
| Subscriptions | Cancel / downgrade | 🔴 **Missing** | none | none | — | N | No path exists anywhere once upgraded (see §D) |
| **Organizations** | Create, invite/remove members, KYB | ✅ | `organization/page.tsx` | `api/organizations/*` | `Organization`, `OrganizationMember`, `KybSubmission` | Y | Backend member role-change route exists with **no UI to trigger it** |
| **Referrals** | Code, milestones, rewards | ✅ | `referrals/page.tsx` | `api/referrals` | `ReferralCode`, `Referral` | Y | |
| **Settings** | Profile, currency, sign-out | ✅ | `settings/page.tsx` | `api/user/me` | `User` | Y | |
| Settings | Notification preferences | ✅ | `settings/notifications` | `api/settings/notifications` | `User` | Y | Rare example of a proper loading+error UI |
| Settings | Privacy (GDPR export/erasure) | ✅ | `settings/privacy` | `api/user/export-data`, `request-deletion` | `DataExportRequest`, `DataErasureRequest` | Y | |
| Settings | Sessions (list/revoke) | ✅ | `settings/sessions` | `api/auth/sessions*` | `ActiveSession` | Y | Confirm-dialog gated revoke-all |
| Settings | Identity verification (email + KYC upload) | 🟡 | `settings/verification` | `api/verification/email/*`, `api/kyc/verify` | `KycSubmission` | Partial | Email+ID/selfie fully built; **the "phone" step is dead code** — real phone-verify endpoints exist but are never called from this page; the KYC level is actually advanced by email alone |
| **Developer Portal** | API keys, webhooks, third-party apps | ✅ | `developer/page.tsx`, `DeveloperDashboard.tsx` | `api/developer/*`, `api/apps*` | `ApiKey`, `WebhookEndpoint`, `AppListing` | Y | Fully real CRUD |
| **Admin — Users** | Ban/unban, balance adjust, trust override, badges | ✅ | `admin/users/*` | `api/admin/users/[id]` | `User`, `AdminAuditLog` | Y | Audited, but **not permission-gated** (see §I) |
| Admin — Listings | Moderation queue | ✅ | `admin/listings/*` | `api/admin/listings/*` | `Listing` | Y | |
| Admin — Escrows | Monitor, manual verify/transfer | ✅ | `admin/escrows/*` | `api/admin/escrows/*` | `Escrow` | Y | |
| Admin — Disputes | Full mediation/ruling console | ✅ | `admin/disputes/*` | `api/admin/disputes/*` | `Dispute` | Y | |
| Admin — Finance | Deposits, withdrawals, bank accounts, pricing | ✅ | `admin/deposits`, `withdrawals`, `bank-accounts`, `pricing` | `api/admin/*` | `Transaction`, `PlatformBankAccount` | Y | Functional, but **not permission-gated**; bank-account changes **unaudited** |
| Admin — Staff/RBAC | Staff accounts + permission assignment | 🛠 | `admin/staff` | `api/admin/staff/*` | `StaffRole`, `User.staffRoleId` | Y (UI) / **N** (enforcement) | UI is real; the permissions it assigns are enforced by <20% of routes |
| Admin — Settings | Platform config, maintenance mode, feature flags | ✅ | `admin/settings`, `maintenance`, `feature-flags` | `api/admin/settings`, `maintenance`, `feature-flags` | `PlatformSettings`, `FeatureFlag` | Y (UI) | Settings/feature-flag changes **unaudited**; `FeatureFlag` gates nothing (see §F) |
| Admin — Content | Blog CMS + AI generation, announcements, email templates | ✅ | `admin/blog`, `announcements`, `email-templates` | `api/admin/blog/*` | `BlogPost`, `Announcement`, `EmailTemplate` | Y | Real AI pipeline; **no working scheduled trigger** on the live deployment (see §J) |
| Admin — Audit | Audit log viewer | 🛠 | `admin/audit-log` | direct Prisma | `AdminAuditLog` | Y (UI), Partial (data) | Viewer works; underlying log only captures ~50% of mutating admin actions |
| **Public site** | Marketing, browse, blog, legal, SEO landing pages | ✅ | 39 pages under `(public)` | mostly direct Prisma (server components) | various | Y | Uniformly well-built; only one is an intentional stub (Careers, honestly labeled "not hiring yet") |
| Public — Status page | System status | ⚠️ **Misleading** | `status/page.tsx` | `api/health` | — | N/A | 4 "service" rows all mirror one single aggregate DB check — can show false "Operational" for Socket.IO/escrow if only DB is actually up |
| Public — API docs | Developer docs page | ⚠️ **Mostly fictional** | `docs/page.tsx` | — | — | N/A | Documents 7 `/v1/*` endpoints; 5 of 7 have no backing route |
| **Backups** | Hourly DB dump → Google Drive | ✅ (fixed this session) | — | `scripts/backup-to-drive.ts` | — | Y | Was not scheduled at all before this session; now registered and verified working |
| Background — Sweep | Offer expiry, escrow flags, referral rewards, saved-search alerts | 🟡 | — | `api/internal/sweep`, `scripts/sweep.mjs` | various | **Unconfirmed running** | Code is production-ready; **no scheduled task for it currently exists on the live box** (verified via `schtasks` this session) |
| Background — AI blog cron | Scheduled blog generation | 🔴 **No working trigger** | — | `api/cron/blog` | `BlogTopicQueue`, `BlogAutomationLog` | N | Fully coded/configured; only trigger (`vercel.json`) is dead on this deployment target |
| Testing | Automated tests (unit/integration/e2e) | 🔴 **Missing entirely** | — | — | — | N | Zero test files, zero test framework in `package.json`, confirmed by direct search |

---

## D. Missing Features

| Priority | Module | Missing Feature | Current State | Required Work | Business Impact |
|---|---|---|---|---|---|
| Critical | Admin Auth | Enforce 2FA on admin password login | 2FA exists but is hardcoded to skip for `role === "ADMIN"` | 1-line-cause, real-effort fix: remove the `user.role !== "ADMIN"` short-circuit in `src/lib/auth.ts`, verify admin login page's existing TOTP UI still matches | Highest-privilege accounts are one leaked password away from full compromise |
| Critical | Admin RBAC | Enforce `StaffRole` permissions across all sensitive routes | Permission catalog + UI exist; enforcement is opt-in per-route and missing on most financial/user-management routes | Systematically pass the correct `Permission` argument to `requireAdmin()` in every route listed in §I; consider making it required (no-arg call becomes a compile error) | Any admin-role staff account has unrestricted access regardless of assigned scope |
| Critical | Wallet | Fix bank-wire withdrawal | Form submits fields the shared endpoint's schema doesn't accept; always 400s | Either branch `api/wallet/withdraw` on `method`, or split into a dedicated bank-withdrawal endpoint/schema mirroring the deposit side's pattern | Users literally cannot withdraw via bank wire; a shipped, discoverable feature silently fails every time |
| Critical | Auth | Real hCaptcha verification | `verifyCaptcha()` hardcoded to always pass; frontend widget never rendered on register | Remove the stub, call the real hCaptcha siteverify API; render `<Captcha>` in `register/page.tsx` and wire `captchaToken` state | Signup has zero bot/abuse protection despite the operator believing otherwise |
| High | Subscriptions | Cancel / downgrade | Only upgrade flows exist; the only "Cancel" button aborts an in-progress crypto payment, not the subscription | New `POST /api/payments/cancel` (or similar) that reverts `subscriptionPlanId` to Free at next renewal boundary; UI in `settings/subscription` | Users on a paid plan have no self-service way to stop paying/downgrade — support burden + potential billing disputes |
| High | Operations | Register the sweep task on the live server | `api/internal/sweep` + `scripts/sweep.mjs` are production-ready; no scheduled task currently exists (confirmed via `schtasks` this session) | Register a Windows Scheduled Task (mirroring the pattern used for the hourly backup fixed this session) hitting the sweep endpoint every 10-15 min | Offer 72h expiry, escrow transfer-deadline flags, referral rewards, and saved-search alerts are not being proactively processed — only lazily on next read, which for a low-traffic listing means they may never flip at all |
| High | Testing | Automated test suite (at minimum: escrow state machine, fee calc, wallet debit/credit, auth) | None exist | Introduce Vitest/Jest; start with pure-function unit tests (`fees.ts`, `escrow-state-machine.ts`, `credentials-crypto.ts`) then integration tests against a test DB for the money-moving API routes | A financial marketplace with zero regression protection on escrow/wallet logic is a standing risk for every future change |
| High | Verification | Real SMS phone verification (or remove the misleading "phone" step) | Backend routes exist (`api/verification/phone/*`) but are never called; the "Verify Identity" step actually only does email | Either wire the existing phone-verify routes into `settings/verification/page.tsx` with a real SMS provider (Twilio et al. — currently none integrated at all), or delete the dead code/UI copy that implies phone verification happens | KYC level naming/UX implies stronger verification than actually occurs; also dead code maintenance burden |
| Medium | Admin | Audit-log coverage for financial/settings/compliance actions | ~50% of mutating admin routes write to `AdminAuditLog`; bank accounts, platform settings, feature flags, KYB decisions are unaudited | Add `auditLog()` calls to the ~13 identified unaudited route files (§I has the list) | Compliance/forensic gap — sensitive changes (e.g., who changed the platform's crypto wallet addresses) have no trail |
| Medium | Observability | Error tracking / APM (e.g. Sentry) | None integrated; only a homegrown console-log + `/api/client-errors` sink | Add Sentry (or equivalent) for both server and client; wire existing `logger.ts` calls and uncaught-exception paths into it | Production incidents are currently only debuggable via raw log files, no alerting |
| Medium | Deployment | Reconcile deployment configs | `docker-compose.yml` and `vercel.json` are both stale/wrong relative to the real PM2/Windows deployment; several `scripts/*.bat`/`.ps1` still reference the pre-rename `accsmarkets.org` path | Either delete the unused Docker/Vercel configs (if genuinely abandoned) or fix them; fix the remaining stale-path scripts identified in §F | Confusion for any future operator/developer; the stale-path scripts are silently non-functional today |
| Medium | Dispute resolution | Auto-advance dispute phases on evidence/mediation deadline | Phase machine exists but nothing sweeps deadline expiry | Extend `api/internal/sweep` to also check `Dispute.evidenceDeadline`-style fields and auto-transition per `dispute-phases.ts` rules | Disputes could sit indefinitely in a phase if a party never acts and no admin manually intervenes |
| Low | Dashboard | Fix the always-zero "Saved" listings count | Code references a `SavedListing` Prisma model that doesn't exist in the schema; silently caught, always renders 0 | Either add the model (if "saved" should be distinct from `Watchlist`) or point the count at `Watchlist` instead | Cosmetic metric, but a broken number displayed to every buyer |
| Low | Public site | Fix or remove the `/sitemap.xml` link and the fictional `/v1/*` API-docs endpoints | `sitemap/page.tsx` links to a nonexistent XML sitemap; `docs/page.tsx` documents 5 endpoints that don't exist | Generate a real `sitemap.xml` (or remove the link); trim the docs page to the 2 real `/v1/*` endpoints or build the missing ones | Broken link (minor SEO/UX); public developer docs currently overpromise a v1 API that's 70% fictional |
| Low | Status page | Real per-service health checks | All 4 displayed "services" mirror one aggregate DB check | Add independent checks for Socket.IO and escrow-processing health, or reduce the page to what's actually monitored | Could show false "all operational" during a partial outage |

---

## E. Partial / Broken Features

| Priority | Feature | Problem | Evidence | Recommended Fix |
|---|---|---|---|---|
| Critical | Admin TOTP 2FA | Silently bypassed for all admin accounts on password login | `src/lib/auth.ts:113` — `tfa` hardcoded `null` when `role === "ADMIN"` | Remove the role-based short-circuit; enforce identically to regular users |
| Critical | Bank-wire withdrawal | Every submission returns HTTP 400 | `src/app/(dashboard)/dashboard/wallet/withdraw/page.tsx:140-164` sends `{method:"bank", bankAccountName,...}`; `src/app/api/wallet/withdraw/route.ts:19-24` unconditionally validates against `withdrawSchema` (`src/lib/validation/wallet.ts:15-19`) which requires `network`+`address` | Branch server route on `method`, or split endpoints |
| Critical | hCaptcha verification | Always passes regardless of token | `src/lib/hcaptcha.ts:1-4` (`return true` unconditionally) + `register/page.tsx` never renders `<Captcha>` | Implement real siteverify call; render the widget and wire `captchaToken` |
| Critical | Escrow state machine (milestone path) | Bypasses `assertTransition` entirely, performs an illegal `VERIFIED→COMPLETED` transition | `src/app/api/escrows/[id]/milestones/[milestoneId]/release/route.ts:77-81` | Route the final-milestone completion through `assertTransition`/the same helper every other completion path uses |
| High | Admin RBAC enforcement | `requireAdmin()` skips the permission check unless a permission argument is explicitly passed; most sensitive routes don't pass one | `src/lib/admin.ts:14`; dozens of call sites in `src/app/api/admin/**` listed in the original agent findings (users/[id], withdrawals/[id], deposits/[id], bank-accounts, settings, listings/[id], escrows/[id], disputes/[id] resolve) | Make the permission argument required at the type level, or add a lint rule; audit and fix each listed route |
| High | Wallet debit paths (escrow purchase, withdrawal approval) | Read-then-write balance arithmetic instead of atomic `{decrement}`, inside `$transaction` but without a row lock — theoretical lost-update race under concurrency | `src/app/api/escrows/route.ts:159-165`, `src/app/api/admin/withdrawals/[id]/route.ts:55-60` | Switch to `{decrement: amount}` mirroring the `{increment}` pattern already used for credits |
| High | Subscription cancellation | No code path exists | `SubscribePlanGrid.tsx:249` "Cancel" only aborts an in-progress crypto payment | Build the missing endpoint/UI (see §D) |
| Medium | Cloudinary/upload size validation | JSON/data-URI upload path never checks file size (only the FormData path does) | `src/app/api/upload/listing/route.ts:19-30` vs `:37-42` | Add the same 10MB check to the data-URI branch |
| Medium | Withdrawal request "reserve" check | Plain read-then-write outside any transaction; two concurrent requests can both pass the balance check | `src/app/api/wallet/withdraw/route.ts:32-56` | Wrap in `$transaction` with an in-tx re-check, or accept the current mitigation (approval step re-checks) as sufficient and just document it |
| Medium | PromoRedemption reuse | Redemption is consumed via `DELETE` rather than a status flag; deleting the row removes the constraint blocking re-redemption | `src/app/api/escrows/route.ts:207-209`; `@@unique([promoCodeId,userId])` on `PromoRedemption` | Mark redemption as consumed (status/flag) instead of deleting the row; verify `/api/promo/route.ts` doesn't independently prevent replay |
| Medium | Forgot-password client error handling | Fetch failures/rate-limits are silently treated as success | `src/app/(public)/forgot-password/page.tsx:14-27` (no `res.ok` check) | Add the same `res.ok`/try-catch pattern already used correctly on the contact form |
| Low | Dashboard "Saved" count | Always renders 0 | `src/app/(dashboard)/dashboard/page.tsx:79` references a nonexistent `SavedListing` model | See §D |
| Low | Public API docs page | Documents mostly-fictional `/v1/*` surface | `src/app/(public)/docs/page.tsx` | See §D |
| Low | Status page | Misleading multi-service display backed by one check | `src/components/...StatusClient.tsx` (public status page) | See §D |
| Low | Verification "phone" step | Dead state/UI, orphaned backend routes | `settings/verification/page.tsx:149` (`phone` state never read again) | See §D |

---

## F. Hidden / Unfinished Code

**Genuine stub markers (rare — this codebase is unusually clean of literal TODO/FIXME comments):**
- `src/lib/hcaptcha.ts:1-4` — explicit comment `// Captcha temporarily disabled — re-enable by removing this early return` above the always-`true` stub. The single most important "hidden" finding in the whole audit.
- `src/app/api/settings/marketing-emails/route.ts:11` — `// both handlers use raw queries instead of the typed client for now.` — a genuine acknowledged tech-debt comment.

**Dead code (fully written, zero call sites):**
- `src/lib/gemini.ts` — standalone Gemini API client, superseded by the multi-provider fallback chain in `src/lib/ai.ts`, never called from anywhere else.
- `src/components/admin/AdminDisputeActions.tsx` (89 lines), `AdminProfileClient.tsx` (**746 lines**), `AdminSettingsForm.tsx` (197 lines), `AdminStatCard.tsx` (69 lines) — all fully built, superseded by inline reimplementations in `DisputePhaseControls.tsx` / `AdminSettingsClient.tsx`.
- `src/components/dashboard/DashboardHeader.tsx` (220 lines), `src/components/social/ActivityFeedCard.tsx` (84 lines), `src/components/wallet/TransactionTable.tsx` (52 lines) — same pattern: complete, working, unused v1 implementations left behind after inline rebuilds.
- `src/app/(dashboard)/dashboard/settings/verification/page.tsx:149` — `phone` state declared and never used again; the real `api/verification/phone/*` routes it should call are themselves unused by any frontend.

**Scaffolded-but-inert database models:**
- `FeatureFlag` — full admin CRUD UI + `isFeatureEnabled()` helper exist, but the helper is **never called anywhere in the product**. Flags can be created/toggled but gate nothing.
- `NpsResponse` — write-only. `POST /api/nps` accepts submissions; no admin page or route anywhere reads them back out.

**Backend-ahead-of-frontend (API exists, no UI trigger):**
- `PATCH /api/organizations/[id]/members/[userId]` (role change) — fully implemented, no button/control anywhere in `organization/page.tsx` calls it.
- `api/verification/phone/send-code` + `/confirm` — implemented, unused (see above).

**Frontend-ahead-of-backend (UI exists, backend can't fulfill it):**
- Bank-wire withdrawal form (see §E — the form's payload shape has no matching backend support).
- `<Captcha>` component + `captchaToken` state on the register page — present in code but never rendered/wired, so the backend's `verifyCaptcha()` call always receives an empty string (moot today only because that function is itself stubbed to always return true).

**Stale/incorrect documentation-as-code:**
- README.md / MILESTONE_2_PLAN.md claiming dispute resolution, TOTP, WebAuthn, badges, reviews, KYC, subscriptions are unbuilt — all are real. README also claims "hCaptcha on signup" works — it doesn't.
- `.env` comment referencing `scripts/run-sweep.ps1`, which doesn't exist (actual files are `sweep.bat`/`sweep.mjs`/`setup-sweep-task.bat`).
- `docker-compose.yml` env var `ENCRYPTION_KEY` doesn't match the real `CREDENTIALS_ENCRYPTION_KEY` used everywhere else in the app — proof this file has never actually been run against the real codebase.
- Several deployment scripts still reference the pre-rename `accsmarkets.org` folder path and would fail if run today: `ecosystem.config.js`, `start-prod.ps1`, `scripts/sweep.bat`, `scripts/backup.bat`, `scripts/run-marketing-sweep.ps1`, `scripts/setup-backup-task.bat`, `scripts/setup-sweep-task.bat`. (`watchdog-website.ps1`, `watchdog-mysql.ps1`, `watchdog-tunnel.ps1`, and `run-backup.ps1` were already corrected and verified working during this session's infra work.)

---

## G. Workflow Gap Analysis

**Offer lifecycle**

*Current:* Buyer sends offer → seller accepts/declines/counters → Chat/notification fires → ❌ *(proactive 72h expiry not confirmed scheduled)* → Buyer proceeds to checkout on accept
*Expected:* Buyer sends offer → seller acts → **sweep job actively expires stale offers every ~15 min, platform-wide** → checkout on accept
*Gap:* The sweep endpoint and script exist and are well-written; the Windows Scheduled Task that should invoke it every 15 minutes is not currently registered (verified directly this session). Today, an offer only expires when *someone* happens to load `GET /api/offers` or attempt a `PATCH` on it.

**Escrow milestone completion**

*Current:* Buyer releases final milestone → route directly sets `Escrow.status = COMPLETED` → ❌ *(state machine's own rule that `VERIFIED` cannot go directly to `COMPLETED` is silently violated)*
*Expected:* Buyer releases final milestone → route calls `assertTransition(VERIFIED, IN_TRANSFER)` → ... → `assertTransition(IN_TRANSFER, COMPLETED)`, matching every other completion path
*Gap:* One specific route doesn't use the shared state-machine guard at all.

**Admin staff permission scoping**

*Current:* Owner creates a staff account, assigns e.g. "Content only" permissions in the UI → ❌ *(most routes never check the permission)* → staff account can still ban users / move money / change settings
*Expected:* Owner assigns "Content only" → every sensitive route checks `requireAdmin("MANAGE_X")` → staff account is actually restricted to content actions
*Gap:* The enforcement layer exists (`requireAdmin(permission)`) but is opt-in per-route and used on a small minority of routes.

**Signup bot protection**

*Current:* User fills registration form → submits → ❌ *(no captcha ever collected)* → server "verifies" an empty token → always passes → account created
*Expected:* User fills form → completes a real hCaptcha challenge → token sent → server calls hCaptcha's siteverify API → only proceeds on real success
*Gap:* Both ends of this flow are individually broken (frontend never renders the widget; backend never actually checks it).

**Bank-wire withdrawal**

*Current:* User fills bank details → submits → server 400s (schema mismatch) → user sees a generic error toast, has no way to actually withdraw via bank wire
*Expected:* User fills bank details → server validates a bank-specific schema → creates a `PENDING` bank-withdrawal request → admin reviews and approves/rejects like the existing deposit/crypto-withdrawal flows
*Gap:* The whole backend acceptance path for this specific payment method is missing; only the crypto path was actually finished on the server side.

**Subscription lifecycle**

*Current:* Free → Upgrade (balance or crypto) → ✅ Active paid plan → ❌ *(no further lifecycle step exists)*
*Expected:* Free → Upgrade → Active → Cancel/Downgrade request → reverts to Free at next renewal boundary (or immediately, per business decision) → confirmation + notification
*Gap:* The entire back half of the subscription lifecycle (cancel/downgrade) was never built.

---

## H. Frontend / Backend / Database Gap Matrix

**Frontend exists, backend missing or broken:**
- Bank-wire withdrawal form → backend schema rejects it unconditionally.
- Register page's Captcha component → never rendered, so the real (if it were fixed) backend check would never receive a token anyway.

**Backend exists, frontend missing:**
- `PATCH /api/organizations/[id]/members/[userId]` (role change) — no UI control.
- `api/verification/phone/send-code` + `/confirm` — no UI step calls these.
- `MANAGE_FINANCE` / `MANAGE_USERS` permission constants — declared and shown in the staff-role assignment UI, but literally zero route in the codebase checks for them, so assigning a staff member "Finance" or "Users" scope in the admin UI currently has no restrictive effect at all (they already have full access as any ADMIN would).

**Database exists, functionality incomplete/missing:**
- `FeatureFlag` — full schema + admin CRUD, zero product-code consumption.
- `NpsResponse` — write path only, no read/reporting surface anywhere.
- `SavedListing` referenced by application code but **doesn't exist in the schema at all** — inverse of the usual gap (code assumes a table that was never created).

**Navigation exists, feature incomplete:**
- `settings/subscription` → "Cancel" only cancels an in-flight payment, not the subscription itself; a user landing here expecting to downgrade has no path.
- `settings/verification` → "Verify Identity" step visually implies phone verification but is actually just email confirmation renamed.
- Public `/docs` page → links out an API surface that's 70% non-existent.
- Public `/sitemap` page → links to a `/sitemap.xml` that returns 404.

---

## I. Security Findings

### Critical
1. **Admin TOTP 2FA is silently bypassed on password login.** `src/lib/auth.ts:113` hardcodes `tfa = null` whenever `user.role === "ADMIN"`, so the entire TOTP-enforcement block is dead for admin accounts regardless of whether they've enabled 2FA. The admin login page still renders a TOTP input for a `TOTP_REQUIRED` error the server can never emit via this path. Only the separate WebAuthn provider actually enforces a second factor. **Any admin with a leaked password logs in with password alone.**
2. **hCaptcha verification is a hardcoded no-op.** `src/lib/hcaptcha.ts:1-4` — `verifyCaptcha()` always returns `true`. Real `HCAPTCHA_SITE_KEY`/`HCAPTCHA_SECRET_KEY` are configured in `.env`, so whoever operates this site believes signup is bot-protected; it is not. Compounded by `src/app/(public)/register/page.tsx`, which imports `<Captcha>` and declares `captchaToken` state but never renders the widget or calls `setCaptchaToken` — the token sent to the server is always an empty string.
3. **Granular admin permissions (`StaffRole`) are enforced on a small minority of sensitive routes.** `requireAdmin(permission)` only performs the permission check when a caller passes one (`src/lib/admin.ts:14`); dozens of financially/operationally sensitive routes call it with no argument, including user ban/balance-adjust (`api/admin/users/[id]`), withdrawal/deposit approval, bank-account CRUD, platform settings, and (inconsistently vs. its own sibling routes) dispute resolution. **`MANAGE_FINANCE` and `MANAGE_USERS` — the two most sensitive permission constants in the catalog — have zero enforcing call sites anywhere in the codebase.** A staff account the owner explicitly scoped away from Finance/Users can still perform every Finance/Users action.

### High
4. **`/api/admin/**` has no middleware-level authorization at all**, by design of `src/middleware.ts` (both the admin-subdomain and main-domain branches explicitly skip `/api/*`). Currently safe only because all 81 admin route files independently self-check role — verified route-by-route — but there is no structural safety net; a future route added without remembering the check would be fully public with no second line of defense.
5. **Wallet debit paths use non-atomic read-then-write arithmetic** instead of Prisma's atomic `{decrement}` (which credits already correctly use via `{increment}`). Sites: `src/app/api/escrows/route.ts:159-165` (escrow purchase debit), `src/app/api/admin/withdrawals/[id]/route.ts:55-60` (withdrawal approval debit). Both are inside `$transaction`, but a plain `SELECT` inside a MySQL transaction under Prisma's default isolation does not take a row lock — two concurrent requests against the same user's balance could both read the same starting value and the second write clobbers the first. Not confirmed exploited; a real code-pattern risk under concurrent load.
6. **No rate limiting on any authenticated admin mutation route**, including money-moving ones (`withdrawals/[id]`, `deposits/[id]`, `bank-transfers/[orderId]`, user balance-adjust, dispute resolution, trustless handover) and — most notably — **admin 2FA-setup TOTP code verification has no attempt limit at all**, making it brute-forceable by anyone holding a valid (even non-2FA-enabled) admin session during the setup window.

### Medium
7. **`AdminAuditLog` covers roughly half of mutating admin actions.** Confirmed unaudited despite sensitivity: platform bank-account create/update/delete, platform-wide settings changes (including crypto deposit addresses and fee windows), feature-flag creation/toggling, KYB approve/reject (uses `logger.info` instead), escrow-manager-email pool changes, transfer policies, canned responses, email templates, and an admin enabling/disabling their own 2FA.
8. **Cloudinary/upload data-URI path has no server-side file-size check** (`src/app/api/upload/listing/route.ts:19-30`), unlike its sibling FormData path which correctly enforces a 10MB cap — a large base64 payload can bypass the limit entirely through this code path.
9. **`CREDENTIALS_ENCRYPTION_KEY` in the live `.env` is 66 hex characters**, not the 64 (32-byte) length `src/lib/credentials-crypto.ts` expects/requires. This needs empirical verification (not confirmed broken in this read-only audit) — if the running code path actually enforces the 64-char check and the live value doesn't match, escrow credential encryption could be failing or silently using a truncated/different key than intended. **Flagged for immediate verification, not confirmed as an active incident.**
10. **Admin page components have no per-page authorization check of their own** — `src/app/(admin)/admin/layout.tsx:46-47` renders children directly when there's no session at all (only redirects when a session exists but has the wrong role), relying entirely on middleware having already caught the unauthenticated case. No second line of defense for that specific state.

### Low
11. Public API docs page describes a largely fictional `/v1/*` surface — not itself a vulnerability, but publishing documentation for endpoints that don't exist could mislead integrators or probing tools.
12. Client-side-only error swallowing on `forgot-password` (silently reports success even on server error/rate-limit) — low-severity information/UX issue, not an auth bypass (the server-side logic itself is correct and anti-enumeration-safe).

**No evidence found of:** SQL injection (Prisma parameterizes everything; the one raw-SQL usage in the blog-detail page is parameterized), XSS (content is sanitized via `src/lib/sanitize.ts` before render in the places checked), missing webhook signature verification (NOWPayments HMAC-SHA512, Stripe signature, Opinly Svix — all verified correctly), or hardcoded secrets in application source (secrets live in `.env`, not committed code — though `prisma/seed.ts` does hardcode and print a known admin password, see §F/§J).

---

## J. Reliability & Data Integrity Findings

- **Wallet debit race condition** (detailed in §I #5) — theoretical double-spend/lost-update under concurrent escrow purchases or withdrawal approvals for the same user.
- **Offer/escrow sweep not confirmed scheduled** — verified directly this session via `schtasks /query` that no "AccsMarkets Internal Sweep" (or any sweep-related) task exists on the live server, despite `scripts/sweep.mjs` + `setup-sweep-task.bat` being written specifically for this purpose. In practice this means offer 72h expiry, escrow transfer-deadline flags, referral-milestone rewards, and saved-search alerts are currently **only evaluated lazily**, on whatever page load or action happens to trigger the same-request check — a low-traffic listing's offer could sit expired-in-spirit but not-yet-flipped indefinitely.
- **`Dispute` model has zero database indexes** (`prisma/schema.prisma:524-547`) beyond the implicit unique on `escrowId`, while the primary admin moderation query (`api/admin/disputes-list/route.ts`) filters by `status` and sorts by `createdAt` — this will become a full-table scan as dispute volume grows (contrast: `Escrow` and `Report` both correctly have `@@index([status])`).
- **`PromoRedemption` consumed via row deletion rather than a status flag** — since the anti-replay protection is a unique constraint on the row itself, deleting it on use removes the very thing that would block a second redemption of the same code by the same user, unless `/api/promo/route.ts` independently guards against replay (not verified in this pass).
- **Duplicate-pending-offer check is not race-safe** (plain `findFirst` + `create`, no transaction or unique constraint) — two concurrent submissions from the same buyer on the same listing could create two `PENDING` offers. No money moves at this stage, so impact is limited to data cleanliness/UX confusion.
- **Money stored as `Float` in three config-level (not core-ledger) locations**: `PlatformSettings.bankTransferShortfallToleranceUsd`, `DepositMethodFee.feeRate/minFee/maxFee`, `SubscriptionPlan.escrowFeeRate` — all consumed directly in real dollar comparisons/calculations. The actual ledger fields (`walletBalance`, `Escrow.amount`, `Transaction.amount/balanceBefore/balanceAfter`, etc.) are correctly `Decimal`, so this is a lower-blast-radius issue than a Float ledger would be, but still a real rounding-precision risk in the specific flows that use these fields (bank-transfer auto-verification tolerance, deposit fee bounds, escrow fee-rate math).
- **`internal/sweep` has no top-level try/catch** despite running 6 sequential DB-mutating steps per invocation — an unexpected error mid-sweep silently skips all later steps in that run with no record of why (Next.js returns a generic 500, but there's no application-level log of which step failed).
- **Very low structured-logging adoption** (`src/lib/logger.ts` used in only 7 files/13 call sites) versus 74 files with `try/catch` — most non-critical failures are caught and silently discarded (`.catch(() => null)` / `.catch(() => [])`), which is defensible for fire-and-forget side effects (notifications, activity events) but means production issues in those paths are invisible without adding logging.
- **No automated tests** means every one of the above (and any future regression in escrow/wallet logic) can only be caught by manual QA or by users in production.
- **Zero server-managed cascade risk found** on money/audit-critical relations — `Escrow`, `Transaction`, and `AdminAuditLog` rows cannot be silently deleted via a parent cascade; this is a genuinely good pattern, not a finding.

---

## K. Recommended Implementation Roadmap

### Phase 0 — Critical fixes (security, correctness, money-integrity)
| Feature | Reason | Dependencies | Frontend | Backend | Database | Risk | Order |
|---|---|---|---|---|---|---|---|
| Fix admin 2FA bypass | Highest-severity auth hole | none | none | `src/lib/auth.ts` one-condition fix | none | Low (small, well-understood change) | 1 |
| Fix hCaptcha (real verify + render widget) | Signup has zero bot protection | hCaptcha account already exists | render `<Captcha>` + wire state on register page | implement real `siteverify` call | none | Low | 2 |
| Fix escrow milestone state-machine bypass | Violates the app's own core invariant | none | none | route through `assertTransition` in the milestone-release route | none | Medium (touches a money-adjacent completion path — needs careful testing) | 3 |
| Enforce admin RBAC permissions | Staff accounts have unrestricted access today | `permissions.ts` catalog already exists | staff-role UI unaffected | pass correct `Permission` to every `requireAdmin()` call identified in §I | none | Medium (broad but mechanical change; must not lock out the true owner account) | 4 |
| Fix wallet debit race (atomic decrement) | Theoretical double-spend under concurrency | none | none | switch `escrows/route.ts` + `admin/withdrawals/[id]/route.ts` to `{decrement}` | none | Low-Medium | 5 |
| Verify/fix `CREDENTIALS_ENCRYPTION_KEY` length | Possible silent crypto misconfiguration | none | none | confirm the deployed key is valid 64-hex; rotate if not (re-encrypt any affected data) | none | Medium (touches live encrypted data — needs a careful, verified rollout) | 6 |
| Fix bank-wire withdrawal | A shipped payment feature is completely non-functional | mirrors existing crypto-withdrawal pattern | minor payload fix or none | branch `withdraw/route.ts` on `method` or split endpoint | none | Low-Medium | 7 |

### Phase 1 — Complete existing unfinished features
| Feature | Reason | Dependencies | Frontend | Backend | Database | Risk | Order |
|---|---|---|---|---|---|---|---|
| Register the sweep task on the live server | Offer/escrow deadlines aren't proactively processed | `scripts/sweep.mjs` already exists | none | none (ops task) | none | Low | 1 |
| Fill in `AdminAuditLog` coverage gaps | Compliance/forensic gap on sensitive actions | `auditLog()` helper already exists | none | add call to ~13 identified route files | none | Low | 2 |
| Add server-side size check to data-URI upload path | Bypassable upload cap | none | none | mirror the existing FormData-path check | none | Low | 3 |
| Fix forgot-password client error handling | Silent failure reported as success | none | add `res.ok` check | none | none | Low | 4 |
| Fix "Saved" listings count | Always-zero broken metric | decide: reuse `Watchlist` or add `SavedListing` | none if reusing Watchlist | update the query | possibly none | Low | 5 |
| Wire or remove phone-verification dead code | Misleading UX / dead code maintenance | needs an SMS provider decision if wiring for real | `settings/verification/page.tsx` | existing routes, or delete them | none | Low-Medium (depends on scope decision) | 6 |
| Fix/trim public `/docs` and `/sitemap` pages | Broken link + fictional API docs | none | update page content | generate real `sitemap.xml` if keeping the link | none | Low | 7 |

### Phase 2 — Critical missing business functionality
| Feature | Reason | Dependencies | Frontend | Backend | Database | Risk | Order |
|---|---|---|---|---|---|---|---|
| Subscription cancellation/downgrade | No path exists today; real support/billing exposure | existing subscription/payment infra | `settings/subscription` UI | new cancel/downgrade endpoint | none (uses existing `SubscriptionPlan`) | Medium | 1 |
| Automated test suite (core money paths first) | Zero regression protection on financial logic | test framework choice (Vitest recommended, matches existing tsx/TS tooling) | none | test files for `fees.ts`, `escrow-state-machine.ts`, `credentials-crypto.ts`, then integration tests for escrow/wallet routes | test DB | Low risk to add, high value | 2 |
| Real SMS phone verification (or formal removal) | Misleading current state | SMS provider account (e.g. Twilio) if implementing for real | wire existing UI step | wire existing routes to real SMS send | none | Medium | 3 |

### Phase 3 — Operational improvements
| Feature | Reason | Dependencies | Frontend | Backend | Database | Risk | Order |
|---|---|---|---|---|---|---|---|
| Error tracking / APM integration (Sentry or equivalent) | No production alerting today | account/SDK setup | wrap `global-error.tsx` etc. | wrap server error paths, `logger.ts` | none | Low | 1 |
| Reconcile/clean up deployment configs | Confusing, contradictory, partly-broken configs | decide: keep Docker path or delete it | none | fix or remove `docker-compose.yml`, `vercel.json`; fix remaining stale-path scripts | none | Low | 2 |
| Add per-service health checks to status page | Currently misleading | none | update `StatusClient.tsx` | add real Socket.IO/escrow-processing checks to `/api/health` | none | Low | 3 |
| Auto-advance dispute phases on deadline expiry | Disputes can stall indefinitely | sweep task must be running (Phase 1) | none | extend `internal/sweep` to check dispute deadlines | possibly add deadline fields if not already present | Medium | 4 |

### Phase 4 — Advanced features
| Feature | Reason | Dependencies | Frontend | Backend | Database | Risk | Order |
|---|---|---|---|---|---|---|---|
| Wire `FeatureFlag` system into at least one real feature | Currently fully built but gates nothing | none | conditional rendering using `isFeatureEnabled()` | none (helper exists) | none | Low | 1 |
| Build an NPS reporting view | Data is being collected into a black hole | `NpsResponse` model already populated | new admin page | new read endpoint | none | Low | 2 |
| Consolidate duplicate admin components | Maintainability, not correctness | none | delete the 7 identified orphaned components after confirming no future plans for them | none | none | Low | 3 |
| Bidirectional trust score (penalties for lost disputes/cancellations) | Currently one-directional | dispute resolution already implemented | none | add penalty logic to the dispute-resolve (seller-loses) and cancellation paths | none | Medium (product/policy decision needed on exact penalty amounts) | 4 |
| Two-tier/granular roles beyond USER/ADMIN (e.g. MODERATOR) | Currently binary at the DB level; `StaffRole` is the only granularity and it's under-enforced | Phase 0's RBAC-enforcement fix should land first | staff UI already mostly supports this | schema addition if a true DB-level role tier is wanted (optional — `StaffRole` may be sufficient once enforced) | possible enum extension | Medium | 5 |

---

## L. Final Master Checklist

### Critical
- [ ] Remove the admin-role short-circuit that bypasses TOTP 2FA on password login (`src/lib/auth.ts:113`)
- [ ] Implement real hCaptcha `siteverify` call; render `<Captcha>` and wire `captchaToken` on the register page
- [ ] Route the milestone-release escrow completion through `assertTransition` instead of setting status directly
- [ ] Enforce `StaffRole` permissions on every sensitive admin route (especially `MANAGE_FINANCE`, `MANAGE_USERS`)
- [ ] Switch wallet debit paths (escrow purchase, withdrawal approval) to atomic `{decrement}`
- [ ] Verify the live `CREDENTIALS_ENCRYPTION_KEY` is a valid 64-hex-char key; rotate/fix if not
- [ ] Fix bank-wire withdrawal payload/schema mismatch so submissions actually succeed

### High Priority
- [ ] Register a Windows Scheduled Task for `api/internal/sweep` (offer expiry, escrow flags, referral rewards, saved-search alerts)
- [ ] Build subscription cancellation/downgrade (currently completely missing)
- [ ] Stand up an automated test suite starting with `fees.ts`, `escrow-state-machine.ts`, `credentials-crypto.ts`, and core escrow/wallet API routes
- [ ] Decide and act on phone verification: wire it up with a real SMS provider, or remove the dead code/misleading UI copy
- [ ] Fill `AdminAuditLog` gaps: bank accounts, platform settings, feature flags, KYB decisions, escrow-manager-emails, transfer policies, canned responses, email templates, admin's own 2FA toggle
- [ ] Add rate limiting to admin mutation routes, especially TOTP verification during 2FA setup

### Medium Priority
- [ ] Add server-side size validation to the data-URI upload path (`api/upload/listing`)
- [ ] Fix forgot-password client to surface real errors instead of always showing "sent"
- [ ] Fix or reconsider `PromoRedemption`'s delete-on-use pattern (potential replay)
- [ ] Make the duplicate-pending-offer check race-safe
- [ ] Convert the three identified config-level `Float` money fields to `Decimal`
- [ ] Add a `@@index` to the `Dispute` model
- [ ] Add a top-level try/catch to `api/internal/sweep`
- [ ] Integrate an error-tracking/APM service (Sentry or equivalent)
- [ ] Reconcile deployment configs: fix or remove `docker-compose.yml` and `vercel.json`; fix remaining stale `accsmarkets.org`-path scripts (`ecosystem.config.js`, `start-prod.ps1`, `scripts/sweep.bat`, `scripts/backup.bat`, `scripts/run-marketing-sweep.ps1`, `scripts/setup-backup-task.bat`, `scripts/setup-sweep-task.bat`)
- [ ] Auto-advance dispute phases on evidence/mediation deadline expiry
- [ ] Add real per-service checks to the public status page

### Low Priority
- [ ] Fix the always-zero "Saved" listings dashboard metric
- [ ] Fix or remove the broken `/sitemap.xml` link on the public sitemap page
- [ ] Trim the public `/docs` page to only document real `/v1/*` endpoints (or build the missing ones)
- [ ] Wire the `FeatureFlag` system into at least one real product feature
- [ ] Build an admin-facing NPS response viewer
- [ ] Remove or consolidate the 7 identified orphaned/duplicate admin & dashboard components
- [ ] Add a penalty path to trust score for lost disputes/cancellations (currently one-directional)
- [ ] Add notifications for offer-cancel, withdrawal-request-creation, and deposit-creation events (currently silent)

---

*This report is a snapshot as of 2026-09-16. It reflects direct code inspection (not README claims) across 6 parallel deep-dive workstreams covering the database schema, all API routes, all frontend pages/components, admin authorization, core business logic, and integrations/deployment. No code was modified as part of producing this report.*

