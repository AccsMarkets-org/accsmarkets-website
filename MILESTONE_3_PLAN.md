# AccsMarkets — Milestone 3 Plan

Planning document only — nothing in this file has been built. Milestone 1 shipped the core
marketplace loop; `MILESTONE_2_PLAN.md` plans the rest of the original feature spec (2FA, KYC,
badges, subscriptions, promotions, reviews/reports/watchlist, support, disputes, blog, admin
completeness). Between the two, essentially everything in the original spec is accounted for.
**Milestone 3 is what comes after the spec** — the maturity work that only matters once the platform
has real users and real money moving through it: reliability, legal exposure, scale, fraud-at-volume,
growth, and platform/ecosystem features. None of this was implied by the original brief; it's the
natural next layer for a live financial marketplace.

## Context

A platform can be feature-complete (M1+M2) and still be fragile, legally exposed, unable to scale
past one server process, blind to fraud patterns that only show up at volume, and invisible to search
engines and growth channels. Milestone 3 addresses those gaps. It's intentionally ordered by risk:
**know when things break → don't get sued → scale before you need to → protect the money → protect
high-value trades → then, and only then, invest in growth and ecosystem features.** Several items here
are business decisions as much as engineering ones (which search engine to adopt, whether a guarantee
fund is financially viable, whether the admin team is large enough to need granular RBAC) — those are
flagged explicitly rather than presented as settled.

---

## Phase Overview

| # | Phase | Depends on |
|---|---|---|
| 1 | Observability & reliability | — |
| 2 | Compliance & legal | — |
| 3 | Scale infrastructure | Phase 1 (monitors the migration) |
| 4 | Fraud & risk management | Phase 3 (uses the job queue) |
| 5 | Advanced escrow & trust | M1 core escrow; Phase 4 (risk signals inform high-value gating) |
| 6 | Search & discovery | M2's extended listing fields (niche/language/country/tags) |
| 7 | Payments expansion | — |
| 8 | Growth & marketing | Phase 3 (queue-driven rewards/reminders); Phase 6 (discovery synergy) |
| 9 | Public API platform | Stable M1/M2 API surface; Phase 3 (webhook delivery queue) |
| 10 | Progressive Web App | — |
| 11 | Accessibility hardening | Audits everything from M1/M2, so logically comes after both |
| 12 | Admin & ops maturity | M2's Moderator role; Phase 1 (dashboards build on observability data) |

---

## Design System Extensions (new tokens/components needed across phases)

- **Accessible `Dialog` component** — Milestone 1/2 lean on native `confirm()`/`prompt()` for
  destructive/admin actions (`AdminActionButtons`, `EscrowActions` cancel/dispute flows). Phase 11
  replaces these with a proper modal: focus-trapped, closes on Escape/backdrop click, returns focus
  to the trigger element on close. This is foundational enough that earlier phases needing new
  confirmation flows (Phase 2's deletion confirmation, Phase 9's API key reveal-once modal) should
  use it directly rather than adding more native dialogs to later replace.
- **Cookie consent banner** — bottom-anchored variant of the M2 announcement banner (same color-token
  approach), with Accept / Reject / Customize actions instead of a single dismiss.
- **Faceted filter sidebar** — checkbox groups (platform, niche, language, country) + range sliders
  (price, followers) replacing the current inline filter row on `/listings` for the richer Phase 6
  search experience.
- **Search typeahead dropdown** — attached to the browse page's search input, debounced query,
  keyboard-navigable result list.
- **Bell-toggle icon button** — small icon button with an on/off filled state, reused for "alert me"
  on saved searches (Phase 6).
- **Milestone checklist component** — a non-linear variant of the M2 generic `Stepper` (checklist
  rather than strictly-ordered progression), for Phase 5's split-payment escrows.
- **Stripe Elements wrapper** — card input styled to match `Input`/`Button` tokens (Stripe's Elements
  API supports custom CSS injection for this).
