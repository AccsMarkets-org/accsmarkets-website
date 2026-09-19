# AccsMarkets — Milestone 2 Plan

Planning document only — nothing in this file has been built. It supersedes `REMAINING_TASKS.md`
(kept in the repo for history) with a fuller plan: data model additions, API routes, and — new in
this pass — an explicit UX/UI spec per feature, since Milestone 1 left UI details loose and this
time they're being defined up front.

## Context

Milestone 1 shipped the core marketplace loop: mandatory-verified auth, listings, offers, escrow
(5-stage), wallet/deposits/withdrawals, basic admin moderation, notifications, and DMs — all on the
orange/light design system. `REMAINING_TASKS.md` catalogued what's left. This document turns that
catalogue into an executable plan: grouped into build phases, each with the schema changes, API
surface, and concrete UI behavior needed, plus a closure checklist for the handful of loose ends
Milestone 1 itself left open (DOMPurify wiring, admin escrow controls, dispute resolution, mobile nav,
proactive expiry sweeps, test coverage).

**Suggested sequencing rationale:** close M1's own loose ends first (they're small and some are
security-relevant), then trust/content features (reviews, reports, watchlist — additive, low schema
risk, clear user value), then the two revenue-facing tracks (subscriptions, then promotions), then
KYC/badges, then the back-office tracks (support, announcements, admin completeness, dispute
resolution, blog), then profile polish and infra last. Phases are independent enough to reorder if
priorities differ — dependencies are called out explicitly where they exist.

---

## Phase Overview

| # | Phase | Depends on |
|---|---|---|
| 1 | M1 hardening & loose-end closure | — |
| 2 | Account security (2FA, sessions, lockout) | — |
| 3 | Trust & content (reviews, reports, watchlist) | — |
| 4 | Subscriptions (purchase flow + admin) | — |
| 5 | Listing promotions & analytics | Phase 4 (shares payment pattern) |
| 6 | KYC & identity (phone + AI pipeline) | — |
| 7 | Achievement badges (auto-award engine) | Phase 3 (reviews feed trust signals) |
| 8 | Support & comms (tickets, announcements, email templates) | — |
| 9 | Dispute resolution (evidence + admin ruling) | Phase 1 (admin escrow controls) |
| 10 | Admin panel completeness | Phases 1, 4, 5, 6, 8, 9 (surfaces their queues) |
| 11 | Blog system | — |
| 12 | Profile & polish (avatar, completeness, social links, dark mode toggle) | — |
| 13 | Infra & ops (Docker, CI, cron consolidation) | Phase 1 (job runner scaffold) |

---

## Design System Extensions (new tokens/components needed across phases)

- **Generic `Stepper` component** — extract the visual pattern already in `EscrowStepper` (numbered
  circles + connecting bars, done/current/upcoming states) into a reusable `Stepper({ steps, labels,
  currentIndex })`. Reused for the KYC level tracker (Phase 6) instead of writing a second bespoke one.
- **`StarRating` component** — 5-icon row, `text-brand-500` fill for active, `text-surface-border`
  outline for inactive. Two modes: `interactive` (hover preview + click-to-set, for the review form)
  and `static` (read-only, for review lists and profile summaries).
- **`AchievementBadge` component** — same pattern as the existing `VerifiedBadge` (SVG icon + color
  from a `lib/constants.ts` map), one entry per achievement type: RISING_STAR / POWER_SELLER /
  TOP_SELLER / LEGEND (star-tier icons, escalating fill), BIG_EARNER / WHALE (coin icon, escalating
  fill), FIVE_STAR_SELLER / FAST_RESPONDER / TRUSTED_SELLER (admin-assigned, distinct icon each).
  Rendered as a horizontal "badge shelf" (icon grid with hover tooltip) on profile and settings pages;
  at most one shown inline on listing cards to avoid clutter.
- **Promotion ribbon** — small absolute-positioned pill, top-left corner of `ListingCard`,
  `bg-brand-500 text-white`, reused for FEATURED_BOOST/PREMIUM_FEATURED/PINNED with the label text
  swapped ("Featured" / "Premium" / "Pinned").
- **Announcement banner** — full-width bar directly under the navbar (both public and dashboard
  layouts), color from the existing `info`/`warning`/`success` tokens keyed by announcement type,
  dismiss (×) button that stores the dismissed id in `localStorage` so it doesn't reappear, optional
  inline link+CTA text.
- **New `StatusPill` style maps** in `lib/constants.ts`: `SUPPORT_TICKET_STATUS_STYLE`,
  `SUPPORT_PRIORITY_STYLE`, `REPORT_STATUS_STYLE`, `DISPUTE_STATUS_STYLE` — same pattern as the
  existing listing/offer/escrow maps, no new component needed (reuses `StatusPill`).
- **Subscription plan card** — parameterized version of the landing page's pricing card
  (`components/landing/LandingSections.tsx` → `PricingSection`), adding a "Current plan" visual state
  (highlighted border + pill badge instead of a CTA button) for use on `/settings/subscription`.

---

## Phase 1 — M1 Hardening & Loose-End Closure

Closes everything flagged in `REMAINING_TASKS.md` §1. No new user-facing features; mostly
correctness and completeness of what already shipped.

