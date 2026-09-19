# AccsMarkets — Milestone 4 Plan

Planning document only — nothing in this file has been built. Milestone 1 shipped the core loop,
`MILESTONE_2_PLAN.md` completes the original feature spec, and `MILESTONE_3_PLAN.md` covers the
maturity layer a live financial marketplace needs (reliability, legal, scale, fraud, advanced escrow,
search, payments expansion, growth, public API, PWA, accessibility, admin/ops maturity). **Milestone
4 is the expansion layer** — what a platform builds once product-market fit is proven and the
business is pushing into new markets, new customer segments, and new revenue lines. Nothing here is
implied by the original brief; it's the natural next stage for a marketplace that has already become
reliable, compliant, and growth-capable.

## Context

Where M3 was ordered by risk (know when things break → don't get sued → scale → protect the money),
M4 is ordered by **what unlocks what**: global-readiness and business-verification first, since
several later phases (financing, insurance, liquidity features for agencies) either need those
foundations or are meaningfully safer to build once compliance posture is mature. Several phases here
carry real legal/licensing/vendor weight — lending, insurance, arbitration, AML screening — and are
flagged as **decisions**, not just build items. Building the wrong one of these without the right
legal review is a materially bigger risk than shipping a feature late.

---

## Phase Overview

| # | Phase | Depends on |
|---|---|---|
| 1 | Internationalization (i18n/l10n) | — |
| 2 | Verified business accounts & team accounts (KYB) | M2's personal KYC pipeline (extends the pattern) |
| 3 | AML & tax compliance maturity | Phase 2 (org-level activity needs org-aware screening) |
| 4 | Marketplace liquidity features | — |
| 5 | Third-party insurance & arbitration | M3 Phase 5 (resolves its flagged guarantee-fund question) |
| 6 | Buyer/seller financing | Phase 3 (compliance posture must exist first) |
| 7 | ML & data platform | M3 Phase 4 (extends rule-based risk scoring) |
| 8 | Native mobile apps | M3 Phase 10 (PWA validates the mobile use case first) |
| 9 | API ecosystem growth | M3 Phase 9 (public API platform) |
| 10 | Community & lifecycle features | — |
| 11 | Platform governance & trust transparency | — |
| 12 | Global infrastructure & disaster recovery | M3 Phase 3 (scale infrastructure) |

---

## Design System Extensions (new tokens/components needed across phases)

- **Language switcher** — text-based dropdown in the navbar/footer (deliberately not flag icons,
  since flags map awkwardly to languages spoken across multiple countries).
- **Org/team switcher** — dashboard-header dropdown parallel to the existing account menu, for
  moving between a personal account and any organization the user belongs to.
- **KYB document stepper** — a business-document-flavored variant of M2's personal KYC stepper
  (registration certificate, proof of address, beneficial-ownership declaration in place of
  ID front/back/selfie).
- **Auction bid interface** — countdown timer, current-bid readout, bid input with live
  minimum-increment validation, reused across the listing card (compact) and detail page (full).
- **"Wanted" listing card** — visually distinct from a seller `ListingCard`: outlined/muted treatment
  instead of the solid card style, signaling "this is a request" rather than "this is for sale."
- **Small status badges** for "Insured" and "Financed" — same visual family as M2's promotion ribbon,
  different label/color, applied to escrow detail and listing cards where relevant.
- **Price-suggestion hint** — small muted helper text under the price input in the listing wizard
  ("Similar accounts sold for $X–$Y"), non-blocking, purely informational.
- **App directory card** — for the Phase 9 developer directory, similar rhythm to the blog index cards.
- **OAuth-style scope-grant screen** — standard third-party-authorization pattern: app name/icon,
  a checklist of requested permissions in plain language, Allow/Deny buttons.
- **Follow button** — same toggle interaction pattern as M2's watchlist heart, applied to seller
  profiles instead of listings.
- **Activity feed item** — chronological list item component (actor, action, timestamp), reused for
  both the personal activity feed and (opt-in, aggregated) the public trust report.
- **Onboarding tooltip callout** — non-blocking, dismissible, anchored near the relevant UI element;
  explicitly not a blocking multi-step modal, which tends to get reflexively clicked through.
- **NPS micro-survey** — a small 0–10 score picker + optional comment, dismissible, shown sparingly.
- **Public stat callout** — reuses the landing page's existing count-up stat component for the trust
  report page.

---

## Phase 1 — Internationalization (i18n/l10n)

**Decision needed:** URL-based locale routing (`/es/listings`) versus cookie-based locale with no URL
change. URL-based is materially better for per-locale SEO (each language gets its own indexable URL)
but is a bigger retrofit into the existing App Router structure; cookie-based is simpler to add but
gives up that SEO benefit. This plan assumes URL-based routing given the platform already invests in
SEO (M3 Phase 8). **Also flag:** RTL layout support (for Arabic, Hebrew, etc.) is a separate, larger
effort than left-to-right translation and should only be scoped once the initial target-language list
is decided — most initial expansions (Spanish, Portuguese, French, German) don't need it.

**Data model:** `User.preferredLocale`. `TranslationOverride { key, locale, value }` — a DB-backed
override sitting on top of static translation files, mirroring M2's `EmailTemplate` DB-with-fallback
pattern, so a bad machine translation can be patched without a redeploy.

**Work items:** adopt an i18n framework (e.g. `next-intl`) with locale-prefixed routing; extract every
user-facing string across the M1–M3 UI into translation files; machine-translate an initial pass for
the target languages, with the override table available for manual correction.

**API routes:** `PUT /api/admin/translations/[key]` (override editor).

**UX/UI:** language switcher (navbar + footer) persists the choice to `User.preferredLocale` for
logged-in users and a cookie for guests. Admin `/admin/translations` — a simple key/locale table
editor (search by key, edit the override value inline, save) for the string-override system.

**Done when:** the UI renders correctly in the initial target languages with all M1–M3 flows
(auth, listings, checkout, escrow, admin) fully translated, not just marketing pages; locale-prefixed
URLs are indexable per language; an admin can fix a bad translation without waiting on a deploy.

---

## Phase 2 — Verified Business Accounts & Team Accounts (KYB)

**Data model:** `Organization { id, name, ownerId, kybStatus (enum mirroring KycLevel's shape:
NONE|SUBMITTED|APPROVED|REJECTED), createdAt }`, `OrganizationMember { orgId, userId, role
(OWNER|ADMIN|MEMBER), invitedAt, joinedAt }`, `KybSubmission { id, orgId, businessName,
registrationNumber, country, documentUrls (Json), beneficialOwners (Json), status, reviewedAt,
rejectionReason }`. `Listing` and `Escrow` gain an optional `organizationId` so team-created activity
is attributable to the org rather than only the individual member who acted.

**API routes:** `POST/GET /api/organizations`, `POST /api/organizations/[id]/invite`, `POST
/api/organizations/[id]/members/[userId]/role`, `DELETE /api/organizations/[id]/members/[userId]`,
`POST /api/organizations/[id]/kyb`, `GET/PUT /api/admin/verification/kyb/[id]`.

**UX/UI:**
- An org switcher in the dashboard header (parallel to the account menu) lets a member move between
  their personal account and any organization they belong to; the dashboard's data (listings, offers,
  escrows) scopes to whichever context is active.
