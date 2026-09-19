# AccsMarkets — Advanced Bank Transfer Deposit Workflow

Planning document only — nothing in this file has been built. This is a genuinely new deposit method
— not a restyle of something that exists. M1 shipped two ways to fund a wallet (instant crypto via
NOWPayments, manual USDT with a tx hash) and this reference adds a third: **bank wire/ACH/SWIFT**,
verified by admins against the platform's own receiving bank account, mechanically closer to the
manual-crypto path than the instant-crypto one, but with a materially richer UI and — new — a real
processing fee shown transparently before the user commits.

## Reference Teardown

- The **Add Funds** panel (on the Balance page) now has a payment-method selector (Bank Transfer
  shown selected; Crypto presumably the other option) and shows a **processing fee** applied to the
  deposit amount before the total is charged — $5.00 deposit + 2% ($0.10) = $5.10 total — something
  M1's current deposit flow doesn't do at all (crypto deposits currently credit at face value, no
  platform-side fee).
- Submitting routes to a dedicated confirmation page: a 4-step tracker (Order placed → Send payment →
  We verify → Balance added), the total payment due, a copyable Order ID that doubles as the required
  payment reference, full bank details (bank name, account name/number, type, routing number,
  SWIFT/BIC) each individually copyable, a fees/instructions box, an amber warning about intermediary
  bank deductions, an "I Have Sent the Payment" action, Download Invoice / My Dashboard secondary
  actions, and a support card offering live chat.

## Two Different Fees — Don't Conflate Them

The reference shows two distinct costs that must stay conceptually separate in the design, or the
math (and the copy explaining it) will confuse users:

1. **AccsMarkets's own processing fee** (2% in the example) — known and fixed in advance, added to
   the deposit amount to produce the "Total to pay." This is what the user actually needs to send.
2. **Third-party banking-rail fees** (ACH free, Wire $6.11, SWIFT $6.11, plus unpredictable
   intermediary-bank deductions on international transfers) — costs charged by *the sender's own bank
   or correspondent banks along the way*, entirely outside AccsMarkets's control. This is why the
   reference warns the user to send slightly more than the total due — not because AccsMarkets wants
   extra, but because a shortfall caused by an intermediary bank's cut would otherwise leave the
   deposit short.

**Decision needed, made concrete:** what happens when the amount actually received doesn't exactly
match the total due, because of (2) above? Recommend a small configurable tolerance (e.g., credit in
full if the shortfall is under $1 or under 1% of the total, whichever is greater) — anything beyond
that tolerance routes to a "Partial payment received" admin state requiring a manual decision (credit
the reduced amount, or contact the user to send the difference) rather than silently crediting less
than what the order said, or silently absorbing an unbounded loss.

## Full Flow

1. **Initiate.** User selects Bank Transfer in the Add Funds panel, enters an amount (≥ the
   configured minimum), sees the fee breakdown live, clicks Deposit Now.
