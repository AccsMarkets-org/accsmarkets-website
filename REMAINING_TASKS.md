# AccsMarkets — Remaining Tasks

Snapshot of everything not yet done, as of the end of the Milestone 1 build. Organized by urgency:
what blocks you from running the app at all, what's a known gap inside Milestone 1 itself, and what
was deliberately deferred to Milestone 2 per the original spec.

---

## 0. Blocking — nothing works until these are done

- [ ] **Provision a MySQL 8+ database** (local install, or a hosted one — PlanetScale, Railway, Aiven, etc.)
- [ ] **Fill in `.env`** from `.env.example`: `DATABASE_URL`, `NEXTAUTH_SECRET` (`openssl rand -base64 32`), `CREDENTIALS_ENCRYPTION_KEY` (`openssl rand -hex 32`), SMTP creds, `GOOGLE_CLIENT_ID`/`SECRET`, Cloudinary keys, `NOWPAYMENTS_API_KEY`/`IPN_SECRET`, hCaptcha keys, `ADMIN_EMAIL`/`ADMIN_PASSWORD`
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Run `npx prisma db seed` (creates the 4 subscription plans, platform settings row, admin user)
- [ ] Set up Google OAuth consent screen + authorized redirect URI (`{NEXTAUTH_URL}/api/auth/callback/google`) in Google Cloud Console
- [ ] Register a NOWPayments IPN callback URL matching your deployed domain (`{NEXTAUTH_URL}/api/webhooks/nowpayments`)
- [ ] Run the end-to-end walkthrough in `README.md` once the above is done, to confirm the full loop works against a real database

---

## 1. Known gaps inside Milestone 1 (should probably close before calling it "done")

