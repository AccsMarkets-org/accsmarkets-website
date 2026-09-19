# AccsMarkets — Advanced Messages Workflow (Official Escrow Support, Pinned)

Planning document only — nothing in this file has been built. This is the deep spec for one piece of
the messages system the reference screenshot shows but earlier documents only touched indirectly: the
pinned "Accoswap ✓ OFFICIAL ESCROW" conversation always sitting at the top of the inbox, always
reachable, functioning as the platform's own support line. It reconciles with — and in one place,
corrects — three things already planned: `V2.1.0_UPGRADE_PLAN.md` Area 6 (DM/escrow chat unification),
`V2.2.0_UPGRADE_PLAN.md` Pillar D (the anonymous-visitor live chat widget), and
`ESCROW_ADVANCED_WORKFLOW.md`'s "Chat with Escrow Support" button.

## What This Is (and Isn't)

A **standing, platform-owned conversation** every logged-in user has automatically, pinned above their
person-to-person conversations, never sorted away by recency. It's the fast, chat-first line to
AccsMarkets itself — distinct from two things it might look like on the surface:

- **Not a replacement for `MILESTONE_2_PLAN.md`'s `SupportTicket` system.** That's the formal,
  trackable, async surface for issues needing investigation over days, attachments, and a status
  history. This channel is the immediate, live-first surface. They should connect, not compete — a
  conversation here can be escalated into a formal ticket with one action, closing the loop instead
  of leaving two disconnected "contact us" paths.
- **Not the same backend as `V2.2.0_UPGRADE_PLAN.md` Pillar D's live chat widget**, which exists for
  anonymous, pre-signup visitors who have no `User` row and no dashboard to pin anything into. That
  stays a separate `LiveChatSession`-backed system for a genuinely different audience. What *does*
  unify: the **admin-facing inbox**. One queue, both sources feeding it, clearly tagged — see Admin
  Side below — so support agents never have to check two separate screens.

## Security Grounding — This Is Not a Cosmetic Feature

Impersonating "official support" is one of the most common attack patterns on crypto-adjacent
platforms specifically: scammers spoof or clone verified-looking support accounts, then pressure
victims to move funds "to resolve an issue" or share credentials. Verified badges alone don't stop
this — badges can be bought, or a real account can be compromised. Two things follow directly for this
design, not just for user-education copy elsewhere:

1. **The "Official Escrow" identity must be structurally impossible to fake**, not just visually
   distinct. It's not a display name any admin can type, and not a badge any admin action can assign
   to an arbitrary user (see Anti-Impersonation Guarantees below).