**Work items:**
- Wire `isomorphic-dompurify` into every render path that shows user-generated text as HTML or
  raw text-in-a-styled-context: listing descriptions, DM/escrow chat messages, support ticket bodies
  (once Phase 8 exists). Sanitize on write (server, before storing) rather than only on read, so
  stored data is safe by default.
- **Admin escrow workflow UI**: extend `EscrowActions` with an `isAdmin` prop so an admin viewing an
  escrow they aren't a party to still sees stage-appropriate buttons, each labeled "(as admin)" to
  make the acting-on-behalf-of-someone-else nature obvious. No new page required — the existing
  `/dashboard/escrows/[id]` route already permits admin viewing; it just needs the action buttons.
- **Job runner scaffold**: a single scheduled task (documented as a cron entry, not built into the
  app itself) that hits an internal `/api/internal/sweep` route protected by a shared secret header,
  covering: offer expiry (flip stale `PENDING` → `EXPIRED` proactively instead of only on read),
  escrow transfer-deadline handling (notify both parties when `transferDeadline` passes without
  completion — does not auto-cancel, just flags for admin attention), and `RateLimitEvent` cleanup
  (bulk-delete rows older than the longest rate-limit window in use).
- **Mobile nav** for dashboard and admin sidebars: hamburger trigger below the `md` breakpoint, opens
  the existing nav list as a slide-in drawer (overlay + backdrop-click-to-close), same interaction
  pattern already used for `NavbarUserMenu`'s dropdown (no new dependency).
- **Baseline test suite**: not full coverage, but a starting harness — unit tests for the pure
  functions that are highest-consequence if wrong (`lib/fees.ts` fee math, `lib/escrow-state-machine.ts`
  transitions, `lib/moderation.ts` scoring, `lib/nowpayments.ts` signature verification) plus one
  integration test exercising the full escrow fund→complete happy path against a test database.

**UX/UI:** No new screens. The only visible change is admin users now seeing escrow action buttons
on escrows they're moderating.

**Done when:** DOMPurify runs on every stored user-text field; an admin can drive an escrow through
every stage from its detail page; a scheduled sweep call expires stale offers and flags overdue
transfers; dashboard/admin are usable on a phone-width viewport; the new test suite passes in CI
(ties into Phase 13).

---

## Phase 2 — Account Security

**Data model:**
- `TwoFactorAuth` model: `userId` (unique), `secret` (encrypted, reuse the AES-256-GCM pattern from
  `lib/credentials-crypto.ts`), `backupCodes` (JSON array of hashed codes), `enabledAt`.
- `Session` model already exists (NextAuth) but is JWT-strategy today, meaning there's no queryable
  server-side session list. Switching to (or supplementing with) database sessions — or, cheaper,
  storing a lightweight `ActiveSession { id, userId, userAgent, ip, lastSeenAt, createdAt }` row
  per login purely for the "view/revoke sessions" UI, independent of NextAuth's own JWT — is a design
  decision to make at implementation time; the DB-row approach avoids touching the auth strategy.
- `PlatformSettings.requireEmailVerification`-style fields for lockout: `maxLoginAttempts` (default 5),
  `loginLockoutMinutes` (default 15); a `LoginAttempt { email, ip, success, createdAt }` log table to
  compute recent failures against.

**API routes:** `POST /api/auth/2fa/setup` (returns QR code data URI + secret + backup codes),
`POST /api/auth/2fa/verify` (confirms setup with a 6-digit code), `POST /api/auth/2fa/disable`
(requires password + current code), `GET /api/auth/sessions`, `DELETE /api/auth/sessions/[id]`,
`POST /api/auth/sessions/revoke-others`.

**UX/UI:**
- `/settings/security` — two cards. **Password**: current/new/confirm fields, same `Input` styling
  as elsewhere. **Two-factor authentication**: a status row (`StatusPill` Enabled/green or
  Disabled/muted) with an Enable/Disable button. Enable opens a 3-step inline wizard (not a full-page
  navigation, matching the `ListingWizard` step-dot pattern): (1) QR code image + monospace secret
  fallback text with a copy button, (2) 6-digit code input to confirm the authenticator app is synced,
  (3) a backup-codes reveal screen (10 codes in a monospace grid, "Copy all" and "Download as .txt"
  buttons, a required "I've saved these" checkbox before the Finish button enables). Disable is a
  confirmation modal requiring password + current TOTP code.
- `/settings/sessions` — list of `Card` rows, one per active session: a device/browser guess parsed
  from user-agent (e.g. "Chrome on Windows"), masked IP (`203.0.113.•••`), relative last-active time,
  a "This device" tag on the current session (no revoke button on that one), and a `Revoke` button
  (danger variant, confirm dialog) on every other row. A "Revoke all other sessions" button sits above
  the list, right-aligned.
- Login flow gains a lockout message: after `maxLoginAttempts` failures, the error banner (same slot
  used today for `INVALID_CREDENTIALS` etc.) shows "Too many attempts — try again in N minutes"
  instead of the generic invalid-credentials message.

**Done when:** a user can enable/disable 2FA and it's enforced at login (credentials flow prompts for
a 6-digit code when enabled, before issuing a session); backup codes work as a one-time bypass; the
sessions page accurately lists and can revoke sessions; repeated failed logins lock out for the
configured window.

---

## Phase 3 — Trust & Content (Reviews, Reports, Watchlist)

**Data model:**
- `Review { id, escrowId, reviewerId, revieweeId, rating (1-5 Int), comment (Text?), createdAt }`
  with `@@unique([escrowId, reviewerId])` to enforce one review per party per escrow.
