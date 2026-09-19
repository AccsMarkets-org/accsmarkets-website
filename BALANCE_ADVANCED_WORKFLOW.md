# AccsMarkets — Advanced Balance (Wallet) Page Workflow

Planning document only — nothing in this file has been built. This completes two things earlier docs
only sketched: `V2.1.0_UPGRADE_PLAN.md` Area 7's settings sub-nav (this screenshot is the concrete
proof it works as designed) and Area 11's "not simple" deposit/withdrawal upgrade (now with an actual
layout, a real wallet breakdown, and a payment-method-aware fee display to build against).

## Reference Teardown

- A persistent left sidebar groups settings-adjacent pages: **Business Settings** (My Account,
  Balance, Security), **Financial Management** (Plans, Transactions, Subscriptions), **Notifications**,
  and **Delete Account** as its own bottom section — exactly the sub-nav restructure
  `V2.1.0_UPGRADE_PLAN.md` Area 7 proposed, now validated by a concrete reference rather than only a
  written spec.
- The Balance page itself has three tabs: **Balance** / **Withdraw** / **Transactions** — consistent
  with the payment-method-tile direction Area 11 called for, now with confirmed page structure.
  - The Wallet card shows **Available Balance**, plus two breakdowns: **Escrow Pending Deals** (funds
    currently tied up in active escrows) and **Escrow Completed** (lifetime value of completed deals)
    — a more useful split than the "Available vs. Reserved-for-withdrawal" framing Area 11 originally
    proposed; both are worth showing (see below).
  - Three trust/reassurance rows: Secure & Encrypted, Instant Credit, Escrow Protected.
- The **Add Funds** panel: amount input, quick-amount shortcuts, a payment-method selector, and a
  live fee breakdown (Deposit amount / Processing fee / Total to pay) — the same mechanism
  `BANK_TRANSFER_ADVANCED_WORKFLOW.md` specs in full for the Bank Transfer method specifically.

## Wallet Breakdown, Reconciled

Area 11 (`V2.1.0_UPGRADE_PLAN.md`) proposed surfacing Available vs. Reserved-for-pending-withdrawal —
real logic that already exists server-side in M1's withdrawal route but was never shown to the user.
This reference shows a *different*, equally real, and equally useful split: funds locked in **active
escrows as buyer** versus **lifetime completed volume**. Both pieces of information matter and answer
different questions ("can I withdraw right now" vs. "how much do I have tied up in deals in
progress" vs. "how much have I done overall") — so the wallet card should show all three, not pick one
over the other:

- **Available Balance** — spendable/withdrawable right now (already nets out reserved-pending-
  withdrawal amounts server-side; that logic doesn't need to be re-explained in a fourth box, it's
  already reflected in this one number).
- **Escrow Pending** — sum of amounts currently locked in the user's own active escrows (as buyer:
  funds sent, not yet released; the number naturally doesn't include a seller's incoming funds, which
  aren't "theirs" until the escrow completes).
- **Escrow Completed** — lifetime value of the user's completed deals (this is `Total Earnings` on the
  seller-mode dashboard from `DASHBOARD_ADVANCED_WORKFLOW.md`, restated here in the wallet-specific
  context — same underlying aggregation, not a second calculation).

## Settings Sub-Nav: Plans vs. Subscriptions Clarified

The reference lists both **Plans** and **Subscriptions** as separate nav items — worth being precise
about the difference before building two pages that could otherwise blur together: **Plans**
(`/settings/plans`) is the browse/compare/upgrade page — the same pricing-card grid pattern from the
landing page's `PricingSection`, parameterized with a "Current plan" state exactly as
`MILESTONE_2_PLAN.md` Phase 4 specced. **Subscriptions** (`/settings/subscriptions`) is the
management/history page — current plan's billing date, past subscription payments, cancel/downgrade
actions. Browsing and managing are different tasks and stay different pages, matching the reference's
own choice to list them separately rather than merge them.

## UX/UI

**Left sub-nav** (present across every settings-adjacent page, not just Balance): the four grouped
sections exactly as listed above, current page highlighted.

**Tab strip:** Balance / Withdraw / Transactions, each a full page rather than a client-side toggle
within one page — keeps each surface's own loading/pagination state clean and independently
linkable/bookmarkable.

**Wallet card:** Available Balance as the large headline figure, the Escrow Pending / Escrow Completed
two-box breakdown beneath it (icon-coded — clock/amber for pending, checkmark/green for completed),
an "Active" status pill, and the "Protected by AccsMarkets Escrow" trust line.

**Trust/reassurance rows:** Secure & Encrypted, Instant Credit, Escrow Protected — three short rows
with icon + bold label + one-line explanation, standing reassurance rather than tied to any specific
action.

**Add Funds panel:** as specced in full by `BANK_TRANSFER_ADVANCED_WORKFLOW.md` — amount input, quick
amounts, payment-method selector, live fee breakdown, Deposit Now — this page is where that panel
actually lives.

## Consolidated Task Checklist

- [ ] Settings sub-nav applied consistently across every settings-adjacent page (Account, Balance, Security, Plans, Transactions, Subscriptions, Notifications, Delete Account)
- [ ] `/settings/plans` (browse/upgrade) vs. `/settings/subscriptions` (manage/history) built as distinct pages, not merged
- [ ] Balance page split into three real pages/tabs: Balance, Withdraw, Transactions
- [ ] Wallet card: Available Balance + Escrow Pending + Escrow Completed, all three shown (not one chosen over another)
- [ ] Escrow Pending computed from the user's own active escrows as buyer; Escrow Completed shares its aggregation with the seller-dashboard's Total Earnings figure, not recalculated separately
- [ ] Add Funds panel embedded here, per `BANK_TRANSFER_ADVANCED_WORKFLOW.md`'s full spec
- [ ] Trust/reassurance row set (Secure & Encrypted / Instant Credit / Escrow Protected)
