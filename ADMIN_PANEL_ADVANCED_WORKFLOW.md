# AccsMarkets — Advanced Admin Panel (Full Control Center)

Planning document only — nothing in this file has been built. Admin capability has been specified
piecemeal across thirteen prior documents — this one does two things: **consolidates all of it into
one coherent navigation structure** (so "where does X live in the admin panel" has one answer, traced
back to its source doc), and **fills the gaps that fell through the cracks of every individual
feature spec** — things no single feature-focused document would naturally think to include, because
they're not about any one feature, they're about running the whole platform.

## What Fell Through the Cracks

Nine real gaps, none owned by any single prior document because each one cuts across the whole system:

1. **`AdminAuditLog` has been written to since M1 and never once been given a page to read it back.**
   Every admin action logs — nothing lets an admin actually browse that log.
2. **No unified search.** An admin with a transaction ID, an email, or a listing title has no single
   place to paste it and get routed to the right record.
3. **No page for managing who *has* admin access.** `make_moderator` exists as an action on the Users
   page, but there's no dedicated, security-conscious roster view for the one thing that matters most
   to lock down carefully.
4. **No emergency controls.** `PlatformSettings.maintenanceMode` exists as a raw field with no UI, and
   there's no way to pause registrations, listings, withdrawals, or deposits independently during an
   incident — every response has to be a code change or a direct DB edit.
5. **No proactive review of borderline-scored content.** `lib/moderation.ts` auto-blocks at score ≥ 40
   — nothing surfaces the 15–39 range for a human to glance at before it becomes a problem.
6. **No admin path to moderate a review.** `MILESTONE_2_PLAN.md`'s review system has no "remove this
   abusive/fake review" action anywhere.
7. **No way for admins to leave each other context.** The audit log records *actions* — it has no
   room for "I'm already handling this, don't duplicate" or free-form notes on a flagged account.
8. **Critical events sit in queues waiting to be noticed**, rather than actively alerting anyone.
9. **CSV exports are scattered per-page** (`/admin/reports/export`, `/admin/users/export`) instead of
   living in one reporting hub.

All nine are specced in full further down.

---

## Full Admin Information Architecture

Every admin surface across every prior document, in one navigation map. Each entry is traced to
where it was specced (`—`) or marked **NEW** if introduced here.

### Overview
- **Dashboard** — stats, action queues, platform analytics/earnings charts — `MILESTONE_1_PLAN`, `MILESTONE_3_PLAN` Ph.12, `DASHBOARD_ADVANCED_WORKFLOW`
- **System Health** — DB/socket/queue status — `MILESTONE_3_PLAN` Ph.1
- **Audit Log** — **NEW**, see below
- **Global Search** — **NEW**, see below

### People
- **Users** — search, ban, badge, balance, trust score — `MILESTONE_1_PLAN`, `MILESTONE_2_PLAN` Ph.10
- **Organizations (KYB)** — team accounts, business verification — `MILESTONE_4_PLAN` Ph.2
- **Admin Team & Roles** — **NEW**, see below
- **Verification Queue** — personal KYC + KYB tabs — `MILESTONE_2_PLAN` Ph.6, `MILESTONE_4_PLAN` Ph.2
- **Compliance (AML/Sanctions)** — screening hits only — `MILESTONE_4_PLAN` Ph.3
- **Risk & Fraud** — flagged accounts, category risk profiles — `MILESTONE_3_PLAN` Ph.4, `MILESTONE_5_PLAN` Ph.2

### Marketplace
- **Listings** — approve/reject/suspend, tabs — `MILESTONE_1_PLAN`, `MILESTONE_2_PLAN`
- **Content Review Queue** — **NEW**, see below
- **Categories & Verticals** — if new asset types shipped — `MILESTONE_5_PLAN` Ph.3
- **Reports** (user-filed) — `MILESTONE_2_PLAN` Ph.3
- **Review Moderation** — **NEW**, see below