- `Report { id, reporterId, targetType (LISTING|USER|MESSAGE), targetId, reason (enum: SCAM |
  FAKE_ACCOUNT | INAPPROPRIATE_CONTENT | SPAM | HARASSMENT | OTHER), details (Text), status (enum:
  PENDING | REVIEWING | RESOLVED | DISMISSED), resolutionAction (String?), createdAt, resolvedAt }`.
- `Watchlist { id, userId, listingId, createdAt }` with `@@unique([userId, listingId])`.

**API routes:** `POST/GET /api/reviews`, `POST /api/reports`, `GET/PATCH /api/admin/reports/[id]`,
`GET/POST /api/watchlist`, `DELETE /api/watchlist/[listingId]`.

**UX/UI:**
- **Reviews**: on the escrow detail page, once `status === COMPLETED` and the current user hasn't
  reviewed yet, a "Leave a review" `Card` appears below the stepper — `StarRating` (interactive) +
  optional `Textarea`, submit button. After submitting, that card is replaced by a read-only "Your
  review" display. If the counterparty has also reviewed, a second read-only "Their review" card
  shows alongside it (two-column on desktop, stacked on mobile).
  On the seller profile page, a new "Reviews" section appears below the listings grid: a headline
  (`★ 4.8 · 23 reviews`, `StarRating` static + count), then a paginated list of review cards
  (reviewer avatar/name, static star row, comment, relative date).
- **Reports**: a small flag/report affordance appears in three places — the seller card on a listing
  detail page, the header of a public seller profile, and a per-message hover action inside DM/escrow
  chat. All three open the same modal: reason `<select>`, details `Textarea`, submit → toast
  confirmation ("Report submitted — our team will review it"), no other visible change for the
  reporter.
  Admin gets `/admin/reports`: same queue-card pattern as `/admin/deposits` — one card per report
  (reporter, target link, reason, details, status pill) with contextual `AdminActionButtons`
  (`Start review`, `Dismiss`, `Resolve`, and the three enforcement actions `Ban user` / `Warn user` /
  `Remove listing`, each already implemented as admin primitives from Phase 1 of Milestone 1's admin
  work — this phase just adds the report-triggered entry point).
- **Watchlist**: every `ListingCard` gets a heart icon top-right (outline default, filled
  `text-brand-500` when saved), optimistic toggle on click (no navigation, no full page reload). A new
  `/watchlist` dashboard page reuses the same card grid as `/listings`, with an empty state (icon +
  "Nothing saved yet" + a Browse listings CTA) when the list is empty.

**Done when:** both parties on a completed escrow can leave one review each and see them on the
seller's public profile with a correct average; reports can be filed from all three entry points and
resolved from the admin queue with the enforcement actions actually taking effect (ban/warn/suspend
reuse the Milestone-1 admin primitives); the watchlist heart toggles instantly and the saved-listings
page reflects it.

---

## Phase 4 — Subscriptions (Purchase Flow)

**Data model:** no new models — `SubscriptionPlan` and `User.subscriptionPlanId` /
`subscriptionExpiresAt` already exist from Milestone 1. This phase is the *purchase flow* those
fields were seeded for but never wired to payment.

**API routes:** `POST /api/payments/subscribe` (creates a NOWPayments payment for the selected plan,
same pattern as `POST /api/wallet/deposit`), `GET /api/payments/subscribe/status` (polls payment
state), extending the NOWPayments IPN handler to also branch on subscription-type payments and, on
success, set `subscriptionPlanId` + `subscriptionExpiresAt` (+30 days) and emit
`subscription_activated`.

**UX/UI:**
- `/settings/subscription` — a summary `Card` at top: current plan name, price, "renews {date}" (or
  "Free forever" for the FREE plan), and a listing-usage bar (`3 / 15 listings used`, a slim
  progress bar using the `brand-500` fill). Below it, a 4-card grid visually identical to the
  landing page's `PricingSection`, but plan-aware: the current plan's card shows a "Current plan"
  pill instead of a CTA button; other cards show "Upgrade" or "Downgrade" depending on price
  ordering. Clicking a plan opens the same crypto-payment modal pattern as `DepositWidget`
  (network select → generate payment → show address/QR → poll for confirmation → success state with
  a small confetti-free checkmark animation, then redirect back to `/settings/subscription` with the
  new plan reflected).
- Admin `/admin/subscriptions`: a table (not cards, since it's dense tabular data — plan, price,
  activated date, expiry, user) with a plan filter dropdown and per-row actions: `Extend +30 days`,
  `Cancel` (reverts to FREE at period end, not immediately), `Change plan` (dropdown + confirm,
  for manual admin activation without payment).

**Done when:** a user can upgrade from FREE to a paid plan via crypto payment and the new listing
limit/escrow fee rate takes effect immediately on confirmation; downgrading is possible; admin can
manually extend, cancel, or reassign any user's plan with the change reflected instantly in listing
creation limits and escrow fee calculation.

---

## Phase 5 — Listing Promotions & Analytics

**Data model:** add to `Listing`: `isFeatured (Boolean)`, `isPremiumFeatured (Boolean)`,
`isPinned (Boolean)`, `featuredUntil (DateTime?)`, `pinnedUntil (DateTime?)`, `lastBumpedAt
(DateTime?)`. Add `promotionPrices` fields to `PlatformSettings` (or a small dedicated
`PromotionPricing` singleton row) so prices are admin-configurable rather than hardcoded.

