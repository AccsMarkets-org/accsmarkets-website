# AccsMarkets — Advanced Dashboard Workflow (Full System)

Planning document only — nothing in this file has been built. This is the full spec for the dashboard
overview — the reference screenshot is a seller-mode view considerably richer than M1's current
four-card-and-a-quick-actions-list dashboard, and it completes what `V2.1.0_UPGRADE_PLAN.md` Area 4
only sketched at summary level (per-listing analytics, country breakdown) now that there's a concrete
layout to build against. Unlike the last two documents, this one didn't need external research to
ground it — it's a faithful translation of a detailed reference image plus reconciling it against what
`MILESTONE_3_PLAN.md` Phase 12 (admin BI dashboard) and `MILESTONE_5_PLAN.md` Phase 5 (seller success
platform) already planned, so nothing here contradicts or duplicates those without saying so.

## Reference Teardown

- **Header:** "Welcome back, {name} 👋", current date, a small unread-messages quick-link, an
  "Upgrade" link (subscription upsell, low-key), a language/flag selector, and three header-level
  actions — Wallet, Browse, **+ New Listing** — instead of burying them in a lower "quick actions" card.
- **Four stat cards:** Balance (available funds, → Deposit), Total Earnings (lifetime completed
  sales, → My Earnings), Active Listings (with "of N total" context, → Manage), Listing Views (with a
  "+N this month" delta, → all listings) — each icon-colored distinctly, each linking somewhere useful
  rather than being a dead-end number.
- **Listing Analytics card:** a per-listing selector dropdown, a Daily/Monthly toggle, three headline
  stats (Total Views, This Month with a month-over-month % badge, Top Country with its flag), a
  gradient area chart with a hover tooltip, and a side panel breaking visitors down by country
  (flag + name + mini bar + count).
- **Earnings Overview card:** a year selector, three headline stats (This Year, All Time, Best Month
  with its value), and a monthly bar chart.
- **Recent Listings table:** searchable, sortable columns, status pills, per-row view/edit/delete
  actions, pagination.
- **Recent Transactions table:** searchable, type/status pills, pagination.

---

## Architecture Decisions

**1. Buyer/seller mode toggle — finally made literal.** The original spec called for a Buyer
Mode/Seller Mode toggle on the same account; M1 shipped a mode-agnostic dashboard instead. This
document specs both modes properly, with a segmented toggle near the header, **defaulting to
`User.primaryIntent`** from `V2.1.0_UPGRADE_PLAN.md` Area 5's onboarding flow (a `SELLER`-intent user
lands on the seller view by default; `BOTH` remembers whichever mode was used last). The reference
screenshot is the seller side; the buyer side is specced below to match it structurally.

**2. Overview vs. dedicated analytics page.** `MILESTONE_5_PLAN.md` Phase 5 already plans a deeper
`/dashboard/analytics` (conversion funnel, category breakdown, bulk-import tooling — power-seller
territory). This overview page is the **daily-glance version** — the two headline charts (per-listing
views, monthly earnings) live here for at-a-glance use; the dedicated analytics page stays the
deeper tool for sellers who want to dig further. Same underlying data, different depth, not a
duplicated feature.

---

## Data Model

- `ListingViewEvent { id, listingId, viewerHash, countryCode, createdAt }` — as proposed in
  `V2.1.0_UPGRADE_PLAN.md` Area 4, now with `countryCode` explicitly required (the country breakdown
  panel needs it per-view, not just per-user). For anonymous viewers, `countryCode` comes from
  IP-based geolocation at request time — self-reported onboarding data doesn't apply to a visitor who
  isn't logged in, so this is necessarily a different code path from `V2.1.0`'s user-facing country
  field, not the same lookup reused.
- **No new earnings table.** "Total Earnings," "This Year," "All Time," and "Best Month" are all
  aggregations over the existing `Transaction` table (`type: ESCROW_RELEASE, status: COMPLETED`,
  grouped by month) — computed on read (cached briefly) rather than maintained as a running counter,
  since the source data is already transactionally correct and a derived cache avoids a second
  source of truth that could drift.
- **Retention/scale note, worth deciding now rather than after it's a problem:** raw
  `ListingViewEvent` rows are useful for a rolling recent window (the daily chart, the current-month
  country breakdown) but shouldn't be kept forever at full granularity once volume grows — a scheduled
  job (via `MILESTONE_3_PLAN.md`'s job queue) should roll events older than ~90 days into a
  `ListingViewDailyAggregate { listingId, date, countryCode, viewCount }` summary table and prune the
  raw rows, keeping the chart fast without an unbounded table.

## API

- `POST` (internal, called from the listing detail page render or a client-side beacon) — logs a
  `ListingViewEvent`, deduped per `viewerHash` per listing per rolling window so a user refreshing the
  page repeatedly doesn't inflate the count (the existing `Listing.viewCount` increment-on-view from
  M1 already does simple dedup logic worth reusing here rather than reinventing).