2. **Order created.** A `BankTransferOrder` is created with a human-readable ID (`BT-XXXXXXXXXX`),
   the total-due amount locked in, and one of the platform's configured receiving bank accounts
   assigned (a small admin-managed set — one per currency/corridor, e.g. a USD account for ACH/Wire —
   not a large rotating pool the way the escrow manager-email addresses needed to be, since bank
   accounts don't carry the same platform-flagging risk crypto-adjacent email pools do).
3. **Instructions page.** The user lands on the "Almost There!" confirmation with everything needed to
   send the transfer, and nothing else required of them until they've actually done it.
4. **User confirms sent.** "I Have Sent the Payment" moves the order from `AWAITING_PAYMENT` to
   `AWAITING_VERIFICATION` — this is a user-asserted claim, not proof, and the UI should read that
   way (it advances the tracker to "We verify," not to "Balance added").
5. **Admin verifies.** An admin checks the actual bank account for a matching incoming transfer
   (referenced by the Order ID), then confirms (exact or within-tolerance match → wallet credited
   atomically, same pattern as M1's existing manual-deposit-confirm route) or flags a shortfall/rejects
   with a reason.
6. **Resolved.** Confirmed: tracker completes, user notified, wallet credited. Rejected: user
   notified with the specific reason, Order ID preserved for reference in any follow-up.

## Data Model

- `PlatformBankAccount { id, currency, bankName, accountName, accountNumber, accountType,
  routingNumber, swiftBic, isActive }` — admin-managed, small set, not a pool.
- `BankTransferOrder { id, orderRef (e.g. BT-XXXXXXXXXX), userId, depositAmount, processingFee,
  totalDue, bankAccountId, status (AWAITING_PAYMENT|AWAITING_VERIFICATION|PARTIAL|CONFIRMED|REJECTED),
  amountReceived?, markedSentAt?, verifiedAt?, verifiedByAdminId?, rejectionReason? }`.
- `DepositMethodFee { method (CRYPTO_INSTANT|CRYPTO_MANUAL|BANK_TRANSFER), feePercent, minFee }` —
  admin-configurable per method, computed with the same `max(amount × rate, minFee)` shape already
  established by `lib/fees.ts` for escrow, rather than inventing new fee math for this one surface.

## API Routes

`POST /api/wallet/deposit/bank-transfer` (creates the order, returns the assigned account + total
due), `POST /api/wallet/deposit/bank-transfer/[orderId]/mark-sent`, `GET
/api/wallet/deposit/bank-transfer/[orderId]` (powers the confirmation page's live status), `GET/PUT
/api/admin/bank-transfers/[orderId]` (verification queue + confirm/reject/partial actions), `GET/POST/PUT
/api/admin/bank-accounts` (managing the small receiving-account set).

## UX/UI

**Add Funds panel:** amount input, quick-amount buttons ($50/$100/$250/$500), a Payment Method
selector (Instant Crypto / Manual Crypto / Bank Transfer), and a live-updating breakdown (Deposit
amount / Processing fee / Total to pay) that recalculates the instant the amount or method changes —
no surprise total on the next screen.

**Confirmation page:** the 4-step tracker; a large Total Payment Due figure; the copyable Order ID
framed explicitly as "use this as your payment reference"; the bank-details table with a copy button
per field (not one copy-all button — users typically paste these one at a time into their own bank's
transfer form); the fees/instructions box with the ACH/Wire/SWIFT cost breakdown and the
send-a-little-extra warning; "I Have Sent the Payment"; Download Invoice (reusing the receipt/invoice
generation from `V2.2.0_UPGRADE_PLAN.md` Pillar B); My Dashboard.

**Support card:** "Chat with Support" deep-links into the pinned Official Escrow conversation from
`MESSAGES_ADVANCED_WORKFLOW.md`, pre-filled with the Order ID as context — the same pattern already
established for escrow-support escalation, reused here rather than inventing a separate support entry
point for deposit issues.

**Admin queue:** `/admin/bank-transfers` — same queue-card pattern as `/admin/deposits`, showing the
order's claimed-sent status, amount due, assigned account, and Confirm / Flag Shortfall / Reject
actions.

## Consolidated Task Checklist

- [ ] `PlatformBankAccount`, `BankTransferOrder`, `DepositMethodFee` models
- [ ] Decide + implement the shortfall tolerance policy for underpaid transfers
- [ ] Deposit initiation route + order creation with account assignment
- [ ] Mark-sent action; admin verify/reject/partial routes with atomic wallet credit on confirm
- [ ] Add Funds panel: method selector + live fee breakdown
- [ ] Confirmation page: tracker, order ID, per-field-copyable bank details, fee/instructions box, actions
- [ ] Download Invoice wired to the receipt feature; Chat with Support wired to the Official Escrow thread with order context
- [ ] `/admin/bank-transfers` queue; `/admin/bank-accounts` management