**API routes:** `POST /api/listings/[id]/promote` (body: promotion type; validates wallet balance,
debits it, creates a `Transaction(type: PROMOTION)`, sets the relevant flag/expiry), `POST
/api/listings/[id]/bump` (validates 24h cooldown via `lastBumpedAt`, debits wallet, creates
`Transaction(type: BUMP)`, updates `createdAt`-equivalent sort key), `GET /api/listings/[id]/analytics`
(view count over time — can start as a single cumulative `viewCount` readout, richer time-series is a
stretch goal).

**UX/UI:**
- On `/dashboard/listings`, each `ListingManageCard` for an `ACTIVE` listing gets a `Promote` button.
  Clicking opens a modal with four option cards (Featured Boost $9.99/7d, Premium Featured $19.99/14d,
  Pinned $4.99/7d, Bump $2.00, 24h cooldown) — each showing an icon, price, duration, and one-line
  benefit ("Appears above regular listings for 7 days"). Selecting one shows a confirm step with the
  wallet balance check inline; on success, a toast confirms and the ribbon (see Design System
  Extensions) appears on that listing's card immediately.
- On `/listings` (browse) and the homepage's featured section, sorting changes to: Premium Featured →
  Featured → Pinned → regular (by existing sort param). Promoted cards get the ribbon plus a subtle
  `border-brand-300` + soft glow treatment so they read as visually distinct without being garish.
- Listing detail page shows a small "Boosted" pill near the platform tag when any promotion is active.
- A lightweight analytics block appears on `ListingManageCard` (expandable) or as a small stats row
  on the listing's own management view: view count, offer count, days active.

**Done when:** a seller can purchase any of the four promotion types from their wallet, the effect
(sort position + visual treatment) is immediately visible on the public browse page, bump respects
its 24h cooldown, and promotion prices are read from admin settings rather than hardcoded.

---

## Phase 6 — KYC & Identity

**Data model:** `PhoneVerification { userId, phoneNumber, codeHash, expiresAt, verifiedAt }`.
`KycSubmission { id, userId, idFrontUrl, idBackUrl, selfieUrl, ocrName, ocrDob, ocrDocNumber,
ocrExpiry, kycScore (Float?), isLive (Boolean?), faceSimilarity (Float?), status (enum: PENDING |
UNDER_REVIEW | APPROVED | REJECTED), rejectionReason, createdAt, reviewedAt }`.

**API routes:** `POST /api/verification/phone/send-code`, `POST /api/verification/phone/confirm`
(sets `User.kycLevel = PHONE`), `POST /api/kyc/verify` (uploads to Cloudinary, calls OpenKYC if
`OPENKYC_SERVER_URL` is configured, auto-approves at `kycScore >= 0.70 AND isLive AND
faceSimilarity >= 0.60`, otherwise queues `UNDER_REVIEW`), `GET/PUT /api/admin/verification/[id]`
(approve/reject).

**UX/UI:**
- `/settings/verification` — a horizontal `Stepper` (the new generic component) showing
  NONE → EMAIL → PHONE → ID_VERIFIED with the user's current level highlighted. Below it, whichever
  step is next renders its form: **Phone step** — phone number input + "Send code" button → 6-digit
  code input appears → confirm. **ID step** (only unlocked after PHONE) — three upload dropzones
  (ID front, ID back, selfie) with live thumbnail previews and a submit button; once submitted, the
  form is replaced by a status card (Pending Review, with an estimated turnaround note, or Approved
  with a green check, or Rejected with the reason and a "Resubmit" button).
- Once phone verification exists, the listing-creation KYC gate (currently a documented no-op at
  EMAIL level) is raised to require `PHONE` or above, matching the original spec.
- Admin `/admin/verification` — a queue identical in structure to `/admin/deposits`: one card per
  pending `KycSubmission` showing the three images as click-to-enlarge thumbnails, the OCR-extracted
  fields (if AI ran) and the score/liveness/similarity readout, with `Approve`/`Reject` (reject
  requires a reason, shown back to the user).

**Done when:** a user can verify a phone number and see their KYC level update immediately; ID
submission either auto-approves per the threshold or lands in the admin queue; listing creation
correctly blocks below PHONE level; admin can review and act on submissions with images visible
inline.

---

## Phase 7 — Achievement Badges

**Data model:** `UserAchievementBadge { id, userId, badge (enum: RISING_STAR | POWER_SELLER |
TOP_SELLER | LEGEND | BIG_EARNER | WHALE | FIVE_STAR_SELLER | FAST_RESPONDER | TRUSTED_SELLER),
awardedAt }` with `@@unique([userId, badge])`. (The single `User.verifiedBadge` enum from Milestone 1
stays as-is for the Twitter-style NONE/BLUE/GOLD/GREY checkmark — this is a separate, additive
system for the multi-badge achievement shelf.)

**API routes:** no new user-facing routes — a `checkAndAwardBadges(userId)` function runs inside the
existing escrow-completion transaction (`/api/escrows/[id]/complete`), checking completed-deal count
and total volume against the thresholds and inserting any newly-earned rows. `PUT
/api/admin/users/[id]` gains an additional action variant for the three admin-assignable badges
(FIVE_STAR_SELLER, FAST_RESPONDER, TRUSTED_SELLER).

