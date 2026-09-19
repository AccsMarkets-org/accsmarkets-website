# AccsMarkets — Advanced Escrow Transfer Workflow (Order → Completion)

Planning document only — nothing in this file has been built. This supersedes two earlier specs for
the same surface: M1's original design (seller submits a credentials textarea, buyer logs in with the
password) and `V2.1.0_UPGRADE_PLAN.md` Area 9 (which upgraded the countdown/notice UI but still
assumed credential-sharing underneath). **The workflow below eliminates password-sharing entirely**,
replacing it with the manager-add mechanism you described — and that description was checked against
how YouTube's Brand Account permissions actually work before being written up, because one part of it
doesn't hold together mechanically as stated. That correction is the most important thing in this
document; everything after it is the workflow redesigned around the corrected mechanics.

## Technical Research & Correction

Your description has escrow doing the final step unilaterally: *"after count down End escrow will
remove Seller and give full access to buyer."* Checked against Google's actual rules for Brand Account
permissions:

> Any manager or owner can be made primary owner **only if the person making the change has been an
> owner for 7+ days, and the person being promoted has been a manager or owner for 7+ days.**
> Managers can do everything except add/remove other managers or owners, or transfer the channel.

Two conditions, both required — and that breaks a single 7-day countdown ending in escrow
unilaterally acting:

- Escrow can't promote the buyer unless **escrow itself** has been an *owner* (not manager) for 7+
  days at that point.
- But escrow can't become an owner in the first place unless escrow was already a manager/owner for
  7+ days *before* being promoted.
- So if escrow is only added as a manager on day 0 of this transaction, escrow cannot independently
  execute anything on day 7 — it would need to be promoted to owner on day 7 (once its own manager
  tenure clears), then wait *another* 7 days as an owner before it's allowed to promote the buyer and
  remove the seller. That's a real ~14-day chain, not 7.