- `/dashboard/organization` — team member list (name, role, joined date), an "Invite by email" form,
  and role management (promote/demote, remove) restricted to OWNER/ADMIN members.
- `/dashboard/organization/verification` — the KYB document stepper: business registration document,
  proof of address, beneficial-ownership declaration, each with upload + preview, submit → status
  card (Pending / Approved / Rejected with reason) exactly mirroring the personal-KYC pattern from M2.
- Admin `/admin/verification` gains a KYB tab alongside the existing personal-KYC queue, same
  card-with-document-thumbnails review pattern.

**Done when:** a business can create an org, invite team members with scoped roles, submit KYB
documents, and get verified; listings and escrows created under the org context are correctly
attributed to the organization rather than the acting individual.

---

## Phase 3 — AML & Tax Compliance Maturity

**Decision needed:** engaging a real compliance vendor — a crypto transaction-monitoring provider
(e.g. Chainalysis-style) and a sanctions/PEP screening API (e.g. ComplyAdvantage-style) — is a
vendor/legal contract decision with real ongoing cost, not something to build from scratch. This
phase assumes vendor integration, not in-house screening logic.

**Data model:** `ComplianceScreening { userId, type (SANCTIONS|PEP), result, screenedAt, provider }`,
`TaxDocument { userId, orgId?, taxYear, formType (e.g. 1099-K, or jurisdiction-equivalent),
totalVolume, generatedAt, deliveredAt }`.