**UX/UI:**
- The `AchievementBadge` shelf (icon grid, hover tooltip explaining "how earned" and the date)
  appears on: the public seller profile (below the trust-tier line), and the user's own
  `/dashboard/settings` status card ("Badges earned" section). Listing cards show at most one
  achievement icon inline (highest-tier earned) next to the verified checkmark, to avoid visual
  clutter.
- Admin user detail page (Phase 10) gets a "Badges" panel: auto-awarded badges shown read-only with
  their earned date; the three admin-assignable ones as toggles.
- A small toast/notification fires the moment a badge is newly earned ("🏅 You just earned Power
  Seller!"), reusing the existing notification system (`type: SYSTEM`).

**Done when:** completing escrows correctly awards RISING_STAR/POWER_SELLER/TOP_SELLER/LEGEND at the
5/25/100/500-deal thresholds and BIG_EARNER/WHALE at the $1k/$10k volume thresholds, badges display
on profiles and (capped at one) on listing cards, and admins can assign/revoke the three manual
badges.

---

## Phase 8 — Support & Comms

**Data model:** `SupportTicket { id, userId, subject, status (enum: OPEN | IN_PROGRESS | RESOLVED |
CLOSED), priority (enum: LOW | MEDIUM | HIGH | URGENT), createdAt, updatedAt }`, `SupportMessage {
id, ticketId, senderId, senderRole (USER | ADMIN), content, createdAt }`. `Announcement { id, type
(INFO | WARNING | SUCCESS), message, linkUrl, linkText, targetAudience (ALL | BUYER | SELLER),
isActive, startsAt, endsAt }`. `EmailTemplate { id, slug (unique), subject, html, updatedAt }` seeded
with the 12 slugs already used by `lib/email-templates.ts`, which becomes a thin wrapper that reads
from this table (falling back to its current hardcoded functions if a row is missing, so nothing
breaks mid-migration).

**API routes:** `GET/POST /api/support/tickets`, `POST /api/support/tickets/[id]/messages`,
`GET/PUT /api/admin/support/[id]`, `GET /api/announcements`, `PUT/DELETE
/api/admin/announcements/[id]`, `GET/PUT /api/admin/email-templates`, `POST
/api/admin/users/[id]/notify`, `POST /api/admin/test-email`.

**UX/UI:**
- `/support` — a "New ticket" button opens a form (subject, priority `<select>`, message
  `Textarea`) inline at the top; below it, existing tickets render as `Card` rows (subject, status
  pill, priority pill, relative last-updated) linking to `/support/[id]`, which reuses the exact chat
  layout already built for `EscrowChat` (message list + composer), with admin replies visually
  tagged "⚡ Support" the same way admin escrow messages are tagged today.
  Admin `/admin/support` — tabbed by status (Open / In Progress / Resolved / Closed), same queue-card
  pattern as reports/deposits; opening a ticket reuses the same thread component with an
  admin-only status `<select>` and priority `<select>` pinned above the message list.
- **Announcements**: a banner component mounts in both the public and dashboard root layouts,
  directly under the navbar — full width, colored per type, dismiss (×) stored in `localStorage` by
  announcement id. Admin `/admin/announcements` is a simple list + form (type, message, optional
  link+text, audience `<select>`, start/end datetime pickers, active toggle) with inline edit/delete.
- **Email templates**: `/admin/email-templates` — a two-pane layout: left is a list of the 12 slugs,
  right is the editor for whichever is selected (subject input, HTML `<textarea>` in a monospace
  font, a "Preview" toggle that renders the current HTML into a sandboxed `<iframe>`, Save button,
  and a "Send test to me" button that fires the template at the logged-in admin's own email).

**Done when:** users can open and reply to support tickets with admins responding through the same
thread; announcements display correctly per audience and can be dismissed; admins can edit any of
the 12 email templates and the change takes effect on the next send without a deploy.

---

## Phase 9 — Dispute Resolution

Depends on Phase 1's admin escrow controls (the ruling actions live in the same surface).

**Data model:** extends the existing `Dispute` model (already has `reason`, `resolution`,
`resolvedAt` sitting unused since Milestone 1) with `DisputeEvidence { id, disputeId, userId,
statement (Text, max 3000 chars per spec), submittedAt }` (one row per party, so both sides can
submit exactly once) and adds `UNDER_REVIEW` as an active intermediate status an admin can set before
ruling.

**API routes:** `PUT /api/escrows/[id]/dispute/evidence` (each party submits their statement once),
`PUT /api/admin/disputes/[id]` (`mark_review`, `close`, `resolve` with a required winner + resolution
notes).

**UX/UI:**
- On the escrow detail page, once `status === DISPUTED`, an "Submit your evidence" `Textarea`
  (3000-char limit, live counter) appears for each party who hasn't submitted yet; once submitted, it
  becomes a read-only display of what they said (and the counterparty's statement, once submitted,
  shows alongside it).
- New admin pages `/admin/disputes` (queue, tabbed OPEN / UNDER_REVIEW / CLOSED — same card pattern
  as reports) and `/admin/disputes/[id]` (full detail: escrow summary, both evidence statements
  side-by-side, a link to view the full escrow chat history inline, and a resolution action bar at
  the bottom — "Rule for buyer (refund)" / "Rule for seller (payout)" / "Close without action", each
  requiring a resolution-notes field before it can be submitted). Ruling for the buyer triggers the
  same refund transaction logic as `cancel`; ruling for the seller triggers the same release logic as
  `complete` — both reused, not reimplemented.
- Both parties get an email + notification when the dispute resolves, stating the outcome plainly.

**Done when:** both parties can submit one evidence statement each; an admin can move a dispute
through OPEN → UNDER_REVIEW → resolved with a binding buyer/seller ruling that correctly moves money
via the existing refund/release paths; both parties are notified of the outcome.

---

## Phase 10 — Admin Panel Completeness

Pulls together the admin surfaces that earlier phases produce queues for, plus the panels that don't
depend on any single feature phase.

**Data model:** `SecurityFlag { id, type (e.g. FAILED_LOGIN_BURST | RATE_LIMIT_TRIP |
MODERATION_BLOCK), userId?, ip?, metadata (Json), status (OPEN | DISMISSED), createdAt }` — populated
by hooking into the existing rate-limiter and moderation functions to log rather than only enforce.
Expand `PlatformSettings` with the full field set noted as missing in `REMAINING_TASKS.md`
(`platformUrl`, `contactEmail`, `supportTelegram`, `registrationStatus` enum replacing the current
bool, `maxLoginAttempts`/`loginLockoutMinutes` used by Phase 2, `autoApproveHighTrustScore`,
per-platform `minSubscribers`, `maxListingPrice`, `requireEscrowAlways`, `depositFeePercent`,
`promotionPrices`, `socialLinks`, `blogAutoPublish`/`blogDailyCount`/`blogPostTimes`). Add a
`Moderator` capability: either promote `Role` to a 3-value enum (`USER | MODERATOR | ADMIN`) with
moderators getting a scoped-down version of the admin layout (reports/listings/verification only, no
financial or settings access), or keep `Role` binary and add a separate `isModerator` flag with
route-level scope checks — the enum approach is cleaner and matches the original spec's role table.

**API routes:** `PUT /api/admin/security-flags/[id]`, `GET/PUT /api/admin/settings`, `GET
/api/admin/transactions`, `GET /api/admin/messages/conversations`, `GET /api/admin/wallets`, `GET
/api/admin/reports/export` (CSV), `GET /api/admin/users/export` (CSV), `PUT /api/admin/users/[id]`
gains a `make_moderator` / `remove_moderator` action.

**UX/UI:**
- `/admin/security` — queue-card pattern again (consistent with deposits/reports/disputes):
  flag type, affected user/IP, metadata summary, `Dismiss` action.
- `/admin/wallets` — one card per crypto network (TRC20/BEP20/ERC20/POLYGON/SOLANA) showing the
  configured receiving address, a generated QR code image, and an inline edit field + Save.
- `/admin/settings` — a single form organized into collapsible sections matching the
  `PlatformSettings` field groups (General, Registration & Security, Escrow & Disputes, Deposits &
  Withdrawals, Promotion Pricing, Social Links, Blog Automation), each section independently
  collapsible with its own visual save-state indicator, one sticky "Save changes" footer bar.
- `/admin/transactions` — a dense table (not cards — this is the one admin view where tabular
  density matters more than scannability) with filters for type, status, date range, and a user
  search box; paginated; an `Export CSV` button top-right. The same export pattern (button →
  triggers a `GET .../export` download) is reused on `/admin/reports` and `/admin/users`.
- `/admin/messages` — a read-only monitor: a searchable table of conversations (DM threads and
  escrow threads together, distinguished by an icon), participant names, last-message preview,
  clicking opens a read-only viewer for DMs (no composer) or the existing `EscrowChat` component for
  escrow threads (where admin can already post, per Milestone 1).
- **Detail pages**: `/admin/users/[id]` (tabbed: Overview / Listings / Escrows / Transactions /
  Audit Log — consolidates everything currently only reachable via inline list-row actions, plus the
  new Badges panel from Phase 7), `/admin/listings/[id]` (Details / Offers / Escrows tabs),
  `/admin/disputes/[id]` (already specified in Phase 9).
- Moderator-role users get the same `AdminSidebar` shell but with financial/settings nav items
  hidden — only Reports, Listings, Verification (and Disputes, read-mostly) are reachable.

**Done when:** every admin queue introduced by earlier phases has a home in the sidebar; CSV exports
work for reports and users; platform settings are fully editable from the UI instead of only via
direct DB access; a moderator account can be created and is correctly scoped to a subset of the
admin panel.

---

## Phase 11 — Blog System

**Data model:** `BlogPost { id, slug (unique), title, content (Text), excerpt, metaTitle,
metaDescription, category (enum: YOUTUBE_GUIDES | TIKTOK_GUIDES | INSTAGRAM_GUIDES |
FACEBOOK_GUIDES | PLATFORM_NEWS | ESCROW_EDUCATION | SELLER_TIPS | BUYER_GUIDES | MARKET_TRENDS |
SUCCESS_STORIES), tags (Json), readingTime (Int), isPublished (Boolean), isAiGenerated (Boolean),
publishedAt, createdAt }`. `BlogTopicQueue { id, topic, category, status (PENDING | USED),
createdAt }`, seeded with 10+ starter topics. `BlogAutomationLog { id, topicId, status (SUCCESS |
FAILED), errorMessage?, postId?, createdAt }`.

**API routes:** `GET /api/blog/[slug]` (public), `POST /api/admin/blog/generate` (manually trigger a
dequeue+generate cycle), plus the twice-daily cron job (9 AM / 3 PM) hitting the same generation
logic — dequeues a topic, calls Gemini 1.5 Flash for title/content/excerpt/meta/tags/readingTime,
creates the `BlogPost` (`isPublished = platformSettings.blogAutoPublish`), logs the outcome.

**UX/UI:**
- `/blog` — a card grid (title, orange category pill, excerpt, reading time, date), category filter
  chips across the top, pagination at the bottom. Visually consistent with the `ListingCard` grid
  rhythm already established.
- `/blog/[slug]` — article layout: title, a meta row (category pill, date, reading time), prose body
  reusing the typography classes already defined in `components/ui/ProsePage.tsx`, a "related posts"
  strip (same category, excluding current) at the bottom.
- Admin `/admin/blog` — a table of posts (title, category, published toggle, an "AI" or "Manual" tag,
  date) with a `Generate now` button (manually triggers the dequeue cycle instead of waiting for the
  cron) and a `New post` manual-entry form as a fallback path when AI generation is disabled or the
  topic queue is empty.

**Done when:** the cron produces two new posts a day from the topic queue when enabled; `/blog` and
`/blog/[slug]` render correctly with working category filtering; an admin can manually trigger
generation or write a post by hand.

---

## Phase 12 — Profile & Polish

**Data model:** add to `User`: `bio (String?)`, `avatarUrl` (rename/reuse the existing `image`
field, populated via upload instead of only OAuth), `socialLinks (Json?)` (twitter/telegram/
instagram/youtube handles).

**API routes:** `PUT /api/user/avatar` (Cloudinary upload, same pattern as listing screenshots),
extend `PUT /api/user/me` to accept `bio` and `socialLinks`.

**UX/UI:**
- `/settings` gains: an avatar uploader at the top of the Account card (circular preview, click to
  replace, same upload flow as `ListingManageCard`'s screenshot uploader), a bio `Textarea`, and four
  social-handle inputs (Twitter/Telegram/Instagram/YouTube) with platform icon prefixes. Below the
  existing Account/Status cards, a new "Profile completeness" `Card`: a percentage progress bar
  (computed from: avatar set, bio set, ≥1 social link set, KYC level ≥ PHONE) with a checklist under
  it showing which items are done/missing, each linking to the relevant section.
- The public seller profile page renders the social links as a small icon row under the name/badge
  line, and the bio (if set) as a short paragraph above the listings grid.
- **Dark mode toggle**: the CSS variables for it already exist from Milestone 1 (`darkMode: "class"`
  is configured but nothing switches it) — this phase adds the actual toggle: a sun/moon icon button
  in the navbar and dashboard header, storing preference in `localStorage`, applying the `dark` class
  to `<html>`. This was explicitly out of scope for Milestone 1 ("light mode is the only active
  theme") — include it here only if still wanted; otherwise skip and leave dark mode dormant.

**Done when:** users can upload an avatar, write a bio, and add social links, all visible on their
public profile; the completeness bar accurately reflects profile state; (if pursued) the dark mode
toggle persists across sessions and every themed component renders correctly in both modes.

---

## Phase 13 — Infra & Ops

Not user-facing; supports everything above.

**Work items:**
- **Dockerfile + docker-compose.yml** — a multi-stage Dockerfile (build stage running `next build`,
  slim runtime stage running `node server.js`) plus a compose file wiring the app container to a
  MySQL service, for one-command self-hosting matching what the README currently only describes
  manually.
- **CI pipeline** (GitHub Actions or equivalent) — on every push/PR: install, `prisma generate`,
  `next build`, run the Phase 1 test suite. Optionally a second job running `prisma migrate deploy`
  against an ephemeral test database to catch migration errors before merge.
- **Cron consolidation** — formalize the Phase 1 job-runner scaffold and the Phase 11 blog cron into
  one documented external scheduler config (e.g. a `crontab` snippet or a serverless cron trigger)
  hitting the app's internal sweep endpoints, since the app itself has no built-in scheduler (by
  design — the custom `server.js` is a single long-lived process, not a place to also run cron
  timers reliably across restarts/deploys).

**Done when:** `docker compose up` brings up a working app + database from a clean checkout; CI
blocks merges that fail to build or fail tests; the two recurring jobs (sweep, blog generation) run
on a documented external schedule rather than living nowhere.

---

## Consolidated Task Checklist

Flat list for quick scanning/ticking off, grouped by phase. Mirrors the detail above.

**Phase 1 — M1 hardening**
- [ ] Wire DOMPurify into all user-generated-text render paths (sanitize on write)
- [ ] Admin-capable `EscrowActions` (stage-appropriate buttons for admin non-participants)
- [ ] Internal sweep endpoint: offer expiry, transfer-deadline flagging, rate-limit table cleanup
- [ ] Document/schedule the sweep as an external cron
- [ ] Mobile hamburger/drawer nav for dashboard + admin sidebars
- [ ] Baseline test suite (fees, state machine, moderation scoring, IPN signature, one e2e happy path)

**Phase 2 — Account security**
- [ ] `TwoFactorAuth` model + setup/verify/disable routes + backup codes
- [ ] Session tracking model + list/revoke routes
- [ ] Login attempt logging + lockout enforcement
- [ ] `/settings/security` (password + 2FA wizard)
- [ ] `/settings/sessions` (list + revoke + revoke-all-others)
- [ ] Login flow: 2FA code prompt + lockout messaging

**Phase 3 — Trust & content**
- [ ] `Review`, `Report`, `Watchlist` models
- [ ] Review submit/list routes + one-per-party enforcement
- [ ] Report submit route + admin resolve routes
- [ ] Watchlist add/remove/list routes
- [ ] `StarRating` component (interactive + static)
- [ ] Review form on completed escrow page; reviews section on seller profile
- [ ] Report modal (listing, profile, DM message entry points) + `/admin/reports`
- [ ] Watchlist heart on `ListingCard` + `/watchlist` page

**Phase 4 — Subscriptions**
- [ ] `POST /api/payments/subscribe` + status polling + IPN branch for subscription payments
- [ ] `/settings/subscription` (current plan summary + plan grid + crypto payment modal)
- [ ] `/admin/subscriptions` (extend / cancel / manually change plan)

**Phase 5 — Promotions & analytics**
- [ ] Listing promotion fields (`isFeatured`, `isPremiumFeatured`, `isPinned`, expiries, `lastBumpedAt`)
- [ ] Admin-configurable promotion pricing
- [ ] `POST /api/listings/[id]/promote`, `POST /api/listings/[id]/bump`, `GET .../analytics`
- [ ] Promote modal on `ListingManageCard`; promotion ribbon + sort weighting on browse
- [ ] "Boosted" indicator on listing detail; basic analytics block on manage view

**Phase 6 — KYC & identity**
- [ ] `PhoneVerification`, `KycSubmission` models
- [ ] Phone send-code/confirm routes; `POST /api/kyc/verify` with OpenKYC integration + auto-approve threshold
- [ ] `/settings/verification` (Stepper + phone form + ID upload + status card)
- [ ] Raise listing-creation KYC gate to PHONE level
- [ ] `/admin/verification` queue (images, OCR/score readout, approve/reject)

**Phase 7 — Achievement badges**
- [ ] `UserAchievementBadge` model
- [ ] `checkAndAwardBadges` hook in escrow completion (deal-count + volume thresholds)
- [ ] Admin action for the three manually-assignable badges
- [ ] `AchievementBadge` component + badge shelf on profile/settings; capped inline badge on listing cards
- [ ] Badges panel on admin user detail page; earned-badge notification toast

**Phase 8 — Support & comms**
- [ ] `SupportTicket`, `SupportMessage`, `Announcement`, `EmailTemplate` models (+ seed 12 template rows)
- [ ] Ticket create/reply routes; admin ticket routes
- [ ] Announcement CRUD + public fetch route
- [ ] Email template read/write routes; `lib/email-templates.ts` reads from DB with hardcoded fallback
- [ ] Admin notify-user and test-email routes
- [ ] `/support` + `/support/[id]` (reuses escrow chat pattern); `/admin/support`
- [ ] Announcement banner (public + dashboard layouts, dismissible, audience-targeted)
- [ ] `/admin/announcements`; `/admin/email-templates` (list + editor + preview + test-send)

**Phase 9 — Dispute resolution**
- [ ] `DisputeEvidence` model; `UNDER_REVIEW` status wired into the dispute lifecycle
- [ ] Evidence submission route; admin mark-review/close/resolve routes
- [ ] Evidence textarea on escrow detail page (per party, one-time, 3000-char limit)
- [ ] `/admin/disputes` queue (tabbed) + `/admin/disputes/[id]` (evidence + chat + ruling action bar)
- [ ] Ruling reuses existing refund/release transaction logic; resolution email/notification to both parties

**Phase 10 — Admin panel completeness**
- [ ] `SecurityFlag` model + logging hooks in rate-limiter/moderation
- [ ] Expanded `PlatformSettings` schema (full field set)
- [ ] `Role` enum expanded to include `MODERATOR` (or equivalent scoping mechanism)
- [ ] Security-flag, settings, transactions, messages-monitor, wallets, CSV-export routes
- [ ] `/admin/security`, `/admin/wallets`, `/admin/settings` (sectioned form), `/admin/transactions`
      (filterable table + export), `/admin/messages` (read-only monitor)
- [ ] `/admin/users/[id]`, `/admin/listings/[id]` detail/tabbed pages
- [ ] Moderator-scoped admin sidebar/nav

**Phase 11 — Blog**
- [ ] `BlogPost`, `BlogTopicQueue`, `BlogAutomationLog` models + starter topic seed
- [ ] Gemini-powered generation function + twice-daily cron wiring
- [ ] `GET /api/blog/[slug]`; `POST /api/admin/blog/generate`
- [ ] `/blog` (filterable grid) + `/blog/[slug]` (article layout)
- [ ] `/admin/blog` (table + generate-now + manual post form)

**Phase 12 — Profile & polish**
- [ ] `User.bio`, `socialLinks` fields; avatar upload route
- [ ] Avatar uploader, bio field, social links on `/settings`
- [ ] Profile-completeness progress bar + checklist
- [ ] Social links + bio rendered on public seller profile
- [ ] (Optional) dark mode toggle wired to the already-defined CSS variables

**Phase 13 — Infra & ops**
- [ ] Dockerfile + docker-compose.yml
- [ ] CI pipeline (build + test on push/PR, optional migration-check job)
- [ ] Documented external cron schedule for the sweep endpoint and blog generation
