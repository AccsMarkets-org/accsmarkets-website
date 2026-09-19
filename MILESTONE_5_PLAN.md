# AccsMarkets — Milestone 5 Plan

Planning document only — nothing in this file has been built. M1 shipped the core loop, M2 completed
the original feature spec, M3 made the platform reliable/compliant/scalable, and M4 pushed it into new
markets and revenue lines (i18n, business accounts, liquidity features, financing, native apps, an
API ecosystem). **Milestone 5 is where the platform stops being "a marketplace with escrow" and starts
being "the trust layer for digital-asset transfer"** — it deepens the one promise everything else was
built around (a safe handover) past the moment money changes hands, expands what kinds of assets can
be safely traded, and turns the platform's own trust infrastructure into products in their own right.

## Context

Every prior milestone protects the transaction up to `COMPLETED`. Nothing protects what happens
after — and for this specific business, that gap is real: a social media account can be suspended by
its host platform hours after a legitimate transfer, for reasons that have nothing to do with whether
the escrow worked correctly. M5 opens with closing that gap (Phase 1), then uses the dispute/claim
history it generates to make the platform smarter about risk (Phase 2), then grows the addressable
market (new asset verticals, Phase 3) and the deal quality for the highest-value trades those verticals
bring (structured due diligence, Phase 4). The back half of the milestone turns the platform's own
infrastructure into revenue: seller tooling for power users (Phase 5), the escrow engine itself as an
embeddable product for other marketplaces (Phase 6), treasury transparency (Phase 7), more ways to get
paid (Phase 8), a data product built on accumulated market knowledge (Phase 9), a natural-language
front end to search (Phase 10), an education platform (Phase 11), and outbound distribution (Phase 12).
As with M4, several phases here are as much business/finance/legal decisions as engineering ones, and
are flagged accordingly rather than presented as settled.

---

## Phase Overview

| # | Phase | Depends on |
|---|---|---|
| 1 | Post-transfer account health & warranty program | M1 core escrow |
| 2 | Advanced dispute intelligence & systemic risk adjustment | Phase 1 (feeds claim data); M2/M4 dispute + arbitration history |
| 3 | Vertical expansion: new digital asset categories | — |
| 4 | Structured due diligence & deal rooms | Phase 3 (most valuable for complex new verticals) |
| 5 | Seller success platform | M4 Phase 2 (org/team accounts) |
| 6 | Escrow-as-a-service (external embedding) | M4 Phase 9 (API platform patterns) |
| 7 | Treasury operations & proof of reserves | M3 Phase 3 (scale infra) |
| 8 | Expanded payout options | Phase 7 (treasury maturity) |
| 9 | Market intelligence product | M4 Phase 7 (ML & data platform) |
| 10 | AI buying assistant | M3 Phase 6 (search); M4 Phase 7 (ML platform) |
| 11 | Creator/seller academy | — |
| 12 | Marketplace syndication & affiliate network | M4 Phase 8 (referral pattern, extended to partners) |

---

## Design System Extensions (new tokens/components needed across phases)

- **Warranty countdown** — a compact days-remaining indicator (progress-bar style, similar visual
  weight to the escrow stepper) shown on completed escrows still inside their warranty window.
- **Health-check status badge** — small pill (Active / Suspended / Unreachable / Unknown), reusing the
  `StatusPill` primitive with a new style map.
- **Holdback line-item treatment** — a distinct, slightly muted row style in the transaction table for
  the portion of a sale held back pending warranty expiry, with an info-icon tooltip explaining why
  it's not yet available.
- **Category-aware dynamic form** — not a new visual component so much as a pattern: the listing
  wizard's detail step renders a field set driven by the selected category's schema rather than one
  fixed field list, so adding a category doesn't require a new page.