2. **The channel itself becomes the right place to actively warn users**, not just a place scams might
   target — a persistent, unmissable notice ("AccsMarkets staff will never ask for your password,
   seed phrase, or a payment outside the app's own escrow/wallet flows") belongs at the top of this
   specific thread, since it's precisely the surface a spoofed imitation would try to mimic.

---

## Architecture

**Deliberately minimal — this reuses M1's existing `Message` model almost entirely rather than adding
a parallel system:**

- One real `User` row is seeded as the official account (e.g. `escrow@accsmarkets.org`), role `ADMIN`.
- `VerifiedBadge` gains one new reserved value: `OFFICIAL`. The badge-assignment admin action
  (`PUT /api/admin/users/[id]`, `set_badge` action, already built in M1) gets a hard server-side guard:
  `OFFICIAL` can never be set on any user except the one seeded ID — not a UI restriction, an
  API-level rejection, so a compromised admin session still can't mint a second "official" account.
- Every user's official thread uses the existing `conversationId` scheme with a reserved pattern —
  `official_{userId}` — so the conversation list query can recognize and pin it without a new table.
- **No new `Message` field for "who really typed this."** When any admin replies inside this
  conversation, `senderId` stays their real admin user ID (preserving the existing audit trail) — the
  **client renders** the display name/avatar as "AccsMarkets Escrow ✓ Official" whenever the
  conversation matches the reserved pattern and the sender has `role: ADMIN`, regardless of which
  specific admin it was. Identity masking is a presentation rule, not stored data — nothing to keep in
  sync, nothing that can drift.
- **Online status is real, not decorative.** The green dot reflects whether *any* admin currently has
  `AgentPresence.status = ONLINE` (the model from `V2.2.0_UPGRADE_PLAN.md` Pillar D, reused here rather
  than duplicated) — not a hardcoded always-on indicator. When no one's online, the thread shows
  "Usually replies within a few hours" instead. A permanent fake-green-dot, which the reference
  screenshot uses, is a small dishonesty worth not copying — it just sets up a broken promise the first
  time a user messages it at 3 a.m. and waits.

## Anti-Impersonation Guarantees

- Server-side rejection of `OFFICIAL` badge assignment to any user but the one seeded account ID
  (checked in the route handler, not just hidden in the admin UI).
- The reserved `conversationId` pattern (`official_{userId}`) is generated server-side when a user's
  official thread is first needed (see Lifecycle below) — never accepted as client input, so nothing
  a client sends can cause a message to render with the Official identity outside that one pattern.
- A pinned, persistent notice inside the thread itself (not just in a help-center article somewhere
  else): *"We will never ask for your password, seed phrase, or private keys, and we will never ask
  you to send funds outside your AccsMarkets wallet. If someone contacts you claiming to be
  AccsMarkets support anywhere other than here — email, Telegram, WhatsApp, a phone call — it isn't
  us."* This directly targets the real attack pattern researched above: off-platform impersonation,
  not just on-platform confusion.
- The same reserved-badge guarantee means this notice's *source* (the Official thread itself) is one
  users can actually trust, closing the trust loop rather than just asserting it.

---

## Lifecycle

**1. Creation.** The official thread is created lazily the first time it's needed — at latest, right
after email verification completes (tying into the existing M1 auth flow), so it exists before a user
could plausibly need support.

**2. Welcome message.** An automated first message posts immediately: a short welcome, a one-line
description of what this channel is for, and the anti-impersonation notice above pinned at the top of
the thread (not just the first message scrolled past and forgotten — see UX below). If
`V2.1.0_UPGRADE_PLAN.md` Area 5's onboarding flow already ran, the welcome can use one personalization
slot (name, and — if seller-intent was captured — a one-line pointer to the listing wizard), kept
simple rather than a dynamically generated essay.

**3. Ongoing use.** A user can message it anytime for general support. **Escrow-specific escalation
routes here too** — this corrects `ESCROW_ADVANCED_WORKFLOW.md`'s earlier assumption that "Chat with
Escrow Support" reuses the per-escrow admin-joined chat. On reflection, that doesn't scale: it would
mean admins monitoring potentially many separate per-escrow threads for support requests. Instead,
the escrow detail page's support button deep-links into **this** single official thread, pre-filling
the opening message with context ("Regarding Escrow #EC-XXX — ") so the agent has what they need
immediately, without fragmenting support across one thread per transaction. The buyer↔seller
conversation about the deal itself stays exactly where V2.1.0 Area 6 put it — separate, person-to-
person, escrow-context-embedded — this is purely about where a *support* escalation lands.

**4. Escalation to a formal ticket.** A "Convert to support ticket" action inside the thread creates a
`SupportTicket` (M2) pre-filled with the conversation so far, for issues that outgrow a live chat
exchange — the connective step promised above.

---

## UX/UI

**Conversation list:**
- The official thread renders as the first row, always, with a visual break (a thin divider or subtle
  background tint) separating it from the recency-sorted regular list below — reads as "pinned," not
  as "just happens to be recent."
- "AccsMarkets Escrow" name, the reserved `OFFICIAL` badge rendered with its own distinct treatment
  (a shield-check icon in a deliberately different tone from the seller-tier `GOLD` badge, so it never
  reads as "just a really trusted seller" — it should read as "this is the platform itself").
- The dynamic online/offline indicator described above.
- Its own unread-count badge if there are unread messages — it stays pinned in position regardless,
  but unread state is still visible.
- Preview text: the latest message, or the welcome-message text if nothing further has been sent.

**Thread view:**
- The anti-impersonation notice pinned at the top of the thread — visually distinct (a light bordered
  banner, not just another chat bubble), always visible even after scrolling through history, not
  something that scrolls away and is forgotten after the first read.
- Same bubble-message visual language as every other thread in the app (`MessageThread`,
  `EscrowChat`) — no third visual style introduced for this one surface.
- When an escrow-support deep link opens this thread, the pre-filled draft (editable before sending,
  never auto-sent without the user seeing it first) shows in the composer.

**Admin side:**
- `/admin/livechat` (from `V2.2.0_UPGRADE_PLAN.md` Pillar D) is the shared queue — extended to include
  unread official-channel messages alongside anonymous live-chat sessions, each row tagged
  **Registered User** or **Visitor** so agents know which backend they're responding through, without
  needing two separate screens.
- Replies sent from this unified inbox into a registered user's official thread post through the
  existing `Message` send path (admin's real `senderId`, masked to "Official" on the user's side per
  the Architecture section) — into a `LiveChatMessage` row for anonymous sessions. Two backends, one
  agent-facing screen.
- The canned-responses library (already specced in V2.2.0 Pillar D) is shared across both.

---

## Data Model & API (delta only — nearly everything already exists)

- `VerifiedBadge` enum: add `OFFICIAL`.
- Seed: one `User` row for the official account; `PlatformSettings` gains `officialSupportUserId`
  pointing to it, so the ID is configurable/discoverable rather than hardcoded in application code.
- `PUT /api/admin/users/[id]` (`set_badge` action): add the server-side guard rejecting `OFFICIAL` on
  any ID other than `PlatformSettings.officialSupportUserId`.
- `GET /api/messages` (conversation list): pin the `official_{userId}` conversation first, unaffected
  by its own recency ordering; lazily create it if it doesn't exist yet for this user.
- No new send route — the existing `POST /api/messages` already accepts any `recipientId`; the client
  simply knows `officialSupportUserId` (exposed via a public settings/config read) and uses it as the
  target when composing into this thread.
- `POST /api/support/tickets` (M2, already specced): accepts an optional `sourceConversationId` to
  pre-fill from an official-thread escalation.
- `/admin/livechat` queue query: extended to union unread `Message` rows in any `official_*`
  conversation with pending `LiveChatSession`s, tagged by source.

---

## Consolidated Task Checklist

- [ ] `VerifiedBadge.OFFICIAL` enum value + server-side single-account guard on badge assignment
- [ ] Seed the official support `User`; `PlatformSettings.officialSupportUserId`
- [ ] Lazy-create + welcome-message trigger on email verification completion
- [ ] Conversation list: pinned-first rendering for the `official_*` thread, independent of recency sort
- [ ] Client-side sender-identity masking (admin → "AccsMarkets Escrow ✓ Official") for this conversation only
- [ ] Dynamic online/offline indicator sourced from `AgentPresence`, not hardcoded
- [ ] Persistent anti-impersonation notice, pinned at the top of the thread (not just a first message)
- [ ] Escrow detail page's "Chat with Escrow Support" button re-routed to deep-link here with pre-filled context (supersedes the per-escrow-chat assumption in `ESCROW_ADVANCED_WORKFLOW.md`)
- [ ] "Convert to support ticket" escalation action, pre-filling `SupportTicket` from the conversation
- [ ] Unify `/admin/livechat` queue across registered-user official threads and anonymous `LiveChatSession`s, source-tagged
- [ ] Shared canned-responses library across both backends

---

## Sources

- [Consumer Protection: How to Detect and Avoid Impersonation Scams — Coinbase](https://www.coinbase.com/blog/consumer-protection-tuesday-how-to-detect-and-avoid-impersonation-scams)
- [P2P Risk Awareness: Impersonation Scams — MEXC](https://www.mexc.com/support/article/p2p-risk-awareness-365465347107632128)
- [How to Spot Fake Crypto Support Scams — BYDFi](https://www.bydfi.com/en/cointalk/fake-crypto-customer-support-scam-prevention)
- [How to Spot and Avoid Crypto Impersonation Scams — OKX](https://www.okx.com/en-us/learn/crypto-impersonation-scams)
