# AccsMarkets — Advanced Order Completion Workflow

Planning document only — nothing in this file has been built. This is the completion-state spec that
`ESCROW_ADVANCED_WORKFLOW.md` Step 6 only summarized — the reference screenshot shows the same escrow
detail page, now in its terminal `COMPLETED` state, and it surfaces one accuracy problem worth fixing
before this ships: the completion message it displays isn't true for every path this platform actually
supports.

## The Accuracy Problem, and the Fix

The reference's completion copy reads: *"Escrow has assigned the buyer as the Primary Owner and
released your payment... Your email has been removed from the channel."* That's accurate **only** for
`ESCROW_ADVANCED_WORKFLOW.md`'s Trustless model, where escrow genuinely holds co-owner permission and
executes the swap itself. For the **Standard model — the default** — it's the seller who performs
that final promotion and removal themselves, with escrow only having verified and waited. Showing
every seller "Escrow has assigned..." when the seller just did that action manually a minute ago
misdescribes what happened, and quietly implies a capability (unattended platform-side execution)
that the Standard model deliberately doesn't have. **The completion message must be model-aware:**

- **Standard:** *"You've completed the handover — payment has been released to your wallet."*
  (Seller-facing.) *"The seller has completed the handover and you're now the Primary Owner."*
  (Buyer-facing.)
- **Trustless:** *"Escrow completed the handover automatically once both waiting periods cleared —
  payment has been released to your wallet."* (Seller-facing.) *"Escrow completed the handover
  automatically — you're now the Primary Owner."* (Buyer-facing.)

## Seller View vs. Buyer View

The same completed order means something different to each side, so the copy and the available
actions differ — not just the pronoun:

**Seller sees:** confirmation payment landed in their wallet, confirmation their manager/owner access
to the channel is gone (a fact worth stating plainly — it closes the loop on "did I actually lose
access when I was supposed to"), a **Download Receipt** button (the PDF receipt feature from
`V2.2.0_UPGRADE_PLAN.md` Pillar B — this is exactly the placement it was designed for), a **Leave a
Review** button (now actually present, not just referenced by the informational banner further up the
page), and a prompt toward listing something else ("List another account").

**Buyer sees:** confirmation of full ownership, the same Download Receipt button, the same Leave a
Review button, and — since they're the one who now has to actually operate the account — a short
reminder that the standard next step is checking the account's health, which connects forward to
`MILESTONE_5_PLAN.md` Phase 1's warranty window (see below), not left as a dead end.

## What Recourse Still Exists After Completion

The reference correctly drops the "Open Dispute" button once an order is `COMPLETED` — matching the
existing state machine, where `COMPLETED` has no further transitions. That's right, but it shouldn't
read as "no recourse ever again" without saying what actually *does* apply from here: this is exactly
the moment `MILESTONE_5_PLAN.md` Phase 1's post-transfer warranty window begins (if that phase has
shipped). The completed-order page should say so explicitly — a short line ("Covered by a 7-day
account health warranty — {countdown}") rather than the page going silent about protection the moment
the escrow itself closes.

## UX/UI

- Header bar: `COMPLETED` status pill (green), same transaction-ID/listing/participants layout as
  every other escrow state, unchanged from `ESCROW_ADVANCED_WORKFLOW.md`.
- The green celebratory card: a checkmark icon, "Thank you for using AccsMarkets' secure escrow
  service," the model-aware headline and explanation from above, and — if the warranty phase is live —
  the warranty-window line.
- **Leave a Review** button, live here (not just promised by the informational banner higher on the
  page) once completion fires, tying directly into `MILESTONE_2_PLAN.md`'s review feature.
- **Download Receipt** button, generating the PDF from existing `Transaction`/`Escrow` data per
  `V2.2.0_UPGRADE_PLAN.md` Pillar B.
- Bottom action row: Return, Message {counterparty} — no Open Dispute (correctly absent, per the state
  machine), replaced conceptually by the warranty line above rather than left unexplained.

## Consolidated Task Checklist

- [ ] Model-aware completion copy (Standard vs. Trustless), and role-aware (buyer vs. seller) — four copy variants total, not one generic message
- [ ] Seller completion view: payment-landed confirmation, access-removed confirmation, Download Receipt, Leave a Review, "List another account" prompt
- [ ] Buyer completion view: ownership confirmation, Download Receipt, Leave a Review, account-health reminder linking toward the warranty window
- [ ] Warranty-window line on the completed-order page once `MILESTONE_5_PLAN.md` Phase 1 ships, so "no dispute button" doesn't read as "no protection"
- [ ] Confirm Open Dispute is correctly absent in `COMPLETED` (already true per the existing state machine — verify the UI matches, not just the backend)