- **Deal room chrome** — a visually distinct two-party workspace layout (signals "this is a private
  collaborative space," not a public listing page) for Phase 4.
- **NDA click-through gate** — a lightweight accept-to-unlock pattern (checkbox + Accept button)
  blocking sensitive document access until acknowledged.
- **Checklist item** — checkbox + label + "confirmed by X" byline, reused across due-diligence
  checklists (Phase 4) and course progress tracking (Phase 11).
- **CSV import status table** — row-by-row success/error display for bulk operations (Phase 5).
- **Partner-themeable checkout widget** — the embeddable escrow widget (Phase 6) exposes CSS custom
  properties a partner can override, deliberately decoupled from AccsMarkets's own fixed orange tokens.
- **Proof-of-reserves gauge** — a simple ratio visualization (reserves vs. liabilities) plus a trend
  line, for the public `/proof-of-reserves` page (Phase 7).
- **Payout method tile** — selection card pattern (reusing the deposit flow's network-select rhythm)
  for choosing crypto / bank / virtual card as a withdrawal destination (Phase 8).
- **Paywall-blurred preview** — a content-preview state (readable headline/summary, blurred or
  truncated body) for premium market reports (Phase 9).
- **Assistant chat input + removable filter chips** — a conversational entry point that always renders
  its interpreted filters back as editable chips rather than hiding what it understood (Phase 10).

---

## Phase 1 — Post-Transfer Account Health & Warranty Program

**Decision needed:** how a warranty payout is funded. The recommended default is a **holdback model**
— a percentage of the sale price is withheld from the seller's payout at `COMPLETED` and released to
them only after the warranty window passes claim-free, with approved claims paid out of that holdback
rather than platform funds. This is materially lower-risk for the platform than a self-funded
guarantee (the question M3/M4 both deliberately left open), but it changes seller cash-flow — sellers
receive a partial payout at completion and the remainder later — and that trade-off should be a
product decision, not just an engineering default. **Also flag honestly:** automated account-health
checking is best-effort. Without official platform APIs, "is this account still active" can usually
only be inferred from whether a public profile page still resolves and roughly matches its prior
state — it cannot reliably distinguish "suspended" from "made private" or "deleted by the owner
post-sale." Claims should always allow buyer-submitted evidence rather than relying on automation alone.

**Data model:** extend `Escrow` with `warrantyExpiresAt`, `warrantyStatus` (ACTIVE|EXPIRED|CLAIMED),
`holdbackAmount`, `holdbackReleasedAt`. Add per-`Platform` warranty-length configuration to
`PlatformSettings` (a YouTube channel and a Telegram group don't carry the same post-transfer risk
profile). New `AccountHealthCheck { id, escrowId, checkedAt, status (ACTIVE|SUSPENDED|UNREACHABLE|
UNKNOWN), method (AUTOMATED|MANUAL), notes }`, `WarrantyClaim { id, escrowId, buyerId, reason,
evidenceUrls (Json), status (PENDING|APPROVED|DENIED), resolution, resolvedAt, payoutAmount }`.

**API routes:** a scheduled health-check job (M3's queue) running best-effort automated checks during
the warranty window; `POST /api/escrows/[id]/warranty-claim` (buyer files a claim with evidence);
`GET/PUT /api/admin/warranty-claims/[id]` (approve pays the buyer from the holdback and may trigger a
Phase 2 risk-signal on the seller if claims against them recur; deny releases the holdback to the
seller on schedule as normal).

**UX/UI:**
- The escrow detail page, once `COMPLETED`, grows a "Warranty" section: the countdown component,
  the most recent automated health-check result (with its `AUTOMATED`/limited-confidence nature made
  clear in the copy, not overstated), and a "Report a problem" button opening the claim form
  (reason + evidence upload).
- The seller's transaction table shows the holdback explicitly as its own line item ("Pending
  warranty release — $X, available {date}") rather than the amount simply not appearing, so sellers
  aren't confused about where part of their payout went.
- `/dashboard/warranty-claims` — a buyer-facing list of filed claims and their status.
- Admin `/admin/warranty-claims` — the established queue-card pattern, with evidence review and
  Approve/Deny actions.

**Done when:** completed escrows correctly enter a warranty window with the configured holdback
withheld from the seller; best-effort automated checks run without overstating what they can detect;
buyers can file evidence-backed claims; admins can resolve claims with payouts correctly sourced from
the holdback and the remainder released to the seller once the window clears claim-free.

---

## Phase 2 — Advanced Dispute Intelligence & Systemic Risk Adjustment

**Data model:** `CategoryRiskProfile { platform, disputeRate, warrantyClaimRate, avgResolutionDays,
recommendedFeeAdjustment, recommendedWarrantyDays, computedAt }` — a periodically recomputed
aggregate.

**API routes:** a background job (M3's queue) mining closed disputes (M2/M4) and warranty claims
(Phase 1), grouped by platform/category, into rolling risk metrics — surfaced as **recommendations**,
never auto-applied, keeping a human in the loop for anything touching fees or warranty terms.

**UX/UI:** admin `/admin/risk/categories` — a table (platform, dispute rate, warranty-claim rate,
average resolution time, a trend arrow) with a "suggested adjustment" column and a one-click
apply-to-settings action that still requires explicit admin confirmation before taking effect.

**Done when:** admins can see which platforms/categories are systemically riskier than others, backed
by real claim/dispute data rather than gut feel, and can act on data-backed suggestions for default
fees and warranty length.

---

## Phase 3 — Vertical Expansion: New Digital Asset Categories

**Decision needed:** which verticals to add first is a product/market call, not a technical one.
Domains are the most natural first addition (already adjacent to the existing `WEBSITE` platform
type, lower verification complexity — DNS TXT record ownership proof is well-established). SaaS
micro-acquisitions and gaming accounts are bigger lifts with materially different verification and
disclosure needs and should be scoped separately once domains prove the pattern.

**Data model:** the current fixed `Platform` enum doesn't scale well to open-ended, growing
verticals — this phase should migrate toward a more flexible category model (a `Category` table
rather than a hardcoded enum) plus `Listing.categoryMetadata (Json)`, validated per-category via
category-specific Zod schemas, rather than continuing to bolt nullable columns onto `Listing` for
every new vertical's unique fields (a domain wants registrar/expiry/backlink data; a SaaS listing
wants MRR/churn/tech-stack data — these don't share a shape).

**API routes:** category-specific listing-creation validation, category-specific verification flows
(e.g. a DNS TXT record check for domains, replacing the existing bio-placed-code method which doesn't
apply outside social accounts).

**UX/UI:** the listing wizard's Step 1 platform grid gains new category tiles; Step 3's detail form
becomes category-aware, rendering the fields relevant to whatever was selected instead of one
one-size-fits-all set; listing cards and detail pages render category-appropriate stat rows.

**Done when:** at least one new vertical (domains recommended first) is fully listable, verifiable,
and tradeable through the existing escrow flow end-to-end, with category-appropriate fields and a
working ownership-verification method for that category.

---

## Phase 4 — Structured Due Diligence & Deal Rooms

**Data model:** `DealRoom { id, listingId, buyerId, sellerId, ndaAcceptedAt?, createdAt }`,
`DueDiligenceDocument { dealRoomId, uploadedBy, label, url, uploadedAt }`,
`DueDiligenceChecklistItem { dealRoomId, label, status (PENDING|CONFIRMED), confirmedBy }`.

**API routes:** deal-room creation (triggered once an offer is accepted, offered as an optional step
before checkout for eligible categories — particularly the higher-complexity verticals from Phase 3),
an NDA-acceptance gate that must be passed before sensitive documents become visible, checklist CRUD.

**UX/UI:** for eligible listings, accepting an offer offers a "Start due diligence" option instead of
jumping straight to checkout — a two-party-only deal room page with a document upload/share area
(gated behind the new NDA click-through pattern), a checklist (seller proposes items like "verify
revenue screenshot," buyer checks them off as satisfied), and a "Proceed to escrow checkout" button
that only appears once the buyer is ready.

**Done when:** high-value or complex deals can go through a structured pre-sale disclosure process
before any money moves, reducing the class of "surprises after paying" that Phase 1's warranty
program would otherwise have to clean up after the fact.

---

## Phase 5 — Seller Success Platform

**Data model:** `BulkListingImport { id, organizationId?, userId, fileUrl, status, processedCount,
errorCount }` for CSV import jobs; no other new tables — the analytics surface is read-only reporting
over existing `Listing`/`Escrow`/`Transaction` data.

**API routes:** CSV bulk-listing upload + a background validation/import job (M3's queue, with
per-row error collection rather than all-or-nothing failure); `GET /api/dashboard/seller-analytics`
(revenue over time, listing-to-sale conversion rate, average time-to-sale, category breakdown).

**UX/UI:**
- `/dashboard/listings/bulk-import` — a CSV template download, an upload control, and the new
  row-by-row status table showing exactly which rows imported and which failed and why. Ties
  naturally into M4's organization accounts, since bulk import is primarily an agency/power-seller
  need.
- `/dashboard/analytics` — charts (reusing the chart component from M3's admin BI dashboard) for a
  seller's own performance: revenue trend, conversion funnel, category breakdown.

**Done when:** an agency-scale seller can bulk-upload dozens of listings instead of using the
one-at-a-time wizard, with clear per-row feedback on what succeeded and failed, and can see their own
performance trends rather than only individual listing stats.

---

## Phase 6 — Escrow-as-a-Service (External Embedding)

**Decision needed:** this is a genuinely new B2B product line — licensing AccsMarkets's own escrow
engine to power transactions on *other* marketplaces, distinct from M4 Phase 9's API ecosystem (which
was third-party apps plugging *into* AccsMarkets, not AccsMarkets embedding *into* someone else's
site). It needs a pricing/go-to-market decision (a per-transaction fee-share model is the natural fit,
mirroring how the core marketplace already charges buyers a fee) before it's worth building.

**Data model:** `EscrowPartner { id, name, apiKey, webhookUrl, feeSharePercent, isActive }`; `Escrow`
gains an optional `partnerId` for embedded/white-labeled transactions.

**API routes:** a partner-scoped surface (`/api/partner/v1/escrows`) letting an external site create
and manage an escrow using AccsMarkets's engine without the underlying listing existing on the
AccsMarkets marketplace itself; webhook events to the partner mirroring the internal Socket.IO event
set (funded, submitted, verified, completed, disputed).

**UX/UI:** an embeddable checkout widget (iframe or a small JS SDK) a partner drops into their own
checkout flow, themed to the partner's brand via the new CSS-custom-property override layer rather
than forced into AccsMarkets orange; a partner-facing `/partners/dashboard` (separate from the regular
user dashboard) showing transaction volume and fee-share owed.

**Done when:** a pilot external partner can process a complete escrow transaction through
AccsMarkets's engine, embedded in their own site under their own branding, with correct fee-share
accounting on both sides.

---

## Phase 7 — Treasury Operations & Proof of Reserves

**Decision needed:** this is substantially a finance/ops function — multi-sig wallet custody policy,
cold-storage thresholds, and selecting an audit firm for reserve attestation are decisions for
finance/leadership; engineering's job here is building the tooling to support whatever policy is set,
not setting the policy itself.

**Data model:** `TreasuryWallet { id, network, address, type (HOT|COLD), balanceLastSyncedAt }`,
`ProofOfReservesSnapshot { id, totalUserLiabilities, totalReserves, publishedAt, attestationUrl }`.

**API routes:** a scheduled reconciliation job comparing on-chain treasury balances against the sum
of all user wallet balances (the platform's total liability) — internal-only, admin-visible; a
periodic public proof-of-reserves publishing job using a Merkle-tree inclusion-proof pattern, so an
individual user can verify their own balance was counted without any other user's balance being
exposed.

**UX/UI:** `/proof-of-reserves` (public) — published snapshots (the new gauge component showing
reserves vs. liabilities, a historical trend), and a "verify my balance is included" tool where a
logged-in user can check their own inclusion proof.

**Done when:** internal reconciliation accurately tracks reserves against liabilities on a recurring
schedule; a public page publishes verifiable snapshots; a user can confirm their own balance was
correctly included without having to trust the platform's word alone.

---

## Phase 8 — Expanded Payout Options

**Decision needed:** bank/ACH payout requires either a banking-as-a-service partner or a licensed
money-transmission relationship — not something to build directly against banking rails in-house.
Virtual card issuance similarly requires a card-issuing partner. Both are vendor-partnership decisions
with real compliance weight, not just an integration task.

**Data model:** `PayoutMethod { userId, type (BANK_ACCOUNT|VIRTUAL_CARD), details (encrypted Json),
isDefault, verifiedAt }`.

**API routes:** payout-method registration (proxied to whichever partner is chosen), the existing
withdrawal route extended to accept a payout-method selection alongside the current crypto-address
path.

**UX/UI:** `/dashboard/wallet/withdraw` gains payout-method tiles (the new selection-tile pattern)
alongside the existing crypto option — Bank transfer (partner-verified account-details form) and
Virtual card (a card-issuance flow; ongoing card management is typically the partner's own hosted
UI, embedded rather than rebuilt). Issued cards appear in `/settings/payment-methods` with
balance/spend visibility.

**Done when:** a user in a supported region can withdraw via bank transfer or spend directly from a
virtual card tied to their wallet balance, without the platform itself becoming a bank or card issuer.

---

## Phase 9 — Market Intelligence Product

**Decision needed:** whether this is sold as a standalone subscription or bundled into existing
seller plans is a pricing/packaging call. This plan assumes standalone, since the audience (buyers,
agencies, investors doing market research) overlaps only partially with sellers.

**Data model:** `MarketReport { id, title, category, periodStart, periodEnd, isPublished, isPremium,
contentUrl }`; `IntelligenceSubscription { userId, tier, activatedAt, expiresAt }` if sold separately
from the existing `SubscriptionPlan` model rather than folded into it.

**API routes:** a report-generation job aggregating properly anonymized platform data (average sale
prices by category and follower-tier, sale-velocity trends, seasonal patterns) into published reports
on a recurring cadence.

**UX/UI:** `/insights` (public) — a report index in the same visual rhythm as the blog index; free
summary-level reports are open to everyone (a growth/SEO play consistent with M3's investment there),
with the new paywall-blurred-preview pattern gating deeper data behind the premium tier.
`/dashboard/insights` for subscribers, with the full report library and, for premium subscribers, a
self-serve filter tool (category/date range).

**Done when:** aggregated, properly anonymized market reports publish on a recurring cadence with a
working free/premium split, and the anonymization is genuinely sufficient that no individual
seller's data is reconstructable from a report.

---

## Phase 10 — AI Buying Assistant

**Data model:** `AssistantConversation { id, userId, messages (Json), createdAt }` for conversation
context.

**API routes:** a conversational endpoint translating natural-language requests ("fitness Instagram
under $2k with good engagement") into the existing search/facet query from M3 Phase 6 — an LLM
handles query *understanding*, not search itself; the assistant is a natural-language front end to
the existing search engine, not a parallel recommendation system.

**UX/UI:** a chat-style entry point on the browse page, rendering its interpreted filters back to the
user as removable chips before showing results ("Showing: Instagram, under $2,000, 10K+ followers —
remove any filter above") — the user always sees and can correct what the assistant understood,
rather than trusting an opaque result set.

**Done when:** natural-language queries reliably translate into correct structured search filters,
with the interpreted filters always visible and independently editable.

---

## Phase 11 — Creator/Seller Academy

**Decision needed:** building content in-house requires a content/curriculum owner, not just
engineering effort — versus licensing or curating existing growth-education content and building only
the delivery platform around it. This is a content-strategy decision that should be made before
committing engineering time to course authoring tools.

**Data model:** `Course { id, title, description, category, isPremium }`, `Lesson { courseId, title,
content, videoUrl?, order }`, `CourseProgress { userId, courseId, completedLessonIds (Json),
lastAccessedAt }`.

**API routes:** course/lesson CRUD (admin-authored), progress tracking.

**UX/UI:** `/academy` (public index, course cards similar to the blog index), `/academy/[courseSlug]`
(lesson sidebar + content pane, using the new checklist-item component for progress tracking). Could
optionally feed M3's profile-completeness bar ("Complete the Seller Basics course"). Admin
`/admin/academy` for course/lesson authoring.

**Done when:** at least a starter curriculum (e.g. "How to sell your account safely," "Escrow 101,"
"Writing a listing that converts") is published and progress-trackable per user.

---

## Phase 12 — Marketplace Syndication & Affiliate Network

**Data model:** `SyndicationPartner { id, name, apiKey, feedFormat, isActive }`,
`AffiliatePartner { id, name, code, commissionPercent }`, `AffiliateConversion { affiliatePartnerId,
userId, escrowId, commissionAmount, paidAt }`.

**API routes:** a listings feed endpoint (`GET /api/syndication/feed`, filtered/formatted per
partner) for partner sites to display AccsMarkets listings with attribution back; affiliate
click/conversion tracking (`?aff=` param → cookie → attribution on the first completed escrow),
the same pattern M4 Phase 8 used for individual-user referrals, extended to external partner
relationships instead.

**UX/UI:** primarily a partner-facing surface rather than end-user-facing — `/partners/syndication`
(partner-facing documentation + feed access), admin `/admin/partners` (partner management, commission
rates, conversion reporting using the established queue/table patterns).

**Done when:** a partner site can pull a live listings feed and resulting sales are correctly
attributed for commission payout.

---

## Consolidated Task Checklist

Flat list for quick scanning/ticking off, grouped by phase. Mirrors the detail above.

**Phase 1 — Post-transfer account health & warranty program**
- [ ] Decide: holdback-funded warranty (recommended) vs. platform-funded — affects seller cash-flow, needs product sign-off
- [ ] `Escrow.warrantyExpiresAt`/`warrantyStatus`/`holdbackAmount`/`holdbackReleasedAt`; per-platform warranty-length config
- [ ] `AccountHealthCheck`, `WarrantyClaim` models
- [ ] Best-effort automated health-check job (with honest confidence limits, not overstated detection)
- [ ] Claim submission route + admin approve/deny routes with holdback-sourced payout
- [ ] Warranty section on completed-escrow detail page (countdown, health status, report-a-problem)
- [ ] Holdback line item visible in seller transaction table
- [ ] `/dashboard/warranty-claims`; `/admin/warranty-claims` queue

**Phase 2 — Advanced dispute intelligence**
- [ ] `CategoryRiskProfile` model
- [ ] Background job mining disputes + warranty claims into rolling risk metrics
- [ ] `/admin/risk/categories` (metrics table + human-approved suggested-adjustment action)

**Phase 3 — Vertical expansion**
- [ ] Decide: which vertical(s) first (domains recommended)
- [ ] Migrate `Platform` enum toward a flexible `Category` model + `Listing.categoryMetadata`
- [ ] Category-specific validation schemas + verification flows (e.g. DNS TXT for domains)
- [ ] Category-aware listing wizard detail step; category-appropriate stat rows on cards/detail

**Phase 4 — Structured due diligence & deal rooms**
- [ ] `DealRoom`, `DueDiligenceDocument`, `DueDiligenceChecklistItem` models
- [ ] Deal-room creation on accepted offer (optional, eligible categories); NDA-gate + checklist routes
- [ ] Two-party deal room page (document share, NDA gate, checklist, proceed-to-checkout gate)

**Phase 5 — Seller success platform**
- [ ] `BulkListingImport` model
- [ ] CSV upload + background validation/import job with per-row error reporting
- [ ] Seller analytics endpoint (revenue trend, conversion rate, time-to-sale, category breakdown)
- [ ] `/dashboard/listings/bulk-import`; `/dashboard/analytics`

**Phase 6 — Escrow-as-a-service**
- [ ] Decide: partner pricing/fee-share model (business decision before build)
- [ ] `EscrowPartner` model; `Escrow.partnerId`
- [ ] Partner-scoped API surface + webhook event delivery
- [ ] Embeddable, partner-themeable checkout widget (SDK or iframe)
- [ ] `/partners/dashboard` (volume + fee-share owed)

**Phase 7 — Treasury operations & proof of reserves**
- [ ] Finance/leadership decision: custody policy, cold-storage thresholds, audit-firm selection
- [ ] `TreasuryWallet`, `ProofOfReservesSnapshot` models
- [ ] Reconciliation job (on-chain treasury vs. total user liabilities)
- [ ] Merkle-tree-based public proof-of-reserves publishing job
- [ ] `/proof-of-reserves` public page + per-user inclusion-proof verification tool

**Phase 8 — Expanded payout options**
- [ ] Decide + contract a banking-as-a-service partner and/or card-issuing partner
- [ ] `PayoutMethod` model
- [ ] Payout-method registration routes; withdrawal route extended beyond crypto-only
- [ ] Payout-method tiles on the withdraw page; `/settings/payment-methods`

**Phase 9 — Market intelligence product**
- [ ] Decide: standalone subscription vs. bundled into existing seller plans
- [ ] `MarketReport` model (+ `IntelligenceSubscription` if standalone)
- [ ] Anonymized report-generation job (verify anonymization is genuinely sufficient)
- [ ] `/insights` (free/premium split via paywall-blurred preview); `/dashboard/insights`

**Phase 10 — AI buying assistant**
- [ ] `AssistantConversation` model
- [ ] Natural-language-to-search-filter translation endpoint (LLM for understanding, existing search engine for results)
- [ ] Chat entry point on browse page; removable filter chips reflecting interpreted query

**Phase 11 — Creator/seller academy**
- [ ] Decide: in-house content authorship vs. licensed/curated content
- [ ] `Course`, `Lesson`, `CourseProgress` models
- [ ] Course/lesson CRUD + progress-tracking routes
- [ ] `/academy` + `/academy/[courseSlug]`; `/admin/academy` authoring

**Phase 12 — Marketplace syndication & affiliate network**
- [ ] `SyndicationPartner`, `AffiliatePartner`, `AffiliateConversion` models
- [ ] Listings feed endpoint (partner-formatted); affiliate click/conversion attribution
- [ ] `/partners/syndication` docs/feed access; `/admin/partners` management + conversion reporting