- **Currency-display suffix** — small `text-muted` inline pattern (`≈ €92.30`) appended next to
  authoritative USD amounts, never replacing them.
- **Promo code input** — inline validation micro-states (checking / valid-with-discount-preview /
  invalid), reusing `Input`'s existing `error` prop pattern plus a new `success` visual state.
- **API key reveal-once panel** — shown a single time on generation (copy button, "you won't see
  this again" warning), then the key list only ever shows a masked suffix.
- **PWA install banner** — dismissible bar, respects the browser's native install-eligibility signal
  rather than forcing its own timing.
- **Feature flag toggle row + rollout slider** — table row pattern with a switch and a 0–100% slider.
- **Lightweight chart components** (cohort retention, funnel, revenue trend) — a small charting
  library (e.g. Recharts) themed to the existing `brand`/`success`/`warning`/`danger`/`info` tokens,
  for Phase 12's BI dashboard.

---

## Phase 1 — Observability & Reliability

**Data model:** none required — this phase leans on external tooling rather than new app tables.

**Work items:**
- Error tracking (e.g. Sentry) wired into both the Next.js app and the custom `server.js`/Socket.IO
  process, with request-scoped context (user id, route) attached automatically.
- Structured logging (request IDs, consistent JSON log lines) replacing ad hoc `console.log`/
  `console.error` calls throughout `lib/*` and API routes.
- `GET /api/health` — checks DB connectivity (a cheap query), returns Socket.IO connection count and
  process uptime; used by an external uptime monitor (UptimeRobot, BetterStack, etc.) and by
  container orchestration health checks once Phase 13-of-M2's Docker setup exists.
- Automated MySQL backups (scheduled dump + off-host storage) with a documented, *tested* restore
  procedure — a backup nobody has restored from is not a backup.
- A written incident runbook (not code): who gets paged, how to check `/api/health` and the error
  tracker, how to roll back a bad deploy, how to restore from backup.

**UX/UI:** `/admin/system` — a small ops dashboard: health status cards (DB latency, socket
connections, last successful backup timestamp, recent error rate pulled from the error tracker's
API). No complex interaction — this is a read-only status page.

**Done when:** the health endpoint accurately reflects real outages; errors surface with enough
context to debug without reproducing locally; a backup has actually been restored successfully at
least once as a drill; the runbook exists and someone other than the original builder could follow it.

---

## Phase 2 — Compliance & Legal

**Data model:** `TermsAcceptance { userId, version, acceptedAt, ip }`, `DataExportRequest { userId,
status (PENDING | READY | EXPIRED), requestedAt, completedAt, downloadUrl }`, `DataErasureRequest {
userId, status (PENDING | REVIEWING | COMPLETED | DENIED), requestedAt, completedAt, adminNotes }`.
Cookie consent for anonymous visitors is client-side only (localStorage); for logged-in users, log a
`CookieConsent { userId, categories (Json), consentedAt }` row.

**API routes:** `POST /api/legal/accept-terms`, `POST /api/user/export-data` (queues a background job
that assembles a full data archive — profile, listings, offers, escrows, transactions, messages —
and emails a time-limited download link when ready), `POST /api/user/request-deletion`, `GET/PUT
/api/admin/legal/erasure-requests/[id]`.

**UX/UI:**
- Cookie consent banner on first visit for anonymous and logged-out traffic (Accept / Reject /
  Customize — customize expands category toggles for analytics vs. essential-only).
- A terms-version-bump forces a blocking re-acceptance modal on next login when
  `TermsAcceptance.version` is behind the current version — same weight as the existing
  email-verification gate from M1, not skippable.
- `/settings/privacy` — "Download my data" (button → async job → toast confirming an email is on its
  way, no long spinner) and "Delete my account" (a confirmation flow, using the new `Dialog`
  component, that explains upfront which records must be retained for financial/audit reasons and
  what "deletion" actually means in that case — full erasure isn't honest to promise for a platform
  with transaction history).
- Admin `/admin/legal` — queue for erasure requests requiring manual review, since a user with escrow
  or transaction history can't be hard-deleted; the resolution path is anonymization (scrub PII,
  retain the financial skeleton) rather than row deletion, and that needs a human to confirm no
  open disputes/escrows exist first.