**API routes:** screening triggered on registration and periodically for active sellers (via M3's job
queue) rather than synchronously blocking signup; annual tax-document generation job for sellers
crossing a jurisdiction's reporting threshold.

**UX/UI:** invisible for most users — screening runs in the background. Sellers who cross a
tax-reporting threshold see `/settings/tax` appear, prompting for tax ID information (W-9/W-8-style,
jurisdiction-dependent) and later listing generated documents for download. Admin `/admin/compliance`
— a queue showing only screening *hits* (not clean results, to keep it actionable rather than noisy),
with escalation actions reusing the existing ban/flag primitives.

**Done when:** sanctions/PEP screening runs on relevant users without manual admin effort; sellers who
cross reporting thresholds are prompted correctly and receive accurate annual tax documents; the
compliance queue surfaces only genuine hits.

---

## Phase 4 — Marketplace Liquidity Features

**Data model:** `WantedListing { id, buyerId, platform, criteria (Json: min followers, niche, budget
range), status (OPEN|FULFILLED|CLOSED), createdAt }`. Extend `Listing` with `saleType (enum:
FIXED_PRICE|AUCTION)`, `auctionEndsAt`, `isPrivate`. New `AuctionBid { id, listingId, bidderId,
amount, placedAt }`, `PrivateListingInvite { listingId, invitedUserId }`.

**API routes:** wanted-listing CRUD + a "respond" action for sellers linking one of their own
listings or opening a DM thread; auction bid placement with minimum-increment validation and
anti-sniping auto-extension (a bid in the final minutes pushes `auctionEndsAt` back slightly);
private-listing invite management.

**UX/UI:**
- `/dashboard/wanted` — buyers post a request (platform, criteria, budget) using the new "Wanted"
  card styling; a "Wanted" tab on the public `/listings` page lets sellers browse open requests and
  respond.
- Auction listings replace the flat price with the new bid interface on both the card (compact:
  current bid + time remaining) and detail page (full: bid history, live-updating current bid,
  countdown, bid input) — live updates ride the existing Socket.IO infrastructure via a new `new_bid`
  event broadcast to an "auction room," the same room-per-entity pattern already used for escrow chat.
  When the auction ends, the winning bidder gets a time-limited "Start escrow" prompt (reusing the
  existing checkout flow with the winning bid as the amount) instead of the listing simply going
  inactive.
