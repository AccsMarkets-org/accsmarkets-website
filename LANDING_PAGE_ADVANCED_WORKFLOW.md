# AccsMarkets — Advanced Landing Page Workflow (Missing Features)

Planning document only — nothing in this file has been built. No reference screenshot was provided
this time, so this one leans on research instead — 2026 landing-page conversion practice, checked
against what M1 already shipped (`LandingHero`, `PlatformMarquee`, `StatsBand`, `HowItWorks`,
`FeaturedListings`, `SecuritySection`, `PricingSection`, `FaqSection`, `FinalCta`) to find the real
gaps rather than proposing a redesign of something that's already reasonably solid.

## Research Findings

A few things came back consistently enough across multiple sources to treat as settled, not opinion:
a **sticky CTA** that stays reachable as the visitor scrolls measurably helps and is table stakes now,
not a novelty. **Trust-signal hierarchy** runs roughly: case studies with specific outcomes → named
video testimonials → named text testimonials with photos → recognizable logos → certifications →
review-platform ratings → generic star ratings — meaning a page's *highest*-value trust asset is real,
named human testimony, not another icon-plus-stat block. **Numerical specificity** reads as more
honest than round numbers ("327,734" beats "300,000+") — directly relevant to `StatsBand`'s count-up
figures. And **minimalist pages with strong whitespace outperform dense ones by ~19%** — worth keeping
in mind as a constraint on how many of the additions below actually get added at once, not a reason to
skip them.

## What M1 Already Has (not being redesigned here)

The hero (3D floating platform cards, gradient headline, trust-badge pill, three inline trust lines),
the platform marquee, the count-up stats band, the three-step "how it works," featured listings pulled
live from the database, a security/trust section, pricing cards, an FAQ accordion, and a gradient
final CTA. This is a genuinely above-average landing page already — what follows is what's still
missing against 2026 practice and against features other documents planned but never gave a home on
this specific page.

## Missing Features

**1. Sticky CTA.** Once the visitor scrolls past the hero, a slim persistent bar (or a floating
button on mobile) keeps "Browse Listings" / "Sign Up" reachable without scrolling back up — currently
absent; the only CTAs live in the hero and the final section.

**2. Real testimonials — named, with photos, ideally video.** This is the single highest-value trust
asset per the research, and the page has nothing like it today — `SecuritySection` explains *why* the
platform is safe in the abstract, but nothing shows a real person saying it worked for them. **This
section should ship built but empty/hidden pre-launch** — see the Cold-Start Problem below — and it
must never be filled with fabricated testimonials to make the page look more populated than it is;
that's a real content task (asking real early users for a quote, a photo, ideally a short video),
not a design task.

**3. A concrete home for the recently-sold social-proof ticker.** `V2.2.0_UPGRADE_PLAN.md` Pillar B
already specced this ("An Instagram account just sold — $450 · 2 min ago") but never placed it — it
belongs directly under the hero, above the platform marquee, so it's one of the first things a visitor
sees rather than buried mid-page.

**4. Category quick-links from the marquee.** The platform marquee currently just displays logos —
each one should link straight into that platform's filtered browse view (or, once
`V2.2.0_UPGRADE_PLAN.md` Pillar B's SEO category landing pages exist, into the dedicated page for that
platform) rather than being purely decorative.

**5. Cookie consent banner and language selector, both visible pre-login.** `MILESTONE_3_PLAN.md`
Phase 2's consent banner and `MILESTONE_4_PLAN.md` Phase 1's language switcher are both specced
elsewhere but need an explicit landing-page presence, since the homepage is the actual first-touch
point for most visitors — the consent banner in particular has to appear here, not just "somewhere in
the app," to be compliant at all.

**6. Live chat launcher.** `V2.2.0_UPGRADE_PLAN.md` Pillar D's floating chat bubble mounts on public
pages generally — the landing page is the highest-traffic one, worth confirming explicitly as an
anchor point for its proactive-trigger logic (e.g., triggering after idle time specifically on the
pricing section, where a hesitating visitor is most likely to have a question).

**7. A short explainer video in or near the hero.** Rich media is called out repeatedly in the
research as a conversion lever text alone doesn't match — a 30–60 second walkthrough of the escrow
flow (fund → submit → verify → transfer → complete, the same five stages already built) belongs near
the top of the page. This is a real production task, not a code task — flagged so it doesn't quietly
get skipped because it's the one item here that isn't just engineering.