**Done when:** users accept the current ToS version and are correctly re-prompted after a version
bump; a data export produces a genuinely complete archive; deletion requests are handled via
anonymization where financial retention applies, with admin sign-off; cookie consent is recorded and
any future analytics/tracking scripts are gated behind it.

---

## Phase 3 — Scale Infrastructure

**Data model:** no new tables; this phase is about *where state lives*, not what it looks like.

**Work items:**
- Move the DB-backed rate limiter (`lib/rate-limit.ts`, `RateLimitEvent` table) to a Redis-backed
  sliding-window implementation — cheaper at volume and removes write pressure from the primary
  database on every rate-limited action.
- Add the Socket.IO Redis adapter so notifications/chat/typing-indicators work correctly across more
  than one app instance (today, `global.__io` only works because there's exactly one Node process;
  horizontal scaling breaks it silently otherwise).
- Introduce a real background job queue (e.g. BullMQ on Redis) replacing the M2-Phase-1 cron-sweep
  hack for offer expiry, escrow transfer-deadline flagging, and rate-limit cleanup — and move outbound
  email sending off the request path entirely into a queue worker, so a slow SMTP provider can never
  add latency to an API response (it's already non-fatal per M1's design; this makes it non-blocking
  too).
- Database query/index review informed by whatever Phase 1's observability surfaces as slow —
  concretely, revisit `Listing`/`Offer`/`Escrow`/`Transaction` composite indexes once real query
  patterns are known rather than guessing upfront.

**UX/UI:** no new user-facing UI. `/admin/system` (Phase 1) gains queue-health readouts: jobs
pending, failed, retrying, and their age.

**Done when:** rate limiting and real-time features both behave correctly with more than one app
instance running; background jobs run through a queue with retry/backoff instead of a bare HTTP call
on a timer; email sending no longer touches the request/response path.

---

## Phase 4 — Fraud & Risk Management

**Data model:** `DeviceFingerprint { userId, fingerprintHash, firstSeenAt, lastSeenAt }`, `RiskScore {
userId, score, factors (Json), computedAt }`. Extends M2's `SecurityFlag` with a `severity` field and
a new source: auto-generated flags from velocity/anomaly rules rather than only rate-limiter/
moderation events.