### Transactions
- **Escrows** — monitor + full workflow controls — `MILESTONE_1_PLAN`, `ESCROW_ADVANCED_WORKFLOW`
- **Escrow Manager-Email Pool** — `ESCROW_ADVANCED_WORKFLOW`
- **Disputes** — evidence review, ruling — `MILESTONE_2_PLAN` Ph.9
- **Warranty Claims** — `MILESTONE_5_PLAN` Ph.1
- **Transactions Ledger** — filterable, exportable — `MILESTONE_2_PLAN`, `MILESTONE_3_PLAN` Ph.12
- **Deposits** — crypto manual + bank transfer tabs — `MILESTONE_1_PLAN`, `BANK_TRANSFER_ADVANCED_WORKFLOW`
- **Withdrawals** — `MILESTONE_1_PLAN`
- **Bank Accounts** — platform receiving accounts — `BANK_TRANSFER_ADVANCED_WORKFLOW`
- **Crypto Wallets** — receiving addresses — `MILESTONE_2_PLAN`
- **Treasury & Reserves** — internal reconciliation view — `MILESTONE_5_PLAN` Ph.7

### Support & Trust
- **Support Tickets** — `MILESTONE_2_PLAN` Ph.8
- **Live Support Inbox** — official-channel + anonymous chat, unified — `V2.2.0_UPGRADE_PLAN` Pillar D, `MESSAGES_ADVANCED_WORKFLOW`
- **Canned Responses** — `V2.2.0_UPGRADE_PLAN` Pillar D
- **Messages Monitor** (read-only DM/escrow oversight) — `MILESTONE_2_PLAN`
- **Security Flags** — `MILESTONE_3_PLAN` Ph.10, `MILESTONE_3_PLAN` Ph.4

### Content & Growth
- **Blog** — `MILESTONE_2_PLAN` Ph.11
- **Academy** — `MILESTONE_5_PLAN` Ph.11
- **Announcements** — `MILESTONE_2_PLAN` Ph.8
- **Email Templates** — `MILESTONE_2_PLAN` Ph.8, `EMAIL_TEMPLATES.md`
- **Translations** — `MILESTONE_4_PLAN` Ph.1
- **Market Intelligence Reports** — `MILESTONE_5_PLAN` Ph.9
- **Promotions Pricing** — `MILESTONE_2_PLAN`
- **Partners** — syndication/affiliate + escrow-as-a-service — `MILESTONE_5_PLAN` Ph.6, Ph.12

### Platform Configuration
- **Settings** — sectioned form — `MILESTONE_2_PLAN`, `MILESTONE_3_PLAN` Ph.10
- **Transfer Policies** (per-platform countdown/model) — `ESCROW_ADVANCED_WORKFLOW`
- **Deposit Method Fees** — `BANK_TRANSFER_ADVANCED_WORKFLOW`
- **Feature Flags** — `MILESTONE_3_PLAN` Ph.12
- **Subscription Plans** — `MILESTONE_2_PLAN`
- **Emergency Controls** — **NEW**, see below

### Reports
- **Export Hub** — **NEW**, consolidating scattered CSV buttons

---

## New Feature 1 — Audit Log Viewer

**`/admin/audit-log`** — a filterable table over `AdminAuditLog` (already populated since M1, never
browsable): filters for admin, action type, target type, and date range; each row expands to show the
full `metadata` payload already captured. This is the single most overdue page in the entire admin
panel — every action already writes here, it just needed a front end.

## New Feature 2 — Global Admin Search

A search input pinned in the admin header (not per-page) — paste an email, username, listing title,
transaction ID, or escrow ID and get a categorized result list (Users / Listings / Escrows /
Transactions / Disputes) routing straight to the record. Distinct from `V2.2.0_UPGRADE_PLAN.md`'s
command palette, which is navigation between *pages*; this searches *entities*.

## New Feature 3 — Admin Team & Roles