**8. "As seen in" / press strip.** Currently nothing — a placeholder-ready section for press mentions
or notable partnerships, shipped empty until there's something real to put in it, same principle as
testimonials: never fabricate this.

## The Cold-Start Problem

Items 2, 3, and 8 above all share a real launch-sequencing risk worth calling out directly rather than
leaving implicit: **a brand-new marketplace has genuinely small numbers, and small numbers can hurt
trust instead of helping it.** "3 completed escrows" reads worse than no number at all. The fix isn't
to fake it — it's to design the page to **not need real volume to feel trustworthy on day one**, and
switch to volume-driven proof once there's enough of it to be impressive rather than deflating:

- `StatsBand`, `SocialProofTicker`, and the testimonials section should all support a **qualitative
  pre-launch mode** — `StatsBand` can lead with "100% of transactions escrow-protected" (a true
  statement regardless of volume) rather than a small raw count; the ticker and testimonials sections
  simply don't render at all until there's real content to show, rather than rendering with weak or
  synthetic content.
- A simple **threshold config** (e.g., in `PlatformSettings`) flips each section from
  qualitative-mode to real-numbers-mode once genuine activity crosses a meaningful bar — a decision
  worth making deliberately (what number actually looks good) rather than shipping raw counts from
  day one and hoping.

## Updated Page Structure

In order, with new sections marked:

1. `LandingHero` (unchanged)
2. **New:** recently-sold ticker (qualitative-mode aware)
3. `PlatformMarquee` (now with working category links)
4. `StatsBand` (qualitative-mode aware)
5. `HowItWorks`
6. **New:** short explainer video, placed here rather than in the hero so it doesn't compete with the
   hero's own load performance
7. `FeaturedListings`
8. `SecuritySection`
9. **New:** testimonials (built, hidden pre-launch)
10. `PricingSection`
11. **New:** "As seen in" press strip (built, hidden pre-launch)
12. `FaqSection`
13. `FinalCta`
14. **New (persistent, not in-flow):** sticky CTA bar, cookie consent banner, live chat launcher

## Data Model

- `Testimonial { id, name, role, company?, quote, photoUrl?, videoUrl?, isPublished }` — admin-managed,
  `isPublished` defaulting false so nothing shows until deliberately turned on.
- `PressMention { id, outletName, logoUrl, articleUrl?, isPublished }` — same pattern.
- `PlatformSettings` gains the qualitative/real-numbers threshold config referenced above (e.g.
  `statsRealNumbersThreshold`, `showTestimonialsSection`, `showPressSection` as explicit toggles an
  admin flips on, rather than an implicit "empty array means hide" convention that's easy to get wrong).

## Consolidated Task Checklist

- [ ] Sticky CTA bar (scroll-triggered, dismissible)
- [ ] `Testimonial` model + admin management + landing section (ships empty, real content only — never fabricated)
- [ ] Recently-sold social-proof ticker, placed directly under the hero
- [ ] Platform marquee logos become working links (category filter or dedicated landing page)
- [ ] Cookie consent banner + language selector, confirmed present on the landing page specifically
- [ ] Live chat launcher confirmed mounted here, with a pricing-section-specific idle trigger
- [ ] Explainer video production (content task) + placement in the page flow
- [ ] `PressMention` model + admin management + landing section (ships empty until real)
- [ ] Qualitative-vs-real-numbers mode for `StatsBand`, the ticker, and testimonials, with an explicit admin-configured threshold rather than an implicit empty-state convention

## Sources

- [16 High-Converting Landing Pages You Can Copy in 2026 — Perspective](https://www.perspective.co/article/high-converting-landing-pages)
- [Trust Signals That Convert: A Funnel Placement Framework — Digital Applied](https://www.digitalapplied.com/blog/social-proof-trust-signals-2026-conversion-placement-framework)
- [How To Create High-Converting Landing Pages That Build Trust — Forbes](https://www.forbes.com/councils/forbesbusinessdevelopmentcouncil/2026/07/14/how-to-create-high-converting-landing-pages-that-build-trust/)
- [High-Converting Landing Page Design Guide 2026 — Digital Roots Media](https://www.digitalrootsmedia.com/blog/web-design/high-converting-landing-page-design-2026/)