This means "escrow automatically completes the handover after 7 days" is only literally true under
one of two conditions: **(a)** the seller performs that final promote-and-remove action themselves at
day 7 (they're already qualified — they've been an owner for however long they've run the channel),
with escrow only having watched and verified during the window, not executed anything; or **(b)** the
platform runs a genuine two-stage ~14-day process so escrow earns independent execution rights before
the buyer's window closes. The reference screenshot's copy ("Escrow will automatically complete the
handover... if you make manual changes, you will be fully responsible") reads like it's describing (a)
with enforcement-through-consequences language, not a Google API actually being triggered by a timer.

**Both models are specified below.** (a) is the practical default — matches the real 7-day window,
matches what a small-scale escrow operation can actually run, and still gives escrow strong leverage
(the seller doesn't get paid until they cooperate). (b) is offered as an optional "Trustless" tier for
high-value transactions where a buyer specifically doesn't want to depend on seller cooperation at the
finish line — it's real, it works, it just takes twice as long, and that tradeoff should be visible to
the user choosing it, not hidden.

**On Facebook/other platforms:** unlike YouTube's well-documented 7-day rule, Meta's Business Manager
page-ownership transfer doesn't have an equally well-established fixed public waiting period in the
same way — it leans more on admin-request/approval flows. Rather than invent a number, the design
below makes the window and the model (Standard vs. Trustless-eligible) **admin-configurable per
platform**, with YouTube shipping a confidently-sourced 7-day default and other platforms shipping a
conservative admin-set default (recommend starting at 3 days) pending real operational data — exactly
the gap `V2.1.0_UPGRADE_PLAN.md` Area 9 already flagged, now resolved with an actual number for the one
platform where a number is actually known.

---

## The Two Models

| | Standard (default) | Trustless (optional, high-value) |
|---|---|---|
| Escrow's role during the window | Manager — can observe, cannot execute | Promoted to co-owner before the window starts |
| Who performs the final promote/remove | The seller, at window-close | Escrow, independently, once its own owner-tenure clears |
| Total duration | The platform's configured window (7 days for YouTube) | Roughly double — escrow's own bootstrap period plus the buyer's window |
| What happens if the seller goes silent | Dispute path — funds stay held, trust score hit, admin can intervene manually with the seller's continued cooperation as leverage | Nothing needed from the seller — escrow completes it regardless |
| Recommended for | The large majority of transactions | Buyer-requested, or admin-required above a configurable value threshold |

---

## Full Stage-by-Stage Workflow

### 1. Order placed (checkout → `FUNDED`)

Buyer clicks Buy Now, or an accepted offer's "Start escrow" — pays price + escrow fee from wallet
balance, same funding mechanics already built in M1 (`POST /api/escrows`, atomic debit, one
`ESCROW_PAYMENT` transaction).

**Immediately after funding:** the buyer is redirected straight into `/dashboard/messages/[sellerId]`
— not back to the listing or a generic success page. A system-generated message posts automatically
into that thread ("🛡️ Escrow #EC-XXXX funded for {listing title} — {amount}. Next: the seller adds the
escrow manager email to the account."), so the conversation starts itself rather than the buyer having
to say something first. This is the chat-unification decision from `V2.1.0_UPGRADE_PLAN.md` Area 6 —
one thread per relationship, enriched with escrow context — now with an explicit trigger point.

### 2. Escrow email issued (`FUNDED` → `AWAITING_MANAGER_ADD`)

The escrow order page displays a dedicated **escrow-controlled email address** for the seller to add
as a channel manager — pulled from a managed pool (see Security & Ops below), not the same address
reused forever, and not any user's personal email.

**UX:** a card on the escrow page titled "Add this email to your channel" — the address in a
copy-to-clipboard field, a short numbered how-to (Settings → Permissions → Invite → paste this email
→ set role to Manager), and a **Submit** button that stays disabled until the seller has had at least
a moment to act (not disabled forever, just not the very first thing rendered as clickable — avoids a
seller reflexively clicking Submit before actually doing anything).

### 3. Seller submits (`AWAITING_MANAGER_ADD` → `PENDING_VERIFICATION`)

Seller clicks Submit once they've added the escrow email as a manager. No credentials are typed in
anywhere — this is the core change from M1's original design.

### 4. Escrow verifies channel access (`PENDING_VERIFICATION` → `VERIFIED`)

**Decision needed:** fully automated verification (querying the escrow account's own managed-channel
list via the YouTube Data API, where available) versus manual admin verification (an admin — or a
dedicated ops team member — logs into the pooled escrow email, checks the manager list, clicks
Verified). Recommend **manual-first**: automated API verification requires API access, quota, and
per-platform engineering that isn't justified until volume warrants it; manual verification is
simpler, matches how a small operation actually runs today, and the UI/data-model below supports
either without a rework — `verifiedBy` just records `SYSTEM` or an admin ID.

**UX:** while pending, the buyer and seller both see a "Verifying channel access…" status with no
action available — this stage is intentionally short (minutes to a couple hours, not days) and mostly
invisible if verification is prompt.

### 5. Buyer added, countdown starts (`VERIFIED` → `IN_TRANSFER`)

Once verified, the seller (or the escrow-manager account, if it has sufficient permission at this
point) adds the **buyer's** email as a manager too. The platform-configured countdown starts the
moment the buyer's manager status is confirmed — this is the buyer's 7-day (YouTube) manager-tenure
clock, the one that actually matters for eligibility to be promoted later.

**Trustless model only:** at this same moment, the seller also promotes the pooled escrow email from
manager to **co-owner** — starting escrow's own tenure clock in parallel with the buyer's, so both
clear together rather than sequentially (see the math in Technical Research above — this only works
if escrow's owner-clock starts no later than the buyer's manager-clock).

**UX (matches the reference screenshot's density, restyled to brand):**
- The live countdown card ("7-Day Security Window — funds release after countdown," `Xd Xh Xm Xs
  remaining`, server-anchored so it survives refreshes).
- The red Important Notice box, content pulled from the platform's configured policy note — for
  YouTube: don't manually promote the buyer, don't modify manager/owner roles, don't alter access
  levels during this window, and (Standard model) an explicit reminder that **the seller is the one
  who must complete the final step when the countdown ends** — this isn't passive waiting, it's a
  scheduled action they're responsible for.
- The "Chat with Escrow Support" card, entry point into the same thread from Step 1.
- A proactive "Leave a review" banner, primed but inactive until completion.

### 6. Window closes — completion differs by model

**Standard:** the seller receives a notification the moment the countdown hits zero ("Your window has
closed — promote the buyer to Owner and remove yourself, then confirm below"), and a **"Confirm
handover complete"** button appears for the seller to click once they've done it. The buyer
independently confirms they now have full owner access before funds actually release — so completion
still requires **both** the seller's action-confirmation and the buyer's access-confirmation, matching
the existing M1 principle that fund release is never purely timer-driven. If the seller doesn't act
within a grace period (admin-configurable, e.g. 48 hours past window-close), the escrow status flips
to a dispute-eligible state and the buyer can escalate — the seller not getting paid is real leverage
here, not just a strongly worded notice.

**Trustless:** once both clocks (buyer-manager, escrow-owner) have cleared, the platform surfaces a
"Ready to complete" state and an admin-triggered (not fully unattended, even here — a human confirms
before anything executes) action: escrow, using its co-owner permission, promotes the buyer to primary
owner and removes the seller. No seller action or cooperation is required at this point, by design.

Either way, completion then runs the same fund-release logic already built in M1's `complete` route:
seller's wallet credited the full sale price, buyer/seller trust scores +5, listing → `SOLD`.

---

## Data Model Additions

- `EscrowManagerEmail { id, address, platform, status (AVAILABLE|IN_USE|FLAGGED), assignedEscrowId?,
  addedAsManagerAt?, notes }` — the pooled escrow-controlled email addresses (see Security & Ops).
- `PlatformTransferPolicy { platform, defaultDays, allowTrustless (Boolean), trustlessBootstrapDays,
  policyNote (Text), sourceNote (Text) }` — replaces the single global `escrowTransferDays`; YouTube
  ships with `defaultDays: 7`, `allowTrustless: true`, `trustlessBootstrapDays: 7`
  (owner-tenure requirement), and a `sourceNote` citing Google's published rule so the number is
  traceable, not just asserted.
- `Escrow` gains: `transferModel` (enum: `STANDARD | TRUSTLESS`), `managerEmailId`, `managerAddedAt`,
  `verifiedAt`, `verifiedBy` (`SYSTEM` or an admin's id), `buyerManagerAddedAt`, `countdownEndsAt`,
  `escrowOwnerPromotedAt` (Trustless only), `sellerConfirmedHandoverAt` (Standard only). The existing
  `credentialsPayload`/encryption fields from M1 become unused for platforms adopting this model but
  stay in the schema — some platforms (e.g. ones without a manager-invite concept at all) may still
  need the credential-handoff path as a fallback, so it isn't removed, just no longer the default for
  YouTube-style platforms.
- New status values on `EscrowStatus`: `AWAITING_MANAGER_ADD`, `PENDING_VERIFICATION` inserted between
  the existing `FUNDED` and `SUBMITTED`/`VERIFIED` — `IN_TRANSFER` keeps its meaning (countdown
  active) and `COMPLETED` is unchanged.

## API Routes

`GET /api/escrows/[id]/manager-email` (allocates/returns the pooled address for this escrow),
`POST /api/escrows/[id]/submit-manager-add` (seller confirms they've added it — replaces the old
credentials-submit route for platforms on this model), `POST /api/admin/escrows/[id]/verify-manager`
(manual verification action), `POST /api/escrows/[id]/add-buyer-manager` (starts the countdown), `POST
/api/escrows/[id]/confirm-handover` (Standard model, seller-triggered), `POST
/api/admin/escrows/[id]/execute-trustless-handover` (Trustless model, admin-confirmed execution), plus
an automatic-message hook on the existing `POST /api/escrows` route firing the Step 1 system message
into the buyer↔seller DM thread.

## Admin Configurability

`/admin/settings` (or a dedicated `/admin/transfer-policies`) gets one row per platform:
`defaultDays`, whether `Trustless` is offered as a buyer option (and its own bootstrap length), and the
`policyNote`/`sourceNote` text shown in the Important Notice box — editable without a deploy, per the
already-established pattern from `MILESTONE_2_PLAN.md`'s DB-editable email templates. YouTube ships
pre-filled and sourced; every other platform ships with a conservative default an admin can tune once
real dispute/completion-time data exists (feeding back into `MILESTONE_5_PLAN.md` Phase 2's dispute-
intelligence work, which already plans to recommend exactly this kind of adjustment from real data).

## Security & Ops — the Escrow Email Pool

This is real operational infrastructure, not just a UI detail, and deserves explicit attention:

- A **pool**, not one shared address — funneling every transaction through a single Google account
  risks that account itself getting rate-limited or flagged by YouTube for unusual activity across
  many unrelated channels. Pool size scales with transaction volume.
- Every pooled email needs its own strong password + mandatory 2FA, credentials held only by the
  ops/admin team, never exposed to end users.
- `EscrowManagerEmail.status = FLAGGED` gives admins a way to pull a specific address out of rotation
  if a platform ever restricts it, without that becoming a live incident affecting in-flight escrows.
- Manual verification (Step 4) means whoever holds these credentials has real operational
  responsibility — this should be a small, trusted, audited group, and every verification action is
  already captured via `verifiedBy` for accountability.

---

## Consolidated Task Checklist

- [ ] `EscrowManagerEmail`, `PlatformTransferPolicy` models; new `Escrow` fields and status values
- [ ] Escrow-email pool provisioning process + 2FA policy for pooled accounts (an ops task, not just code)
- [ ] Auto-redirect to messages + system-generated auto-message on order funding
- [ ] "Add this email to your channel" order-center card + Submit action
- [ ] Manual verification flow/admin action (`verifiedBy` tracked); automated API verification deferred until volume justifies it
- [ ] Buyer-manager-add action that starts the server-anchored countdown
- [ ] Standard-model completion: seller confirm-handover action + buyer access-confirmation, both required before release
- [ ] Grace-period-then-dispute-eligible path if the seller doesn't confirm after window-close
- [ ] Trustless model: co-owner promotion at window start, dual-clock tracking, admin-confirmed independent execution at bootstrap-clear
- [ ] Per-platform admin configuration UI (days, Trustless eligibility + bootstrap length, policy/source notes)
- [ ] YouTube pre-filled with the sourced 7-day default; other platforms shipped with a conservative, clearly-labeled-as-provisional default
- [ ] Decide: which platforms besides YouTube get a manager-based flow at all vs. keep the legacy encrypted-credentials fallback (platforms without an invite-a-manager concept have no alternative)

---

## Sources

- [YouTube new 7-day rule — SWAPD](https://swapd.co/t/youtube-new-7-day-rule-another-roadblock-for-transferring-channels-you-can-transfer-primary-ownership-7-days-after-becoming-an-owner/209898)
- [Change channel owners & managers with a Brand Account — YouTube Help](https://support.google.com/youtube/answer/4628007?hl=en)
- [Change who manages your Brand Account — Google Account Help](https://support.google.com/accounts/answer/7311601?hl=en&co=GENIE.Platform%3DDesktop)
- [Channels and Roles: YouTube Administrators and Managers — Prodvigate](https://prodvigate.com/blog/administrators-and-managers-of-your-channel-on-youtube/)
