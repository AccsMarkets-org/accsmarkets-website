# AccsMarkets — Advanced Account Details Workflow (Listing Wizard, Step 3)

Planning document only — nothing in this file has been built. This is the deep-dive on specifically
the data-entry step of the listing creation wizard — where `V2.1.0_UPGRADE_PLAN.md` Area 2 covered it
briefly alongside the whole listing detail page, this document goes deep on the form itself and
catches three real inconsistencies between what that page displays and what this form would actually
collect, which are worth fixing before either gets built.

## Corrections & Reconciliations

**1. Drop "Escrow Accepted" from the form entirely — it's not just redundant, it's contradictory.**
On the reference platform this might mean something (maybe they support non-escrow deals elsewhere).
On AccsMarkets it can't mean anything, because escrow isn't optional — it's Key Business Rule #1
("buyer pays first, funds held upfront, no IOUs"), and `lib/moderation.ts` actively **blocks** listings
that even suggest bypassing it. A checkbox implying a seller could opt out of escrow would directly
contradict how the platform works. This isn't a "keep it but grey it out" situation — it shouldn't be
in the form at all. (Same call already made for the display page in
`LISTING_PAGE_ADVANCED_WORKFLOW.md`, restated here because it originates in this form.)

**2. The Channel Analytics fields must include everything the detail page displays — the reference
screenshot's form is missing three of them.** `LISTING_PAGE_ADVANCED_WORKFLOW.md` (via
`V2.1.0_UPGRADE_PLAN.md` Area 2) specs the detail page showing Lifetime Views, **Lifetime Revenue**,
**Channel RPM**, Audience/Language, Creation Date, **Adsense Status**, and Strike/Warning counts. This
reference form only shows Lifetime Views, Creation Date, Audience/Language, and a free-text
strikes/warnings box. A field that's displayed but never collected will just always be empty — so the
form below includes all seven, not the reference's four.

**3. Strikes/Warnings needs to be structured, not free text.** The reference uses one open textarea
("Any Strikes/Warnings?"). `LISTING_PAGE_ADVANCED_WORKFLOW.md` already decided the display page needs
real integers (`strikeCount`, `warningCount`) as the single source of truth for its derived
"Good Standing" / "N Strikes, N Warnings" label — a label can't be reliably derived from parsed free
text. The form needs two small number inputs instead, with an optional short text field alongside them
for context a seller wants to add ("1 copyright strike from 2023, resolved") — the counts drive the
display badge, the text is supplementary color a buyer can read if curious, never parsed for anything.

**4. The channel preview card needs a source, and auto-fetch isn't one — this platform doesn't have
it.** The reference's Step 3 preview (avatar + name + subscriber count) implies Step 1 auto-populated
this via a platform API ("Fetch Channel Info"), which the original spec described but M1 explicitly
deferred (it needs per-platform API integrations not in scope). Since Step 1 here is manual
platform-picker + URL entry only, Step 3 has nothing to preview unless Step 1 also collects a
**Display Name** text field. Fix: add that one field to Step 1 (already a near-zero-cost addition to
an existing form), and have the Step 3 preview show it plus a placeholder avatar until a real image
exists — swapped for the first uploaded screenshot once the seller gets to that part of Step 3, rather
than staying a generic placeholder through the whole flow.

**5. Description limit tightened to 1,000 characters**, matching the reference rather than the
current build's 5,000-character allowance — 5,000 is excessive for what a listing description needs
to communicate, and a tighter limit also keeps descriptions scannable on the detail page's already
dense layout.

## Full Field Spec (Step 3)

- **Channel preview** — avatar (placeholder → first screenshot once uploaded), Display Name (from
  Step 1), subscriber/follower count if captured.
- **Category** — select, required.
- **Price (USD)** — number input, required, matches existing `price.min(1)` validation.
- **Monetized?** — segmented Yes/No control (already specced as an upgrade from checkbox in
  `V2.1.0_UPGRADE_PLAN.md` Area 2).
- **Description** — textarea, 20–1,000 characters, live counter.
- **Description Rules box** — generated from the real `lib/moderation.ts` scam/spam/off-platform-
  contact categories (per Area 2's decision), not static copy that can drift from what's actually
  enforced.
- **Channel Analytics** (bordered sub-section, all optional but encouraged):
  - Lifetime Views (number)
  - Lifetime Revenue (number, currency-formatted)
  - Channel RPM (number, currency-formatted)
  - Adsense Status (select: On / Off / Changeable)
  - Audience & Language (text)
  - Channel Creation Date (date picker)
  - Strike Count / Warning Count (two small number inputs) + optional context text (short textarea)
- **Screenshots/Images** — file upload, PNG/JPG, multiple allowed (already built in M1, screenshot
  upload happens post-creation from the manage-listings page per the existing design — this form's
  upload control should match that same upload path rather than introducing a second one).
- **Review-time notice** — sourced from `PlatformSettings`, not hardcoded ("reviewed within 12–48
  hours").
- **Submit Listing** / **Back to Step 1**.

## Data Model (final, reconciled)

`Listing` fields for this step: `price`, `monetized (Boolean)`, `description`, `lifetimeViews (Int?)`,
`lifetimeRevenue (Decimal?)`, `channelRpm (Decimal?)`, `adsenseStatus (enum: ON|OFF|CHANGEABLE)`,
`audienceLanguage (String?)`, `channelCreationDate (DateTime?)`, `strikeCount (Int, default 0)`,
`warningCount (Int, default 0)`, `strikeWarningContext (String?, the optional free-text explanation)`.
`Step 1` gains `displayName (String)` to feed the Step 3 preview.

## Validation

- `description`: 20–1,000 chars (tightened from the current 5,000).
- `strikeCount`/`warningCount`: non-negative integers, no upper bound enforced (a seller with many
  strikes should still be able to list honestly — the number itself, shown plainly on the detail
  page, is the market signal, not a submission gate).
- No `escrowAccepted` field exists anywhere in the schema — nothing to validate because nothing to
  collect.

## Consolidated Task Checklist

- [ ] Remove any "Escrow Accepted" concept from the schema and form — confirm it was never added, not just hidden
- [ ] Add `displayName` to Step 1; Step 3 preview sources it (with placeholder → first-screenshot avatar fallback)
- [ ] Full Channel Analytics field set in the form (all seven fields, not just the reference's four)
- [ ] Strike/Warning restructured to two numeric inputs + optional context text, replacing the single free-text box
- [ ] Description limit tightened to 1,000 chars in both the form and the Zod schema
- [ ] Description Rules box generated from live `lib/moderation.ts` categories
- [ ] Review-time notice sourced from `PlatformSettings`, not hardcoded
- [ ] Screenshot upload in this step reuses the same upload path already built for post-creation uploads, not a second implementation