**API routes:** risk scoring runs as a background job (Phase 3's queue), triggered on signup, listing
creation, and escrow funding — not a synchronous API call. `GET /api/admin/risk/flagged-users`
surfaces accounts above a score threshold.

**Detection rules to start with** (each is a factor feeding the composite score, not a hard block):
multiple accounts sharing a device fingerprint, a new account immediately listing at an unusually high
price, a buyer and seller pair with a suspiciously fast fund→dispute cycle, repeated disputes
involving the same user, rapid sequential escrow funding from a single newly-verified account.

**UX/UI:** `/admin/risk` — a queue in the same visual family as `/admin/security` (M2): a table of
flagged users sorted by score, each row expandable to show the contributing factors in plain language
("3 accounts share this device", "2 disputes opened against this user in 7 days"), with actions to
escalate to ban (reusing the existing admin ban primitive) or dismiss as a false positive.

**Done when:** multi-accounting and fund-then-dispute scam patterns get surfaced to admins
automatically instead of relying on user reports or chance; the risk queue is genuinely actionable
(admins can tell *why* an account was flagged without digging through raw data).

---

## Phase 5 — Advanced Escrow & Trust

**Decision needed:** whether a platform-funded guarantee fund (making a buyer whole in a
confirmed-fraud case beyond the standard refund/dispute logic) is financially viable — this is a
business call, not an engineering one, and should be resolved before any "insurance" language reaches
users. The milestone-escrow and video-verification items below don't depend on that decision.

**Data model:** extend `Escrow` with `isHighValue` (computed from an admin-configurable amount
threshold in `PlatformSettings`) and `videoVerificationRequired`/`videoVerificationCompletedAt`. New
`EscrowMilestone { id, escrowId, description, amount, status (PENDING | RELEASED), completedAt }` for
splitting large sales into partial releases.

**API routes:** `POST /api/escrows/[id]/milestones` (seller proposes a split at listing/checkout time;
milestone amounts must sum to the total sale price), `POST
/api/escrows/[id]/milestones/[milestoneId]/release` (buyer-triggered partial release, same atomic
wallet-credit pattern as the existing `complete` route, scoped to one milestone's amount), `POST
/api/escrows/[id]/video-verification` (logs that a verification call was scheduled/completed — likely
via a third-party scheduling link rather than building video infrastructure in-house).

**UX/UI:**
- Checkout gains a milestone breakdown for listings above the high-value threshold: instead of one
  lump "Total" line, the buyer sees each milestone with its amount, still funded as a single upfront
  wallet debit (the split affects *release*, not funding — funding stays a single event to keep the
  buyer-pays-first guarantee simple).
- The escrow detail page swaps the linear `EscrowStepper` for the new milestone checklist component on
  these deals: each milestone shows its own release button (buyer-facing) once its precondition is
  met, rather than one all-or-nothing completion action.
- High-value escrows show an extra required step — "Verification call" — in the flow, linking out to
  a scheduling page; the stepper won't reach VERIFIED without it logged.

**Done when:** a seller can propose a milestone split on a high-value listing and get paid
incrementally as the buyer releases each portion; high-value escrows correctly gate on a logged
verification call before proceeding.

---

## Phase 6 — Search & Discovery

**Prerequisite:** this phase assumes the listing schema fields M2 identified as gaps (`niche`,
`language`, `country`, `tags`) have landed — if M2 shipped without them, add them here first.

**Data model:** `SavedSearch { id, userId, filters (Json), alertEnabled, lastNotifiedAt, createdAt }`.

**Decision needed:** which search engine to adopt. Meilisearch is a reasonable self-hosted default
given the platform already runs its own Node process and database rather than relying on managed
infra; Algolia/Typesense are viable alternatives if a managed service is preferred. This plan assumes
a self-hosted engine kept in sync with `Listing` writes via the Phase 3 job queue.

**API routes:** `GET /api/search` (full-text query + facet filters, backed by the search engine
rather than a raw SQL `WHERE`), `POST/GET/DELETE /api/saved-searches`, a background job (Phase 3)
that periodically re-runs active saved searches and notifies on new matches via the existing
notification system.

**UX/UI:**
- The browse page's search input becomes real full-text search (typo-tolerant, with a typeahead
  dropdown of suggested listings/platforms as the user types) instead of only filtering by exact
  platform match.
- The current inline filter row is replaced by the new faceted sidebar (platform, niche, language,
  country checkboxes; price and follower-count range sliders) — visible as a persistent left column on
  desktop, a slide-in sheet on mobile.
- A "Save this search" button appears whenever filters are active, with the new bell-toggle icon to
  enable/disable match alerts. `/dashboard/saved-searches` lists saved searches with edit/delete and
  the alert toggle.
- The listing detail page gains a "Similar listings" strip (same platform/niche, excluding the
  current one) at the bottom, sourced from the search engine's similarity/facet query rather than a
  bespoke recommendation system.

**Done when:** search returns relevant results with typo tolerance and sub-second latency at a
realistic listing volume; saved searches correctly notify users of new matches; the faceted sidebar
materially outperforms the old inline filter row for narrowing results.

---

## Phase 7 — Payments Expansion

**Data model:** a generalized `FiatPayment { id, userId, provider, providerPaymentId, amountUsd,
status, createdAt }` model (parallel to the existing `CryptoWallet` deposit path, not a replacement
for it). Add `User.displayCurrency` (a preference field only — the ledger stays USD internally; see
below).

**Decision made deliberately:** the platform ledger remains USD-denominated regardless of deposit
method or display preference. True multi-currency accounting (holding balances in multiple
currencies, FX risk on the platform's books) is a materially larger undertaking with real financial
risk and is explicitly out of scope here — `displayCurrency` only affects what's *shown*, via a
live FX rate lookup, never what's *stored or moved*.

**API routes:** `POST /api/wallet/deposit/card` (Stripe PaymentIntent, same shape as the existing
NOWPayments deposit flow), `POST /api/webhooks/stripe` (signature-verified, mirrors the
`lib/nowpayments.ts` HMAC pattern), a lightweight FX-rate endpoint or scheduled cache refresh backing
the display-currency conversion.

**UX/UI:**
- `DepositWidget` (M1) gains a third tab, "Card", alongside Crypto and Manual — standard Stripe
  Elements card form, instant confirmation (no waiting for on-chain confirmations, a genuinely
  different UX from the crypto path worth calling out to the user: "funds available immediately").
- A currency selector in `/settings` sets `displayCurrency`; wherever an amount is shown platform-wide,
  the new currency-display-suffix pattern (`$92.30 ≈ €85.10`) appends the converted figure without
  ever hiding or replacing the authoritative USD amount.

**Done when:** a user can deposit by card and see funds immediately available; display-currency
conversion is visibly present wherever amounts are shown, without altering any actual balance or
transaction math.

---

## Phase 8 — Growth & Marketing

**Data model:** `ReferralCode { userId, code (unique), createdAt }`, `Referral { id, referrerId,
refereeId, status (PENDING | REWARDED), rewardedAt }`, `PromoCode { code (unique), type
(PERCENT_OFF_FEE | FLAT_CREDIT), value, maxRedemptions, redemptionCount, expiresAt }`,
`PromoRedemption { promoCodeId, userId, redeemedAt }`.

**API routes:** referral attribution (`?ref=` query param → short-lived cookie → recorded on
registration), reward payout (wallet credit) triggered via the Phase 3 queue when a referee completes
their first escrow — not on signup alone, to avoid rewarding fake-account farming; promo code
validation + redemption at checkout and at deposit time; an abandoned-checkout job (Phase 3 queue)
that finds users who opened `/checkout/[id]` without funding within a configurable window and sends
one reminder email (reusing M1's non-fatal `sendEmail` pattern, never more than once per checkout).

**UX/UI:**
- `/dashboard/referrals` — a referral link + code with a copy button, a stats card (invited,
  converted, earned), and share shortcuts (copy link, prefilled share text).
- A promo code field on the checkout page and the deposit flow, using the new inline-validation
  pattern (checking → valid with a discount preview shown before confirming → invalid).
- **SEO**: per-listing dynamic `<meta>` tags via the Next.js Metadata API (title/description drawn
  from the actual listing, not a generic site-wide default), an Open Graph image using the listing's
  first screenshot for social share previews, a generated `sitemap.xml` covering active listings and
  blog posts, and `Product`/`Offer` JSON-LD structured data on listing detail pages for search-engine
  rich results.

**Done when:** referral links correctly attribute and reward only on a completed first escrow (not
signup); promo codes apply the right discount and respect redemption/expiry limits; abandoned
checkouts get exactly one reminder; listing pages validate as correct structured data and render
properly in social share previews.

---

## Phase 9 — Public API Platform

**Data model:** `ApiKey { id, userId, key (hashed), label, scopes (Json), lastUsedAt, createdAt,
revokedAt }`, `Webhook { id, userId, url, events (Json), secret, isActive }`.

**API routes:** a versioned public surface (`/api/v1/...`) wrapping existing internal logic behind
API-key authentication instead of session cookies — scoped to read-only operations first (a
seller's own listings, offers, escrows) before any write scopes are considered, since write access
from an external key materially raises the stakes of a leaked credential. Webhook delivery (Phase 3
queue, with retry/backoff and signed payloads mirroring the platform's own IPN-verification pattern)
for sellers who want programmatic notification of offer/escrow events instead of relying on email or
the in-app bell.

**UX/UI:** `/dashboard/developer` — API key management (generate, label, revoke; the key is shown
exactly once at creation via the new reveal-once panel, then only ever displayed masked), webhook
configuration (target URL, event-type checkboxes, secret reveal, a "send test event" button, and a
recent-deliveries log showing status codes and response times so integrators can self-diagnose).

**Done when:** an external integrator can authenticate with an API key and read their own
listings/offers/escrows; webhook deliveries fire reliably with retries and are inspectable from the
dashboard without needing to contact support.

---

## Phase 10 — Progressive Web App

**Data model:** `PushSubscription { id, userId, endpoint, keys (Json), createdAt }` — one row per
device/browser a user has enabled push on.

**Work items:** a web app manifest and service worker (offline app shell + static asset caching),
Web Push (Push API + VAPID keys) extending the existing in-app notification system so key events
(offer received, escrow stage changes) also reach a device when the app isn't open in a tab, not just
when it is.

**UX/UI:**
- An install prompt banner that respects the browser's native install-eligibility signal rather than
  forcing its own timing or nagging repeatedly.
- A notification-permission prompt triggered naturally at a meaningful moment (e.g. right after a
  user's first escrow funds) rather than on first page load, where it's reflexively dismissed.
- A push-notification settings section in `/settings` letting users choose which `NotificationType`
  categories should push to their device versus stay in-app-only.

**Done when:** the app is installable on both mobile and desktop; push notifications for key events
arrive on a subscribed device even with no tab open; users can control push granularity per
notification type.

---

## Phase 11 — Accessibility Hardening

This phase audits everything Milestones 1 and 2 already built rather than adding features — it
logically belongs after both.

**Work items:**
- Automated WCAG 2.1 AA scanning (axe-core) wired into CI, covering the major flows: auth forms, the
  listing creation wizard, checkout, escrow chat, DM threads, and the admin queues.
- A manual keyboard-only and screen-reader pass over the same flows, since automated tooling misses a
  meaningful share of real issues (focus order, meaningful reading order, live-region announcements
  for async updates like new chat messages or notification-bell count changes).
- Color contrast spot-check on the orange brand palette, specifically `brand-400`/`brand-500` used as
  text-on-white in several places — these are the values most likely to fall short of AA contrast
  ratios and may need a slightly darker text variant reserved for small text even where the lighter
  shade is fine for larger UI elements or backgrounds.
- Replace every native `confirm()`/`prompt()` call (`AdminActionButtons`, `EscrowActions`' cancel and
  dispute flows) with the new accessible `Dialog` component — native browser dialogs are technically
  accessible but visually inconsistent and offer no room for the additional context these
  confirmations often need (e.g. showing the actual refund amount in the cancel-escrow confirmation
  rather than a generic "Are you sure?").
- Accessible names for every icon-only control introduced across M1/M2: the watchlist heart, the
  notification bell, the mobile hamburger trigger, the star-rating input.

**UX/UI:** no new screens — this is a hardening pass. The one structural change is the dialog
replacement above, which affects the visual (not functional) behavior of several existing admin and
escrow actions.

**Done when:** automated axe-core checks pass with zero critical/serious violations across the
audited flows; every icon-only control has a correct accessible name; every confirmation dialog is
keyboard-operable, traps focus correctly, and returns focus to its trigger on close.

---

## Phase 12 — Admin & Ops Maturity

**Decision needed:** whether granular per-resource admin permissions (beyond M2's binary
Moderator/Admin split) are actually warranted — this depends entirely on how large the admin/mod team
grows. A team of a handful of trusted people likely doesn't need it; only build the `AdminPermission`
model below if that team has genuinely outgrown the two-tier system.

**Data model:** `FeatureFlag { key (unique), isEnabled, rolloutPercentage, description }`. Optionally,
if warranted per the decision above: `AdminPermission { adminId, resource, canRead, canWrite }`.

**API routes:** `GET/PUT /api/admin/feature-flags`; a permission-check middleware layered onto
existing admin routes only if the granular RBAC path is taken.

**UX/UI:**
- `/admin/feature-flags` — a simple table: key, description, an enabled toggle, and a 0–100%
  rollout-percentage slider for gradual feature rollouts (checked against a stable per-user hash so
  the same user consistently lands on the same side of the rollout rather than flapping per-request).
- `/admin/analytics` — a business-intelligence dashboard distinct from M1's operational stats page:
  a cohort retention chart (% of buyers/sellers still active N weeks after their first transaction), a
  funnel chart (signup → email-verified → first listing or first offer → first completed escrow), and
  a revenue trend line extending beyond M1's fixed 30-day figure to a selectable date range.
- If the granular RBAC path is taken: a permissions-matrix editor added to the admin user detail page
  from M2, resource rows against read/write toggles.

**Done when:** admins can toggle a feature on for a percentage of users without a deploy; the BI
dashboard answers "is the platform actually growing and retaining" in a way the raw operational
counters from M1/M2 don't; (if pursued) granular permissions correctly restrict admin actions by
resource.

---

## Consolidated Task Checklist

Flat list for quick scanning/ticking off, grouped by phase. Mirrors the detail above.

**Phase 1 — Observability & reliability**
- [ ] Error tracking wired into the Next.js app and the Socket.IO process, with request-scoped context
- [ ] Structured logging replacing ad hoc console calls
- [ ] `GET /api/health` (DB connectivity, socket connection count, uptime)
- [ ] External uptime monitor pointed at the health endpoint
- [ ] Automated MySQL backups + a tested, verified restore procedure
- [ ] Written incident runbook
- [ ] `/admin/system` ops dashboard (read-only status cards)

**Phase 2 — Compliance & legal**
- [ ] `TermsAcceptance`, `DataExportRequest`, `DataErasureRequest`, `CookieConsent` models
- [ ] Terms-acceptance route + version-bump re-acceptance gate (blocking, like email verification)
- [ ] Data export route (queued job → full archive → emailed download link)
- [ ] Deletion-request route with anonymization path for users with financial history
- [ ] Admin `/admin/legal` erasure-request review queue
- [ ] Cookie consent banner (Accept / Reject / Customize)
- [ ] `/settings/privacy` (download data, delete account)

**Phase 3 — Scale infrastructure**
- [ ] Redis-backed sliding-window rate limiter, replacing the DB-backed one
- [ ] Socket.IO Redis adapter for multi-instance support
- [ ] Background job queue (e.g. BullMQ) replacing the cron-sweep hack
- [ ] Outbound email moved off the request path into a queue worker
- [ ] Database index review based on real slow-query data from Phase 1
- [ ] Queue-health readouts on `/admin/system`

**Phase 4 — Fraud & risk management**
- [ ] `DeviceFingerprint`, `RiskScore` models; `SecurityFlag` gains `severity`
- [ ] Background risk-scoring job on signup, listing creation, escrow funding
- [ ] Velocity/anomaly detection rules (multi-account, fund-then-dispute, repeated-dispute pairs, etc.)
- [ ] `GET /api/admin/risk/flagged-users`
- [ ] `/admin/risk` queue (score, contributing factors, escalate/dismiss)

**Phase 5 — Advanced escrow & trust**
- [ ] Decide: is a platform guarantee fund financially viable? (business decision, not engineering)
- [ ] `Escrow.isHighValue`/video-verification fields; `EscrowMilestone` model
- [ ] Milestone propose/release routes (atomic partial wallet credit)
- [ ] Video-verification logging route (third-party scheduling link, not in-house video infra)
- [ ] Checkout milestone breakdown UI for high-value listings
- [ ] Milestone checklist component replacing the linear stepper on split escrows
- [ ] Required verification-call step gating VERIFIED on high-value escrows

**Phase 6 — Search & discovery**
- [ ] Confirm M2's listing field gaps (niche/language/country/tags) have landed; add if not
- [ ] Decide: which search engine (Meilisearch self-hosted vs. Algolia/Typesense managed)
- [ ] Search engine sync job on listing create/update
- [ ] `GET /api/search` (full-text + facets); `SavedSearch` model + CRUD routes
- [ ] Background job re-running saved searches and notifying on new matches
- [ ] Real full-text search bar + typeahead on `/listings`
- [ ] Faceted filter sidebar (desktop column / mobile sheet)
- [ ] Save-search button + alert bell-toggle; `/dashboard/saved-searches`
- [ ] "Similar listings" strip on listing detail

**Phase 7 — Payments expansion**
- [ ] `FiatPayment` model; `User.displayCurrency` field
- [ ] `POST /api/wallet/deposit/card` (Stripe) + `POST /api/webhooks/stripe`
- [ ] FX-rate lookup/cache for display-currency conversion (ledger stays USD — display only)
- [ ] "Card" tab on `DepositWidget`
- [ ] Currency selector in settings + currency-display-suffix pattern everywhere amounts show

**Phase 8 — Growth & marketing**
- [ ] `ReferralCode`, `Referral`, `PromoCode`, `PromoRedemption` models
- [ ] Referral attribution (`?ref=` → cookie → recorded on signup) + reward-on-first-completed-escrow job
- [ ] Promo code validation/redemption at checkout and deposit
- [ ] Abandoned-checkout reminder job (one email max per checkout)
- [ ] `/dashboard/referrals` (link, stats, share shortcuts)
- [ ] Promo code field with inline validation on checkout/deposit
- [ ] Per-listing dynamic meta tags + Open Graph image + `sitemap.xml` + `Product`/`Offer` JSON-LD

**Phase 9 — Public API platform**
- [ ] `ApiKey`, `Webhook` models
- [ ] Versioned `/api/v1/...` surface with API-key auth, read-only scopes first
- [ ] Webhook delivery via the job queue (signed payloads, retry/backoff)
- [ ] `/dashboard/developer` (key management with reveal-once, webhook config, delivery log)

**Phase 10 — Progressive Web App**
- [ ] Web app manifest + service worker (offline shell, asset caching)
- [ ] `PushSubscription` model; Web Push (VAPID) wired into the existing notification system
- [ ] Install prompt banner (respects native install-eligibility timing)
- [ ] Notification-permission prompt at a meaningful moment, not on load
- [ ] Push granularity controls in `/settings`

**Phase 11 — Accessibility hardening**
- [ ] axe-core automated scanning in CI across the major flows
- [ ] Manual keyboard-only + screen-reader pass (focus order, live-region announcements)
- [ ] Color contrast fix pass on the orange palette (`brand-400`/`500` as text-on-white)
- [ ] Accessible `Dialog` component, replacing all native `confirm()`/`prompt()` usage
- [ ] Accessible names on every icon-only control (heart, bell, hamburger, star rating)

**Phase 12 — Admin & ops maturity**
- [ ] `FeatureFlag` model + admin toggle/rollout-slider route and UI
- [ ] Decide: is granular per-resource admin RBAC actually needed yet?
- [ ] (If yes) `AdminPermission` model + permission-check middleware + matrix editor UI
- [ ] `/admin/analytics` BI dashboard (cohort retention, signup→escrow funnel, revenue trend range)
