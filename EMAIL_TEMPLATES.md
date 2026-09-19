# AccsMarkets — Advanced Animated Email Templates

This one **is built**, not a plan — the code lives at
[`src/lib/email-templates.ts`](src/lib/email-templates.ts) and compiles cleanly against every
existing call site (`npx next build` passes with no errors). This file documents what was built and
how it works, since the last verification step (rendering samples in the browser preview) was
interrupted before completion — noted honestly below rather than claimed as done.

## Design System

- **Brand + semantic tones** — orange brand tokens plus five semantic tones (`success`, `info`,
  `warning`, `danger`, `brand`), each with a background, soft-fill, border, and text color. Every
  template picks one tone; nothing hardcodes a one-off color.
- **Animated icon badge** — a gradient circle with an emoji glyph, using `@keyframes popIn` (a soft
  spring pop-in) and an optional `@keyframes pulseRing` (an expanding ring behind the badge, used on
  celebratory templates — offer accepted, escrow completed, KYC approved, subscription activated).
- **Animation is additive by design, not required for the email to look right.** The badge's base
  (non-animated) state is already the correct, fully-visible final look — the `<style>` block's
  `animation` property is the only thing skipped by clients that don't support `@keyframes` (Outlook
  desktop, some webmail). Those clients just see a static, still-polished badge; nothing breaks or
  looks half-rendered. This was a deliberate choice over inline SVG icons, which Outlook desktop
  doesn't render at all — emoji-in-a-circle degrades gracefully everywhere, SVG icons wouldn't have.
- **Hidden preheader text** — the inbox-preview snippet Gmail/Apple Mail show next to the subject
  line is set explicitly per template, instead of falling back to whatever raw text the client finds
  first (a common amateur-email tell).
- **Detail card** — a receipt-style label/value table (amount, plan name, rejection reason, etc.),
  reused across every template that has structured data to show rather than burying it in prose.
- **Security footer** — a distinct red "Wasn't you? Secure your account" block, used specifically on
  `passwordChangedTemplate` (and easy to opt into for any future security-relevant template via the
  `securityFooter: true` option).
- **Dark mode** — a `@media (prefers-color-scheme: dark)` block adjusts card/background/text colors
  for clients that respect it, on top of the light-mode default matching the platform's own theme.

## Templates

| Function | Tone | Trigger status |
|---|---|---|
| `welcomeTemplate` | brand | **New** — not yet wired to a send call; recommended trigger is right after email verification completes |
| `emailVerifyTemplate` | brand | ✅ Wired — registration |
| `passwordResetTemplate` | warning | ✅ Wired — forgot-password flow |
| `passwordChangedTemplate` | danger | **New** — not yet wired; no change-password route exists yet (planned in `MILESTONE_2_PLAN.md` Phase 2) |
| `listingApprovedTemplate` | success (pulse) | ✅ Wired — admin listing approval |
| `listingRejectedTemplate` | warning | ✅ Wired — admin listing rejection |
| `offerReceivedTemplate` | info | ✅ Wired — new offer |
| `offerAcceptedTemplate` | success (pulse) | ✅ Wired — offer accepted |
| `escrowFundedTemplate` (alias: `escrowCreatedTemplate`) | info | ✅ Wired — escrow funded |
| `escrowCompletedTemplate` | success (pulse) | ✅ Wired — escrow completed |
| `depositConfirmedTemplate` | success | ✅ Wired — deposit confirmed (manual + NOWPayments IPN) |
| `kycApprovedTemplate` | success (pulse) | **New** — not yet wired; no KYC pipeline exists yet (planned in `MILESTONE_2_PLAN.md` Phase 6) |
| `kycRejectedTemplate` | warning | **New** — same dependency as above |
| `subscriptionActivatedTemplate` | brand (pulse) | **New** — not yet wired; no subscription purchase flow exists yet (planned in `MILESTONE_2_PLAN.md` Phase 4) |
| `newMessageTemplate` | info | **New** — not yet wired; per-message emails should likely be rate-limited/digested (`V2.2.0_UPGRADE_PLAN.md` Pillar B's digest email) rather than fired on every DM, which would be spammy |

**All existing call sites (`api/auth/*`, `api/escrows/*`, `api/offers/*`, `api/admin/*`,
`api/webhooks/nowpayments`) still work unchanged** — every previously-exported function kept its exact
name and argument signature; only the internal HTML/design changed.

## Honest Verification Status

- ✅ `npx next build` — compiles cleanly, no type errors, no broken imports across the 10 files that
  call into this module.
- ⚠️ **Visual rendering was not confirmed in a live browser or email client this session** — the
  attempt to preview rendered HTML output was interrupted before completion. The animation/layout
  code follows well-established email-safe patterns (inline styles for layout, `<style>`-block
  `@keyframes` as pure progressive enhancement, table-based structural wrapper), but if you want a
  final visual sanity check before this goes live, the fastest way is:
  ```bash
  npx tsx -e "import('./src/lib/email-templates').then(m => require('fs').writeFileSync('preview.html', m.escrowCompletedTemplate('Alex','FullFlix Hindi','esc_1').html))"
  ```
  then open `preview.html` directly in a browser.

## Known Compatibility Notes

- Outlook desktop (Windows) ignores `@keyframes` — badges render static, not broken.
- Emoji glyphs were chosen over inline SVG specifically because Outlook desktop doesn't render SVG in
  email at all; emoji render as color glyphs virtually everywhere, including Outlook.
- `prefers-color-scheme` dark mode is respected by Apple Mail, some Gmail contexts, and Outlook.com;
  clients that ignore it simply show the light-mode design, which is the intended default anyway.