- [ ] **DOMPurify is installed but not wired up.** `isomorphic-dompurify` is a dependency, but no listing description, message content, or escrow chat text is actually sanitized before render. This is the one item on the original security checklist that's still open — matters because listing descriptions and chat messages render as user-controlled text.
- [ ] **Admin can't drive the escrow workflow from the UI.** The API routes (`verify`, `transfer`, `complete`) all accept an admin caller, but `/dashboard/escrows/[id]` only renders action buttons for the buyer/seller — an admin visiting an escrow they're not party to sees no controls. Needs either a dedicated `/admin/escrows/[id]` page or extending `EscrowActions` to show admin-only buttons.
- [ ] **No admin dispute resolution flow.** Disputes can be opened (`OPEN` status, reason, evidence-free) but there's no `UNDER_REVIEW` transition, no evidence submission endpoint, and no admin UI to rule buyer-wins/seller-wins. The `Dispute` model has `resolution` and `resolvedAt` fields sitting unused.
- [ ] **No admin detail pages** — `/admin/users/[id]`, `/admin/listings/[id]`, `/admin/disputes/[id]` don't exist. All admin actions currently happen inline from list pages, which works but doesn't scale to full user/listing history review.
- [ ] **Offer expiry and escrow transfer deadlines are lazy, not proactive.** Offers flip to `EXPIRED` only when someone next reads them; `Escrow.transferDeadline` is stored but nothing acts on it if it passes. No cron/job runner exists yet.
- [ ] **`RateLimitEvent` rows are pruned lazily** (best-effort delete on each check) — fine at small scale, but there's no scheduled cleanup job, so the table can grow if traffic is bursty and rate limits aren't hit again for a while.
- [ ] **No automated tests.** Zero unit/integration/e2e test coverage — everything was verified via manual build checks and a browser smoke test of the landing page only (DB wasn't available to test the transactional flows live).
- [ ] **Mobile nav for dashboard/admin.** Sidebars are `hidden md:block` with no hamburger/drawer fallback — dashboard and admin are desktop-only right now.

---

## 2. Deferred to Milestone 2 (per the original scoping decision)

### Auth & account security
- [ ] TOTP 2FA (`/api/auth/2fa/setup|verify|disable`, QR code, backup codes)
- [ ] Session management (`GET/DELETE /api/auth/sessions/[id]`, `/settings/sessions` page)
- [ ] Login attempt lockout (`maxLoginAttempts`, `loginLockoutMinutes`)
- [ ] `require2FAForAdmins` enforcement

### KYC / identity
- [ ] Phone verification (PHONE KYC level) — needs an SMS provider, currently a documented no-op
- [ ] OpenKYC AI pipeline (ID upload, OCR, liveness, face match, auto-approve threshold, manual review queue)
- [ ] `/settings/verification` page
- [ ] Listing-creation KYC gate raised from EMAIL to PHONE once phone verification exists

### Badges & reputation
- [ ] Achievement badge auto-award logic (RISING_STAR, POWER_SELLER, TOP_SELLER, LEGEND, BIG_EARNER, WHALE) + the `UserAchievementBadge` join table this needs (current schema only has the single `verifiedBadge` enum field)
- [ ] Admin-assignable badges: FIVE_STAR_SELLER, FAST_RESPONDER, TRUSTED_SELLER

### Monetization
- [ ] Subscription purchase flow (`POST /api/payments/subscribe`, `GET /api/payments/subscribe/status`, NOWPayments-driven activation, `subscription_activated` socket event)
- [ ] `/settings/subscription` plan-upgrade page
- [ ] Admin subscription management (`/admin/subscriptions`, extend/cancel/activate)
- [ ] Listing promotions: FEATURED_BOOST, PREMIUM_FEATURED, PINNED, BUMP — pricing, wallet deduction, browse-sort weighting, `isFeatured`/`isPremiumFeatured`/`bumpedUntil` schema fields
- [ ] Listing analytics endpoint (`GET /api/listings/[id]/analytics`)

### Trust & content
- [ ] Reviews (`POST/GET /api/reviews`, 1–5 star + comment, one per party per escrow, display on seller profile)
- [ ] Reports (`POST /api/reports`, reasons enum, admin actions REVIEWING/RESOLVED/DISMISSED/BAN_USER/WARN_USER/REMOVE_LISTING, `/admin/reports`)
- [ ] Watchlist (`POST/DELETE/GET /api/watchlist`, heart button on cards, `/watchlist` page)
- [ ] `fetch-channel` auto-fill API (pulls channel name/subscribers/thumbnail from the platform when creating a listing) — needs per-platform API integrations (YouTube Data API, Instagram Graph API, etc.)

### Support & comms
- [ ] Support tickets (`GET/POST /api/support/tickets`, `/support` page, `/admin/support`)
- [ ] Announcements (admin CRUD, `GET /api/announcements`, site-wide banner display, `targetAudience` targeting)
- [ ] DB-editable `EmailTemplate` table + `/admin/email-templates` (current templates are hardcoded functions in `lib/email-templates.ts` — functionally fine, just not admin-editable)
- [ ] Admin "send notification to any user" (`POST /api/admin/users/[id]/notify`)
- [ ] Admin test-email endpoint (`POST /api/admin/test-email`)

### Blog
- [ ] `BlogPost`, `BlogCategory`, `BlogTopicQueue`, `BlogAutomationLog` models
- [ ] Gemini AI auto-generation cron (twice daily)
- [ ] `/blog` and `/blog/[slug]` public pages
- [ ] `/admin/blog` management page

### Admin panel completeness
- [ ] `/admin/security` — security flags log, `PUT /api/admin/security-flags/[id]`
- [ ] `/admin/wallets` — crypto wallet address / QR code management
- [ ] `/admin/settings` — platform settings UI (see schema gap below)
- [ ] `/admin/transactions` — dedicated full platform transaction ledger view
- [ ] `/admin/messages` — live monitor of all DMs + escrow threads
- [ ] `/admin/verification` — KYC review queue (depends on KYC pipeline above)
- [ ] CSV exports (`GET /api/admin/reports/export`, `GET /api/admin/users/export`)
- [ ] Make/remove moderator admin action + `Moderator` role enforcement (spec lists a Moderator role; schema currently only has `USER`/`ADMIN`)

### Platform settings schema gap
Current `PlatformSettings` model only has: `siteName`, `maintenanceMode`, `registrationOpen`,
`requireEmailVerification`, `minDeposit`, `minWithdrawal`, `escrowTransferDays`, `disputeWindowHours`.
Not yet modeled: `platformUrl`, `contactEmail`, `supportTelegram`, `registrationStatus` (OPEN/INVITE_ONLY/CLOSED
instead of a bool), `maxLoginAttempts`/`loginLockoutMinutes`, `autoApproveHighTrustScore`, per-platform
`minSubscribers`, `maxListingPrice`, `requireEscrowAlways`, `depositFeePercent`, `promotionPrices`,
`socialLinks`, `blogAutoPublish`/`blogDailyCount`/`blogPostTimes`. Also: `maintenanceMode` exists as a
field but nothing currently reads it to actually block traffic.

### Profile / misc
- [ ] Avatar upload (`PUT /api/user/avatar`)
- [ ] Profile completeness bar, social links on `/settings`
- [ ] Listing schema fields from the original spec not carried over: `channelId`, `channelHandle`,
      `channelName`, `niche`, `language`, `country`, `monetizationDetails`, `lifetimeRevenue`,
      `monthlyEarnings`, `monthlyViews`, `tags[]`, `adminNotes`, `offerCount` (denormalized)

### Infra
- [ ] Dockerfile / docker-compose.yml for easy self-hosting (README documents VPS/PM2 deployment but no container setup exists)
- [ ] A job runner/cron for: offer expiry sweep, escrow transfer-deadline handling, blog generation, rate-limit table cleanup
- [ ] CI pipeline (lint/build/test on push) — none configured