- Private listings are excluded entirely from public browse/search results (not soft-filtered — they
  genuinely don't appear in any public query) and are only reachable via a direct invite link sent to
  specific users.

**Done when:** buyers can post wanted-listings and receive seller responses; auctions run correctly
with live bid updates and anti-sniping extension, settling into a normal escrow checkout for the
winner; private listings are verifiably absent from public discovery.

---

## Phase 5 — Third-Party Insurance & Arbitration

**Decision needed:** this resolves the guarantee-fund question M3 Phase 5 deliberately left open —
via a real insurance underwriter partnership rather than a self-funded reserve, which is a business
negotiation, not an engineering task. Similarly, escalating disputes to **external arbitration**
(a partnership with an online dispute resolution provider) for cases beyond a value threshold, or
that internal admin review can't cleanly resolve, needs a vendor relationship rather than
custom-built arbitration infrastructure.

**Data model:** `EscrowInsurancePolicy { escrowId, provider, policyId, premium, coverageAmount,
status }`, `ArbitrationCase { disputeId, externalProvider, externalCaseId, status, ruling,
closedAt }`.

**API routes:** insurance quote/purchase at checkout for eligible high-value escrows (premium added
to the buyer's total, computed the same way `lib/fees.ts` computes the escrow fee), an arbitration
escalation route from the admin dispute detail page (M2 Phase 9).

**UX/UI:** checkout shows an optional insurance add-on for eligible high-value escrows (checkbox,
premium amount, a short coverage explainer on hover/tap); the escrow detail page shows the new
"Insured" badge when active. The admin dispute detail page gains an "Escalate to arbitration" action
for cases that clearly exceed what internal review should decide; once escalated, the case shows a
status readout and, once the external provider responds, the ruling — acted on via the same
refund/release transaction logic an internal admin ruling already uses.

**Done when:** eligible high-value escrows can be insured at checkout with the premium correctly
charged; a dispute can be escalated to external arbitration, and its ruling is recorded and enacted
(refund or release) exactly as an internal ruling would be.

---

## Phase 6 — Buyer/Seller Financing

**Decision needed — flagged heavily:** lending is among the most regulated activities a platform can
touch; licensing requirements vary drastically by jurisdiction, and "the platform extends credit"
versus "the platform integrates a licensed third-party lender's API" are fundamentally different legal
postures. **This phase must not proceed without a legal/licensing review**, and everything below
assumes a **partner-lender model** — the platform integrates a third-party BNPL/lending provider
rather than underwriting credit itself, since self-underwriting would require the platform to become
a licensed lender in every jurisdiction it operates.

**Data model:** `FinancingApplication { userId, escrowId, provider, requestedAmount, status,
providerApplicationId }`.

**API routes:** application submission (proxies to the partner lender's API), a webhook receiving
the lender's approval/decline decision; on approval, the escrow funds normally, with the buyer's
wallet debit covered by the financed amount rather than an existing balance.

**UX/UI:** checkout offers a "Pay over time" option (partner-branded, standard BNPL-style
presentation — the lender's own hosted flow is typically embedded or linked to, not rebuilt in-house)
for eligible buyers/amounts; the escrow detail page shows a "Financed" badge.

**Done when:** legal/licensing review has concluded a partner-lender model is compliant in the target
jurisdictions; eligible buyers can complete checkout via the partner's financing flow, with the
escrow funding normally on approval exactly as a wallet-balance-funded escrow would.

---

## Phase 7 — ML & Data Platform

**Data model:** `MlModelVersion { name, version, deployedAt, metrics (Json) }` to track which model
is live and how it's performing — the underlying features are computed from data that already exists
(M3's `RiskScore`/`DeviceFingerprint`, and the full `Escrow`/`Transaction` history).

**API routes:** the fraud-scoring implementation behind `GET /api/admin/risk/flagged-users` (M3 Phase
4) swaps from rule-based composite scoring to a trained model — the API surface itself doesn't change,
only what computes the score. A similarity/recommendation endpoint (`GET /api/listings/[id]/similar`)
upgrades from M3's search-engine facet matching to embeddings-based similarity. A pricing-guidance
endpoint (`GET /api/listings/price-suggestion?platform=&followers=&niche=`) for sellers.

**UX/UI:** the listing wizard (M1) gains an optional, clearly-labeled-as-guidance "Suggested price
range" hint on the details step, based on recent comparable completed sales — presented as
information, never as a constraint the seller must follow. The "Similar listings" strip (M3) improves
in match quality with no UI change required. Admin `/admin/risk` (M3) gains a model-confidence readout
next to each flagged user's score.

**Done when:** the ML fraud model measurably outperforms the M3 rule-based baseline on precision/
recall against known-fraud cases (requires having accumulated enough labeled fraud/non-fraud
history to train against); sellers see price guidance grounded in real comparable sales; listing
recommendations are noticeably more relevant than pure facet matching.

---

## Phase 8 — Native Mobile Apps

**Decision needed:** React Native (shares patterns and, to a degree, logic with the existing React
web codebase; faster to ship and maintain as one team) versus fully native Swift/Kotlin (better
platform-native feel, slower, effectively doubles the codebase). This plan assumes React Native,
given the existing component and API patterns translate more directly and the team is already
React-fluent from the web build.

**Data model:** none new for core functionality — the apps consume the existing API surface (session
auth for the app's own logged-in users, or M3's public API key auth if the app is deliberately built
as "just another API client," which is a clean architectural constraint worth preferring since it
forces the mobile app to never depend on internal-only routes). Native push tokens (APNs/FCM) are
added alongside M3's `PushSubscription` model rather than replacing it.

**API routes:** none new if built against the existing surface; server-side push-sending logic
extends to dispatch to native tokens as well as web push subscriptions.

**UX/UI:** the app mirrors the web dashboard's core transactional flows — browse, listing detail,
offers, escrow, wallet, messages, notifications — using native navigation conventions (tab bar, native
modal sheets) rather than a literal port of the responsive web layout, since mobile UX conventions
differ enough from responsive-web that a straight port reads wrong on both. Push notifications and
shared listing links deep-link into the correct in-app screen rather than opening a browser.

**Done when:** the app is published on both app stores with the core transactional loop working
natively (not necessarily every feature from M1–M3 on day one); push deep-links correctly; the app
and web dashboard share the same backend with no divergent business logic between them.

---

## Phase 9 — API Ecosystem Growth

Depends on M3 Phase 9 (the public API platform and its API-key/webhook infrastructure).

**Data model:** `AppListing { id, developerId, name, description, iconUrl, apiScopesRequested (Json),
status (DRAFT|SUBMITTED|APPROVED|REJECTED), installCount }`, `AppInstallation { appId, userId,
grantedScopes (Json), installedAt }`.

**API routes:** third-party app registration/submission, an OAuth-style authorization flow letting a
user grant a listed app specific API scopes (rather than sharing a raw API key with it, which M3's
simpler key-based model would otherwise require), admin app-review routes.

**UX/UI:**
- `/developers` (public) — an app directory, visually similar in rhythm to the blog index, listing
  approved third-party integrations with descriptions and install counts.
- `/dashboard/apps` — a user's installed apps, showing granted scopes per app with a revoke action.
- `/dashboard/developer/apps/new` — an app submission form (name, description, icon, requested
  scopes) feeding `/admin/apps`, an admin review queue using the same card-queue pattern established
  throughout M2/M3, before an app becomes publicly listed.
- The scope-grant screen (Design System Extensions) is what a user sees when installing an app: the
  app's identity, a plain-language list of what it's asking for, Allow/Deny.

**Done when:** a third-party developer can register an app, request scopes, get admin-approved, and
have users install it through a proper authorization flow instead of sharing raw API keys.

---

## Phase 10 — Community & Lifecycle Features

**Decision needed:** pre-sale live chat for anonymous/pre-signup visitors is a different use case from
the existing authenticated DM/escrow chat infrastructure — buying a widget (e.g. Intercom/Crisp-style)
is almost certainly more sensible than extending the internal chat system to handle anonymous
visitors, session-less identity, and agent routing it was never designed for.

**Data model:** `UserFollow { followerId, followingId, createdAt }`, `ActivityEvent { id, userId,
type, metadata (Json), createdAt, isPublic }` (opt-in per event type — e.g. "listed a new account,"
"completed their 50th sale"), `NpsResponse { userId, score, comment, submittedAt }`.

**API routes:** follow/unfollow, an activity-feed query (own activity + followed sellers'), NPS
submission.

**UX/UI:**
- A Follow button (same toggle interaction as M2's watchlist heart) on seller profiles.
- `/dashboard/feed` — chronological activity from followed sellers, reusing the visual pattern of the
  existing notification list.
- An onboarding tour on first dashboard visit: a few dismissible tooltip callouts pointing at "create
  a listing," "browse," "add funds" — explicitly not a blocking multi-step modal, which tends to get
  reflexively clicked through without being read.
- A lightweight NPS prompt shown occasionally to active users (0–10 score + optional comment,
  dismissible, rate-limited so it doesn't nag).
- If a live-chat widget is adopted: a floating launcher on public pages for pre-sale questions,
  distinct from the authenticated support-ticket system (M2).

**Done when:** users can follow sellers and see a working activity feed; new users get contextual,
non-blocking onboarding instead of a blank dashboard; NPS responses accumulate for product-health
tracking; pre-sale visitors have a chat option separate from the ticket system.

---

## Phase 11 — Platform Governance & Trust Transparency

**Decision needed:** running an in-house bug bounty (building report intake, triage, and reward
payout from scratch) versus listing on an established platform (HackerOne/Bugcrowd-style) — the
established-platform route is almost always more sensible unless there's a specific reason to keep
it in-house, since it comes with a pre-existing researcher community and payout/legal handling.

**Data model:** none required beyond aggregating existing data (completed-escrow counts, dispute
rate, average resolution time, total volume) into a cached public summary. If pursuing an in-house
bounty rather than a third-party platform: `BugBountyReport { id, reporterEmail, severity,
description, status, rewardAmount, submittedAt }`.

**API routes:** `GET /api/trust-report` (public, aggregated stats only — numbers that build
confidence without exposing any individual user's data), served from a cached/scheduled snapshot
rather than a live query, so a public page can't add load to production database queries.

**UX/UI:** `/trust` (public) — a transparency report page using the new public-stat-callout component
(reusing the landing page's count-up stat treatment) for headline numbers: total completed escrows,
dispute rate, average resolution time, total volume protected. A `/security` page documents the
disclosure path — either an in-house submission form or a link out to the third-party bounty platform
listing.

**Done when:** the public trust report accurately reflects aggregated platform health on a periodic
cadence without exposing individual user data; a documented, working security-disclosure path exists.

---

## Phase 12 — Global Infrastructure & Disaster Recovery

Depends on M3 Phase 3 (Redis-backed rate limiting, Socket.IO Redis adapter, multi-instance readiness)
— none of this is possible on a single-process deployment.

**Data model:** none.

**Work items:**
- Multi-region deployment — at minimum a warm standby region for failover; true active-active serving
  is a substantially larger undertaking and should only be scoped separately if latency data from
  M3's observability work actually justifies it (i.e. real users in regions far from the primary
  deployment experiencing meaningfully worse latency).
- Edge caching (CDN) for public, largely-static-per-request pages — browse, listing detail, blog —
  with correct cache invalidation on listing/post updates so stale data never serves.
- Database replication to the standby region with an explicitly defined RPO (how much data loss is
  acceptable) and RTO (how long failover is allowed to take) target — these numbers should come from
  a business conversation about acceptable risk, not be picked arbitrarily by whoever builds this.
- A disaster-recovery plan that goes beyond M3 Phase 1's backup-restore test: a full simulated
  regional failure, drilled end-to-end, not just documented.

**UX/UI:** none — this phase is entirely infrastructure. The only user-visible outcome is what
*doesn't* happen: no extended downtime during a regional incident.

**Done when:** a simulated regional failure results in failover within the target RTO and data loss
within the target RPO; public pages serve from edge cache with correct invalidation; the DR plan has
actually been executed as a drill, with the drill's findings fed back into fixing whatever broke.

---

## Consolidated Task Checklist

Flat list for quick scanning/ticking off, grouped by phase. Mirrors the detail above.

**Phase 1 — Internationalization**
- [ ] Decide: URL-prefixed locale routing vs. cookie-based (this plan assumes URL-prefixed)
- [ ] Adopt an i18n framework; extract every user-facing string from the M1–M3 UI into translation files
- [ ] `User.preferredLocale`; `TranslationOverride` model + admin editor route
- [ ] Initial machine-translation pass for target languages
- [ ] Language switcher (navbar + footer)
- [ ] `/admin/translations` override editor
- [ ] Decide (separately, once target languages are set): is RTL support needed?

**Phase 2 — Verified business accounts & team accounts**
- [ ] `Organization`, `OrganizationMember`, `KybSubmission` models; `organizationId` on `Listing`/`Escrow`
- [ ] Org CRUD, invite/role-management, KYB submission + admin review routes
- [ ] Org switcher in dashboard header
- [ ] `/dashboard/organization` (members, invite, roles)
- [ ] `/dashboard/organization/verification` (KYB document stepper)
- [ ] KYB tab on admin `/admin/verification`

**Phase 3 — AML & tax compliance maturity**
- [ ] Decide + contract a sanctions/PEP screening vendor and a crypto AML monitoring vendor
- [ ] `ComplianceScreening`, `TaxDocument` models
- [ ] Background screening job (registration + periodic for active sellers)
- [ ] Annual tax-document generation job for sellers crossing reporting thresholds
- [ ] `/settings/tax` (tax ID collection + document downloads)
- [ ] `/admin/compliance` hits-only queue

**Phase 4 — Marketplace liquidity features**
- [ ] `WantedListing`, `AuctionBid`, `PrivateListingInvite` models; `Listing.saleType`/`isPrivate`/`auctionEndsAt`
- [ ] Wanted-listing CRUD + seller-response flow
- [ ] Auction bid placement (min-increment validation, anti-sniping auto-extension)
- [ ] Private-listing invite management (genuinely excluded from public queries)
- [ ] `/dashboard/wanted` + "Wanted" tab on `/listings`
- [ ] Live auction bid interface (card + detail) over a new Socket.IO `new_bid` event / auction room
- [ ] Winning-bidder time-limited checkout prompt

**Phase 5 — Third-party insurance & arbitration**
- [ ] Decide + contract an insurance underwriter partner and an arbitration provider partner
- [ ] `EscrowInsurancePolicy`, `ArbitrationCase` models
- [ ] Insurance quote/purchase route at checkout; arbitration escalation route
- [ ] Insurance add-on UI at checkout; "Insured" badge on escrow
- [ ] "Escalate to arbitration" admin action + ruling display, wired into existing refund/release logic

**Phase 6 — Buyer/seller financing**
- [ ] **Legal/licensing review — must complete before any build work**
- [ ] Decide + contract a partner BNPL/lending provider (platform does not underwrite credit itself)
- [ ] `FinancingApplication` model
- [ ] Application-submission proxy route + lender approval/decline webhook
- [ ] "Pay over time" checkout option (partner-branded); "Financed" badge on escrow

**Phase 7 — ML & data platform**
- [ ] `MlModelVersion` model
- [ ] Train and deploy a fraud model replacing M3's rule-based composite scoring
- [ ] Embeddings-based similarity model upgrading `GET /api/listings/[id]/similar`
- [ ] Pricing-guidance endpoint
- [ ] Price-suggestion hint in the listing wizard; model-confidence readout on `/admin/risk`

**Phase 8 — Native mobile apps**
- [ ] Decide: React Native vs. fully native (this plan assumes React Native)
- [ ] Core transactional flows built natively (browse, listing, offers, escrow, wallet, messages, notifications)
- [ ] Native push tokens (APNs/FCM) alongside the existing `PushSubscription` model
- [ ] Deep linking from push notifications and shared listing links
- [ ] App store submission (iOS + Android)

**Phase 9 — API ecosystem growth**
- [ ] `AppListing`, `AppInstallation` models
- [ ] App registration/submission routes; OAuth-style scope-grant authorization flow
- [ ] Admin app-review routes
- [ ] `/developers` public app directory
- [ ] `/dashboard/apps` (installed apps + revoke); `/dashboard/developer/apps/new` (submission form)
- [ ] `/admin/apps` review queue

**Phase 10 — Community & lifecycle features**
- [ ] Decide: buy a live-chat widget vs. build (this plan assumes buy)
- [ ] `UserFollow`, `ActivityEvent`, `NpsResponse` models
- [ ] Follow/unfollow routes; activity-feed query; NPS submission route
- [ ] Follow button on seller profiles; `/dashboard/feed`
- [ ] Non-blocking onboarding tour (tooltip callouts, not a modal wizard)
- [ ] NPS micro-survey (rate-limited, dismissible)
- [ ] Live-chat widget on public pages (if adopted)

**Phase 11 — Platform governance & trust transparency**
- [ ] Decide: in-house bug bounty vs. third-party platform (this plan assumes third-party)
- [ ] `GET /api/trust-report` (cached/scheduled aggregate snapshot)
- [ ] `/trust` public transparency report page
- [ ] `/security` disclosure-path page (in-house form or link-out)

**Phase 12 — Global infrastructure & disaster recovery**
- [ ] Multi-region warm-standby deployment
- [ ] Edge/CDN caching for public pages with correct invalidation on content updates
- [ ] Database replication to standby region; explicit RPO/RTO targets set by the business
- [ ] Full simulated regional-failure DR drill, findings fed back into fixes
