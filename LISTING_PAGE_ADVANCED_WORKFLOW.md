# AccsMarkets — Advanced Listing Page Workflow (Full System)

Planning document only — nothing in this file has been built. This completes
`V2.1.0_UPGRADE_PLAN.md` Area 2's listing-detail spec with details the new reference screenshot shows
that the first one didn't: a "Listing Views" pill used as social proof, strike/warning shown as real
counts rather than a status label, a "SOLD OUT" terminal state, and — the one real problem in the
reference worth fixing rather than copying — an offer-history panel that exposes buyer email
addresses publicly.

## What's New in This Reference vs. What V2.1.0 Area 2 Already Specced

- A **"Listing Views"** feature pill sits alongside Escrow Accepted/Monetized/etc. — activity itself
  becomes a trust/social-proof signal shown at a glance, not buried in the analytics card below.
- **Strike/Warning shows actual counts** ("1 Strike, 1 Warning"), not the `GOOD_STANDING | WARNING |
  STRIKE` enum V2.1.0 Area 2 proposed. That enum was the wrong shape — see the correction below.
- A **"SOLD OUT"** state replaces the buy/offer panel once the listing is sold — a terminal state the
  earlier spec didn't cover.
- The sidebar's offer history shows **partially visible buyer email addresses**
  ("ministerkimalismith@gm...") directly on the page. That's a real data-exposure problem, not a
  design choice worth preserving — corrected below.

## Corrections & Decisions

**1. Strikes/warnings: counts, not a separate status enum.** Drop V2.1.0 Area 2's proposed
`standingStatus` enum entirely. Add `Listing.strikeCount (Int, default 0)` and `Listing.warningCount
(Int, default 0)` as the only source of truth, and **derive** the displayed label from them ("Good
Standing" when both are zero, "N Strike(s), N Warning(s)" otherwise). A separately-set status field
next to the real numbers is a bug waiting to happen — a seller (or an admin editing the listing) could
update one and forget the other, and the display would lie. One source of truth removes that
possibility structurally.

**2. Offer history must never show buyer identity beyond what the viewer is entitled to.** Two
distinct views of the same panel:
- **Owner view** (the seller looking at their own listing): full offer history — amount, relative
  time, and the buyer's **username**, never their email. The seller already has a relationship with
  each offer through the existing offers system; a masked identity within that view is enough for
  them to recognize who's who without the page leaking a contactable email address to anyone who
  loads it.
- **Public view** (anyone else): no individual offer history at all — just the current best offer
  amount as a single social-proof figure ("Best offer so far: $X"), or nothing if there are no offers
  yet. Full history is the seller's own business context, not public information.

**3. "SOLD OUT" terminal state.** Once `Listing.status === SOLD`, the sidebar's Buy Now/Send Offer
panel is replaced entirely by a "SOLD OUT" badge and a redirect of intent toward the Similar
Accounts strip already on the page ("This one's gone — here's what's similar") rather than leaving a
dead-end panel with disabled buttons.

## Data Model

- Replace the V2.1.0-proposed `standingStatus` enum with `Listing.strikeCount (Int)` and
  `Listing.warningCount (Int)`.
- Everything else from `V2.1.0_UPGRADE_PLAN.md` Area 2 stands: `lifetimeViews`, `lifetimeRevenue`,
  `channelRpm`, `audienceLanguage`, `adsenseStatus`.
- No new model needed for the offer-history privacy fix — it's a query/serialization change (which
  fields the API returns depends on whether the requester is the listing's own seller), not a schema
  change.

## Full Page UX/UI

**Header:** platform icon + title + one-line subtitle description.

**Main card:**
- Avatar, channel name, external-link icon, "Listed {relative time}," and the green "Ownership
  Verified" badge.
- Four stat pills: Subscribers, Price, Listed date, Category.
- Description text.
- Feature-pill row: Escrow Accepted, Monetized (or Adsense status where applicable), Monthly
  Earnings, **Listing Views** (new).
- YouTube Channel Analytics card: Lifetime Views, Lifetime Revenue, Channel RPM, Audience, Channel
  Creation Date, and Strike/Warning — now rendered from the two real integer fields, not a status enum.
- Photos gallery with a count badge.
- Similar Accounts For Sale strip.
- Your Other Accounts For Sale strip (seller's other active listings).

**Sidebar:**
- Seller Profile card: avatar, name (linked to their public profile), country flag, Member Since
  date, Last Seen relative time.
- Seller Trust card: Deals, Volume, Reviews, thumbs-up/down ratio.
- Pricing/Offers card — **owner view**: Best Offer highlighted, full offer history (amount + time +
  masked username), Send Offer / Buy Now actions while active, replaced entirely by the SOLD OUT
  state once sold. **Public view**: Best-offer figure only (or nothing), Send Offer / Buy Now while
  active, same SOLD OUT replacement once sold — never the per-offer history list.
- Sponsored/Featured Listings slot (`MILESTONE_2_PLAN.md` promotions).

## Consolidated Task Checklist

- [ ] Replace `standingStatus` enum with `strikeCount`/`warningCount`; derive the display label from the numbers
- [ ] "Listing Views" feature pill
- [ ] Offer-history endpoint returns full detail only to the listing's own seller; public requests get a best-offer figure only, buyer usernames (never emails) when any identity is shown at all
- [ ] SOLD OUT sidebar state replacing the buy/offer panel on sold listings, with a redirect toward Similar Accounts
- [ ] Verify no API response for a listing ever includes another user's email address, sold or active