**`/admin/team`** — the roster of everyone with `ADMIN` or `MODERATOR` access, restricted to a higher
permission tier than the rest of the panel (only full admins manage this page, never moderators,
regardless of how `MILESTONE_3_PLAN.md` Phase 12's granular-RBAC question ultimately gets decided).
Invite a new admin/moderator by email, assign role, deactivate access — separated from the general
Users page specifically because who holds admin power is the single highest-consequence thing this
panel controls, and deserves its own audited, deliberately-harder-to-reach surface rather than being
one action buried in a long user list.

## New Feature 4 — Emergency Controls

**`/admin/emergency`**, or a pinned section at the top of Settings — visible to every admin at all
times, not buried in general configuration:

- Pause New Registrations
- Pause New Listings
- Pause Withdrawals
- Pause Deposits (all methods, or per-method)
- Full Maintenance Mode (with a custom message shown to visitors)

Every toggle requires a one-line reason before it takes effect, logged to the audit log, and reverses
just as easily — this exists so incident response is "click a switch," not "someone edits the
database directly under pressure," which is exactly the kind of shortcut that turns a bad moment into
a worse one.

## New Feature 5 — Content Moderation Review Queue

**`/admin/content-review`** — surfaces listings and messages that scored in the 15–39 range from
`lib/moderation.ts` (flagged, but under the 40-point auto-block threshold) for a human glance before
they reach a buyer, rather than only ever seeing the two outcomes of "silently allowed" or
"auto-blocked." Catches the content that's genuinely on the fence.

## New Feature 6 — Review Moderation

An admin action on `MILESTONE_2_PLAN.md`'s review system that never got specced: **Remove Review**
(from a report, or found directly), with the reason logged and the review's author notified. Reachable
from the Reports queue (when a report's target type is a review) and from any review shown on a user's
admin detail page.

## New Feature 7 — Internal Admin Notes

`AdminNote { id, targetType, targetId, adminId, note, createdAt }` — a lightweight free-form note any
admin can attach to any entity (a user, a dispute, a ticket), visible only to other admins. Rendered
as a small "Internal notes" panel on every relevant detail page. This is deliberately separate from
the audit log: the log records what *happened*, notes hold what an admin *thinks* — "already spoke to
this seller, waiting on their reply," context the log was never designed to carry.

## New Feature 8 — Admin Alerting

Queues are pull-based today — an admin only sees what's waiting if they check. Critical events should
push instead: a new dispute above a configurable value threshold, a risk score crossing the flagged
line, a security event — routed through the existing `Notification`/Socket.IO infrastructure
(`createNotification`, already built) targeted at admins, and optionally an external channel (email or
a webhook, e.g. to Slack) for events serious enough to warrant reaching someone even when they're not
looking at the panel.

## New Feature 9 — Export Hub

**`/admin/exports`** — one page listing every exportable dataset (users, reports, transactions, audit
log) instead of a CSV button scattered on each individual page — same underlying export routes, one
discoverable place to find them.

---

## Permission Matrix

| Section | Admin | Moderator |
|---|---|---|
| Dashboard, System Health | ✅ | ✅ (read-only stats) |
| Audit Log | ✅ | view own actions only |
| Users, Organizations | ✅ | ✅ (no balance/trust-score edits) |
| **Admin Team & Roles** | ✅ | ❌ |
| Verification, Compliance, Risk | ✅ | ✅ |
| Listings, Content Review, Reports, Review Moderation | ✅ | ✅ |
| Escrows, Disputes, Warranty Claims | ✅ | view + evidence review; ruling requires Admin |
| **All financial pages** (Transactions, Deposits, Withdrawals, Bank Accounts, Crypto Wallets, Treasury) | ✅ | ❌ |
| Support, Live Chat, Canned Responses | ✅ | ✅ |
| Content & Growth (Blog, Academy, Announcements, Email Templates, Translations, Promotions, Partners) | ✅ | ✅ (publish requires Admin) |
| **Platform Configuration** (Settings, Transfer Policies, Fees, Feature Flags, Subscription Plans) | ✅ | ❌ |
| **Emergency Controls** | ✅ | ❌ |
| Export Hub | ✅ | scoped to non-financial exports |

Financial access, platform configuration, emergency controls, and the admin roster itself are the
four categories moderators never touch, regardless of how far the rest of moderation gets delegated —
these are exactly the areas where a compromised or careless moderator account could do the most
damage.

---

## Consolidated Task Checklist

- [ ] `/admin/audit-log` — filterable viewer over the already-populated `AdminAuditLog`
- [ ] Global admin search (header-pinned, cross-entity)
- [ ] `/admin/team` — admin/moderator roster, invite/assign-role/deactivate, admin-only access
- [ ] `/admin/emergency` — pause registrations/listings/withdrawals/deposits, maintenance mode, reason-logged toggles
- [ ] `/admin/content-review` — 15–39 moderation-score queue for listings and messages
- [ ] Review moderation action (remove + notify author), reachable from Reports and user detail pages
- [ ] `AdminNote` model + internal-notes panel on user/dispute/ticket detail pages
- [ ] Admin alerting — critical-event push via existing `Notification`/Socket.IO infra, optional external webhook
- [ ] `/admin/exports` — consolidated export hub
- [ ] Full nav restructure per the IA above, grouped into Overview / People / Marketplace / Transactions / Support & Trust / Content & Growth / Platform Configuration / Reports
- [ ] Permission matrix enforced at the route level, not just hidden nav items — a moderator hitting a financial API route directly must be rejected server-side, matching the existing `requireAdmin`-style guard pattern
