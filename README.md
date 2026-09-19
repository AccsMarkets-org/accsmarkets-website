# AccsMarkets

Escrow-protected peer-to-peer marketplace for buying and selling social media accounts.
Next.js 14 (App Router) · TypeScript · MySQL/Prisma · NextAuth · Socket.IO · NOWPayments · Tailwind (orange/light theme).

## What's implemented (Milestone 1 — core marketplace loop)

- **Landing & public pages** — animated agency-style homepage (Framer Motion, 3D floating cards, marquee, count-up stats, pricing, FAQ), browse/search/filter listings, listing detail, seller profiles, about/fees/FAQ/terms/privacy/escrow-guide/refunds/contact.
- **Auth** — email+password with **mandatory email verification** (no login before verifying), hCaptcha on signup, Google OAuth (auto-verifies + auto-username), forgot/reset password, banned-account blocking, 7-day JWT sessions.
- **Wallet** — USD balance; crypto deposits via NOWPayments (TRC20/BEP20/ERC20/Polygon/Solana) with HMAC-SHA512-verified IPN webhook and idempotent crediting; manual USDT deposits (admin-confirmed); withdrawals (min $20, admin-approved, reserve-aware balance checks).
- **Listings** — 3-step creation wizard (platform+URL → ownership code → details), auto-moderation scoring (scam/spam/profanity/links, blocks at ≥40), plan-based listing limits, admin review queue, screenshots via Cloudinary, browse filters/sort/pagination.
- **Offers** — send/accept/decline/counter (round-chained)/cancel, 72h auto-expiry (lazy), duplicate-pending prevention, rate limits, notifications + emails.
- **Escrow (core)** — FUNDED → SUBMITTED → VERIFIED → IN_TRANSFER → COMPLETED state machine with strict transition guards; atomic wallet debits/credits; buyer pays price+fee, seller receives full price; cancel-at-FUNDED refunds everything; AES-256-GCM-encrypted credential handoff (buyer-only visibility); escrow chat with admin visibility; dispute opening (admin resolution flow is Milestone 2); trust score +5 both sides on completion; listing → SOLD.
- **Messaging** — real-time DMs over Socket.IO (typing indicators, read receipts, online status), conversation inbox deduped by partner, archive, moderation on send, 10/min rate limit.
- **Notifications** — DB-persisted for every event (survive offline), live socket push, bell dropdown + full page.
- **Admin panel** — overview with action queues, users (ban/unban, balance adjust, trust override, verified badges), listings (approve/reject/suspend), escrows monitor, manual deposit confirm/reject, withdrawal approve/reject — every action written to `AdminAuditLog`.

Deferred to Milestone 2: TOTP 2FA, session management UI, AI KYC (OpenKYC), phone verification, achievement badge automation, paid promotions (feature/bump), reviews, reports, support tickets, announcements, blog auto-generation, dispute resolution UI, CSV exports.

## Requirements

- Node.js 18+ (custom server — deploy on a VPS/Docker/PM2, **not** Vercel serverless; Socket.IO and the single-process design require a long-lived Node process)
- MySQL 8+

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    Fill in: DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32),
#    CREDENTIALS_ENCRYPTION_KEY (openssl rand -hex 32), SMTP creds, Google OAuth,
#    Cloudinary, NOWPayments, hCaptcha keys, ADMIN_EMAIL + ADMIN_PASSWORD

# 3. Create the database schema
npx prisma migrate dev --name init

# 4. Seed plans, settings, and the admin user
npx prisma db seed

# 5. Run (dev)
npm run dev          # -> http://localhost:3000

# Production
npm run build
npm start
```

## Key architecture notes

- **`server.js` + `socket-server.js`** — one Node process serves Next.js and Socket.IO on the same port. API routes emit socket events via `global.__io` (`src/lib/socket.ts`).
- **Money safety** — every balance mutation runs inside `prisma.$transaction` with in-transaction status re-checks (double-credit/double-release guarded). NOWPayments IPNs are HMAC-SHA512 verified and idempotent on `payment_id`.
- **Escrow state machine** — `src/lib/escrow-state-machine.ts` is the single source of truth for allowed transitions; every workflow route calls `assertTransition` first.
- **Fees** — `src/lib/fees.ts`: `fee = max(price × sellerPlanRate, planMinFee)`; buyer pays price+fee, seller receives full price.
- **Theme** — orange/light design system via CSS variables in `src/app/globals.css` mapped through `tailwind.config.ts` (`bg-brand-500` etc.); status colors centralized in `src/lib/constants.ts`.
- **Verification email in dev** — with SMTP unconfigured, emails are skipped (logged). Grab the token from the `VerificationToken` table or use Prisma Studio (`npx prisma studio`) to verify accounts manually.

## Test walkthrough (after seeding)

1. Register two users (or use Google OAuth) → verify emails → log in.
2. As admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD`), credit buyer's wallet from `/admin/users` (Adjust balance), or run a real deposit.
3. Seller: create a listing → admin approves at `/admin/listings` → listing goes live.
4. Buyer: make an offer → seller counters/accepts → buyer clicks **Start escrow** → checkout shows negotiated amount + fee → fund.
5. Seller submits credentials → buyer verifies → transfer → buyer completes → seller balance +price, listing SOLD, trust +5 each.
6. Try cancel-at-FUNDED on another escrow → full refund including fee.