- `GET /api/dashboard/overview?mode=seller|buyer` — the stat-card numbers, scoped to the active mode.
- `GET /api/dashboard/listing-analytics/[listingId]?range=daily|monthly` — the chart + country
  breakdown data for one listing.
- `GET /api/dashboard/earnings?year=YYYY` — the Earnings Overview chart data.
- Recent Listings / Recent Transactions tables reuse existing list endpoints (`GET /api/listings?mine=true`,
  a transaction-history query already backing the wallet page) with search/sort/pagination params
  added rather than new endpoints built from scratch.

---

## Seller-Mode UX/UI

Matches the reference directly, restyled to brand:

- Header: welcome message with the user's display name, today's date, unread-messages quick-link
  (routes into `/dashboard/messages`), Upgrade link (routes into `/settings/subscription`, `M2`),
  language selector (`M4` Phase 1's switcher, now placed concretely), and Wallet / Browse / + New
  Listing as header-level buttons.
- Stat cards: Balance, Total Earnings, Active Listings (of total), Listing Views (+delta) — each a
  colored icon tile, a large value, a one-line subtitle, and a linked call-to-action.
- Listing Analytics: listing picker (defaults to the seller's most-viewed active listing), Daily/
  Monthly toggle, the three headline stats, the gradient area chart (skeleton-loading per
  `V2.2.0_UPGRADE_PLAN.md` Pillar A while data fetches, not a spinner), and the country breakdown
  panel with flags (reusing the flag component from `V2.1.0_UPGRADE_PLAN.md` Area 4) and mini bars.
- Earnings Overview: year selector, the three headline stats, the monthly bar chart — empty months
  render as zero-height bars, not gaps, so the shape of the year is always readable.
- Recent Listings: search box, sortable column headers, status pills (`M1`'s existing
  `LISTING_STATUS_STYLE` map — no new colors invented), row actions (view/edit/delete, matching
  `ListingManageCard`'s existing permission rules — edit/delete only offered where the listing status
  actually allows it), pagination.
- Recent Transactions: search box, type/status pills (existing maps), pagination.

## Buyer-Mode UX/UI

Same structural pattern, buyer-relevant content:

- Stat cards: **Balance** (unchanged), **Total Spent** (lifetime `ESCROW_PAYMENT` sum, mirroring
  Total Earnings' derivation but for the buyer side), **Active Escrows** (as buyer, → Escrows),
  **Watchlist** (saved-listing count from `MILESTONE_2_PLAN.md`'s watchlist feature, → Watchlist).
- In place of Listing Analytics (nothing to analyze — a buyer doesn't own listings): a **"Browsing
  Activity"** card — recently viewed listings (`V2.2.0_UPGRADE_PLAN.md` Pillar A's recently-viewed
  tracking, surfaced here rather than only on the public homepage) and active saved searches
  (`MILESTONE_3_PLAN.md` Phase 6, once built).
- In place of Earnings Overview: a **"Spending Overview"** card — same monthly-bar-chart treatment,
  sourced from completed purchases instead of completed sales.
- Recent Escrows (as buyer) table, structurally identical to Recent Listings but scoped to purchases.
- Recent Transactions table — shared component, same as seller mode.

---

## Admin Dashboard Extension

The same visual language applied platform-wide rather than per-seller, consolidating what
`MILESTONE_3_PLAN.md` Phase 12 and `V2.1.0_UPGRADE_PLAN.md` Area 4 already called for into one
concrete layout: the existing `/admin` stat/queue cards stay as built, joined by a **Platform
Analytics** card using the same area-chart-plus-country-breakdown component as the seller view (now
aggregated across all listings, not one), and an **Platform Earnings** card using the same
monthly-bar-chart component (aggregated fee revenue, extending the current fixed 30-day figure to the
full year-selector view). Reusing the exact same two chart components between seller and admin
dashboards — not rebuilding parallel versions — keeps this from becoming twice the work it needs to be.

---

## Consolidated Task Checklist

- [ ] `ListingViewEvent` model (with `countryCode`); IP-based geolocation for anonymous viewers
- [ ] Scheduled rollup job: raw events → `ListingViewDailyAggregate`, pruned after ~90 days
- [ ] View-logging endpoint, deduped per viewer per listing per rolling window
- [ ] `GET /api/dashboard/overview`, `/listing-analytics/[listingId]`, `/earnings` endpoints
- [ ] Buyer/seller mode toggle, defaulting from `User.primaryIntent`
- [ ] Seller-mode overview: header redesign, 4 stat cards, Listing Analytics chart + country panel, Earnings Overview chart, Recent Listings + Recent Transactions tables
- [ ] Buyer-mode overview: mirrored stat cards, Browsing Activity card, Spending Overview chart, Recent Escrows table
- [ ] Admin dashboard: Platform Analytics + Platform Earnings cards reusing the seller-mode chart components, aggregated platform-wide
- [ ] Skeleton-loading states for both charts and both tables (per `V2.2.0_UPGRADE_PLAN.md` Pillar A — no spinners)
