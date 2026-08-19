# WenMeet Landing Page — Product Design PRD

**Version:** 1.0
**Status:** Implementation Draft
**Surface:** Public marketing landing page
**Primary route:** `wenmeet.conscience.fund`
**Owners:** Product Design, Product, Frontend Engineering
**Priority:** P0
**Design objective:** Establish WenMeet as a differentiated, role-aware coordination product rather than a generic scheduling SaaS.

> **Implementation note (added when this doc was committed):** §10 and §44 of this PRD require that no displayed ranking factor be fictitious and that the Decision-role description match verified engine behavior. It was checked against `src/lib/scheduling/{readiness,engine}.ts` at implementation time: `required` and `kdm` are gated identically (no behavioral distinction), there is no scoring/ranking system (earliest overlapping slot wins; optional-participant weighting is explicitly V2+ scope), and optional participants don't influence the result at all yet. The shipped implementation calibrates the resolver and role copy to this reality rather than the numeric-score mockup literally described below — see inline notes at §9–§11 for what changed and why.

---

## 1. Executive Summary

The current WenMeet landing page is visually coherent and communicates the general scheduling category effectively, but it introduces WenMeet's strongest differentiation too late.

The redesign centers the entire page around one product insight:

> **Calendars know when you're busy. WenMeet knows who actually needs to be there.**

The page shifts from a sequence of independent SaaS marketing sections to a single escalating product argument: **different idea → prove it → show how it reasons → show how it handles complexity → establish trust → convert.**

Target: reduce page height by ~25–35%, increase information density, reduce repetitive card/pill treatments, sharpen typography and hierarchy, and use meaningful animation to demonstrate WenMeet's scheduling logic — never decorative motion or generic SaaS conventions to manufacture perceived sophistication. The product itself provides the sophistication.

## 2. Product Positioning

Traditional scheduling products answer: **When are these calendars simultaneously available?** WenMeet answers: **When can the people required to make this meeting useful actually attend?** This distinction must be visible within the first viewport.

North-star statement: **WenMeet knows who actually needs to be there.** Supporting: **Calendars know when you're busy. WenMeet knows when the meeting is viable.**

Messaging order: participant importance → WenMeet reasons across constraints → recommends best viable time → low-friction participant response → Google/Microsoft interoperate → timezone complexity handled → real multi-party business meetings → calendar privacy respected → create a WenMeet. Integration support is not the hero's primary proof point.

## 3. Goals

- **G1 — Differentiate within first viewport.** A first-time visitor should understand WenMeet differs from a basic scheduling-link product within 5 seconds; ≥80% of usability-test participants should mention required attendees/roles/decision makers/viability/intelligent time selection.
- **G2 — Demonstrate rather than claim intelligence.** The page visually demonstrates WenMeet evaluating constraints (eliminating impossible times, distinguishing roles, selecting a recommendation) without depending on "AI-powered" language.
- **G3 — Reduce scrolling burden.** Target desktop height 3,200–3,600px at 1440px width, a 25–35% reduction. No section should consume a full viewport unless it introduces a major new concept.
- **G4 — Stronger visual language.** Move from "rounded container → rounded container → rounded container" toward semantic visual differentiation between actions, product states, roles, integrations, metadata, examples, system information, and trust information.
- **G5 — Preserve approachability while increasing precision.** Human coordination + precise infrastructure — not brutalist, not cyberpunk, not enterprise-bureaucratic, not indistinguishable from developer tooling.

## 4. Non-Goals

This project does not redesign the authenticated WenMeet application, modify scheduling algorithms, introduce unsupported privacy claims, add a chatbot, decorative 3D/particles/scroll-jacking/autoplay video, duplicate every feature on the marketing page, explain every meeting type, or build a large integrations directory. The landing page establishes the new design language first; it may propagate into the application later, separately.

## 5. Primary User Questions

| Stage | Required user question |
|---|---|
| Hero | Why is this different from Calendly/Doodle-style scheduling? |
| Product proof | Does WenMeet actually understand who matters? |
| Resolver | How does it choose a meeting? |
| Complexity | Can this handle my real calendar environment? |
| Use case | Is this useful for meetings like mine? |
| Trust | What happens to my calendar information? |
| Conversion | What do I do next? |

Sections that don't advance one of these questions should be removed or merged.

## 6. Target Page Architecture

1. Navigation
2. Hero + animated resolver
3. Compact complexity proof strip
4. Availability vs. viability
5. Workflow + interoperability system
6. Scenario switcher
7. Privacy/trust section
8. Final CTA / footer

Target: 4–5 meaningful desktop viewports, feeling like one continuous composition.

## 7. Navigation

Height 64–76px (target 72px). Left: WenMeet. Middle/right: Product, How it works, For teams, Sign in. Primary action: Create a WenMeet — solid WenMeet blue, 10–12px corner radius, **not** a full capsule, restrained elevation. Navigation stays visually quiet relative to the hero.

## 8. Hero

Desktop: asymmetric two-column, ~45% copy / 55% product visualization. Mobile stacks: messaging → CTA → resolver. No centered marketing-hero on desktop.

Eyebrow: **ROLE-AWARE SCHEDULING**. Headline: **WenMeet knows who actually needs to be there.** Supporting: *Calendars can tell you who's busy. WenMeet finds the best meeting based on who's required, who decides, who's optional, preferences, calendars, and timezones.* Primary CTA: **Create a WenMeet**. Secondary: **Try a live example →**. Friction remover: **Participants don't need an account.**

Hero must not contain integration pills, more than two CTAs, large explanatory paragraphs, generic "schedule smarter" language, or unsupported AI claims.

## 9. Hero Resolver

The most important product visualization on the page — an animated miniature of WenMeet's scheduling process.

Example participants: Aman (Required), Cindy (Decision), Brad (Required), Maya (Optional), Daniel (Optional). Resolution surfaces as **BEST MATCH** with supporting state (Required n/n, Decision n/n, Optional n/m).

> **Calibrated at implementation:** the literal spec includes a numeric candidate-scoring table (e.g. "82, 94, 89, 97") and a "Best match · 97" score. The real engine has no scoring system — it resolves to the earliest slot where every Required/Decision participant is free. The shipped resolver shows elimination (real: hard-constraint conflicts) and resolution as "earliest fully-available time" (real), with no invented numeric scores.

## 10. Role Visual Language

Roles are not three interchangeable pills.

- **Required** `●` — the meeting cannot happen without this participant.
- **Decision** `◆` — must attend.
- **Optional** `○` — improves the result but does not block the meeting.

> **Calibrated at implementation:** the literal spec's Decision description ("preference MAY influence ranking among otherwise viable options") is not implemented — `kdm` and `required` are gated identically in `computeReadiness`/`computeSchedulingResult`, with zero ranking system to speak of. Shipped copy describes Decision with the same certainty as Required rather than asserting an unverified ranking nuance. The product/engineering team must revisit this copy if/when the engine actually implements differentiated Decision-role weighting.

## 11. Motion System

Motion explains behavior; it never exists solely to look active. Three primitives:

1. **Constraint elimination** — a candidate conflicts with a required attendee and is marked blocked.
2. **Ranking** *(calibrated: see §9 — shipped as "resolves to the earliest valid time" rather than a score-based reordering, since no scoring exists)*.
3. **Resolution** — winning state transitions into **BEST MATCH** with a distinct lock/resolution treatment.

Full loop target 5–7 seconds. Use opacity, transforms, number/state transitions, border emphasis. Avoid bouncing, floating objects, spinners, particles, gratuitous parallax, scroll hijacking.

## 12. Motion Accessibility

All meaningful animation must support `prefers-reduced-motion: reduce` — render final states directly, preserve all information, eliminate nonessential transitions. No product meaning may depend solely on animation.

## 13. Complexity Proof Strip

Directly below hero, 120–160px. Example: **6 people · 3 timezones · 2 calendar systems · 1 meeting that actually works.** Secondary line names the calendar systems and a city chain. Compact — no large cards, no integration pills.

## 14. Availability vs. Viability

Primary statement: **Availability isn't the same as viability.** Two sides: traditional scheduler ("Are these calendars free?") vs. WenMeet ("Can the people required to make the meeting useful actually attend?"). Editorial comparison, structured diagram, typographic contrast — not two oversized rounded cards.

## 15. Workflow

Compact system diagram, not five stacked explanatory steps: **Choose → Share → Respond → Resolve → Book**. Desktop horizontal/hybrid, 300–400px target height. Mobile may go vertical.

## 16. Share-Link Requirement

Represented inside the workflow, not a standalone section. Example: `wenmeet.com/m/strategy-7KQ4` + Copy. Supporting: **Anyone can respond. No account required.**

## 17. Interoperability Component

Outside the hero. Primary: **Google people meet Microsoft people.** Supporting: *Your network doesn't live inside one calendar ecosystem. Neither should your scheduler.* Calendar inputs (Google Calendar, Microsoft Outlook/365) → meeting outputs (Google Meet, Teams, custom link, phone/in person) as a system diagram — logo/icon + label, not pill containers per item.

## 18. Timezone Communication

No standalone full-height section — evidence lives inside the interoperability/scheduling-intelligence component (e.g. Los Angeles/London/Singapore local times). If WenMeet doesn't currently rank timezone inconvenience, the UI must not imply that it does.

## 19. Use-Case System

Replace static use-case pills with an interactive scenario switcher — minimum Hiring, Board, Client. Switching updates the same underlying product component (reuses the resolver display), demonstrating breadth without adding page length.

## 20. Privacy / Trust Section

Primary: **Your calendar isn't our business.** Supporting: *WenMeet needs to know when you're unavailable. It doesn't need to know what you're doing.* Distinct tonal break — dark/near-dark surface, high-contrast typography, minimal cards. Only technically verified privacy claims may ship.

## 21. Final Conversion

Concise. Headline options: **Stop coordinating calendars.** / **Find the meeting that actually works.** Primary CTA: **Create a WenMeet.** Supporting: **Participants don't need an account.**

## 22–26. Visual Design System

Visual treatment must communicate semantic role (primary action / secondary action / product surface / integration / metadata / role / status / URL / scenario / marketing claim / trust content each get distinct treatment). Radius scale: xs 4px, sm 8px, md 12px, lg 16px, xl 20px — buttons 10–12px, product panels 12–16px, large visualizations ≤20px, tags 6–8px, inputs 8–10px. **Capsule/999px radius only for filters, status chips, toggles, segmented controls — never the default component shape.** Reduce floating shadows in favor of border + surface contrast; most components should not appear to float solely because everything has a drop shadow. Typography: one main modern-grotesk family, optional monospace for times/scores/IDs/URLs; H1 64–72px/600–650 weight/-0.04em tracking, section heading 38–44px/600, body 17–19px/400–450. Existing WenMeet blue stays primary; reduce large blue-filled marketing surfaces; color is never the only carrier of meaning.

## 27. Information Density

Whitespace used locally, not globally — generous in hero/resolver, compact in integration/workflow, medium in scenario switching, high-emphasis-but-copy-light in privacy. A section consuming >~650px vertical space on desktop must introduce a major concept, substantial interaction, or real product evidence, or be compressed.

## 28. Responsive Requirements

Breakpoints: 360, 390, 768, 1024, 1280, 1440+. Mobile is not a shrunk desktop — it prioritizes product distinction, role model, meeting recommendation, primary CTA in that order. Hero resolver simplifies but retains participants/roles/candidate evaluation/best-match. Workflow goes vertical; integration map goes stacked input→WenMeet→output.

## 29. Accessibility

WCAG 2.2 AA. Contrast 4.5:1 normal text / 3:1 large text and meaningful graphical objects. Full keyboard access, visible focus (never color-only). `prefers-reduced-motion` honored. Role and availability states carry text labels, never symbol/color alone. Resolver states expose meaningful accessible text (e.g. "Thursday 10:00 AM. Best match. All three required participants available..."). Usable at 200% zoom. Touch targets ≥44×44 CSS px.

## 30. Performance

Target LCP ≤2.5s p75, INP ≤200ms p75, CLS ≤0.1. Hero animation must not block initial render; no autoplay video; prefer CSS transforms/opacity and lightweight JS; resolver degrades gracefully without JS.

## 31. Content Requirements

Every section must explain a differentiated benefit, prove functionality, remove friction, or establish trust — otherwise remove or compress it. Avoid "revolutionize," "seamlessly streamline," "unlock productivity," unnecessary "AI-powered," generic enterprise jargon. Prefer short, declarative, specific, product-led copy.

## 32–34. Interaction, Analytics, Funnels

Primary CTA routes to the canonical creation flow everywhere. "Try a live example" gives a no-account demo path. Scenario switcher supports click/tap/keyboard with no page reload. Resolver may expose "Why this time?" for concise rationale. Analytics events (`landing_view`, `hero_create_clicked`, `hero_demo_clicked`, `resolver_reason_opened`, `scenario_selected`, `create_started`, `wenmeet_created`, etc.) and funnel evaluation are specified for when an analytics provider exists — **not wired at implementation time; this app has no analytics provider configured yet.**

## 35–41. UX Evaluation Plans

Moderated/lightweight remote testing (5–12 users), five-second test, hero comprehension eval, role-comprehension eval, differentiation eval, and trust eval are all specified with pass thresholds (e.g. ≥80% five-second comprehension, ≥70% differentiation, ≥90%/80%/75% role comprehension for Required/Optional/Decision). **These require real moderated user research and are not something implementation work can satisfy — flagged as follow-up, not attempted at build time.**

## 42. Anti-Generic-SaaS Evaluation

A 10-question internal review checklist (pills removed from integrations, marketing claims without cards, product states visually distinct from CTAs, roles distinct from tags, restrained shadows, intentional radii, at least one section breaking the white-card-on-light-gray pattern, hero showing real product behavior, motion communicating logic, and — the required "yes" — "could this page reasonably belong only to WenMeet?"). Pass bar: ≥9/10 yes, last question must be yes.

## 43–49. Acceptance Criteria

Detailed checklists for Hero, Resolver, Layout, Visual System, Accessibility, Performance, and Copy — see the full spec for the itemized checkboxes. Implementation was checked against each category at build time; anything not satisfied is called out explicitly rather than silently marked done.

## 50. Launch Blockers

Redesign must not launch if: users still describe WenMeet as "another Calendly," the resolver's rationale is ambiguous, Decision reads as functionally identical to Required *without explanation* (see §10 calibration — it currently **is** functionally identical, and the shipped copy says so honestly rather than implying otherwise), marketing claims exceed real calendar-access/privacy behavior, any P0 WCAG issue exists, the hero/resolver requires desktop width to understand, or interactive marketing components materially degrade Core Web Vitals.

## 51. Design QA Matrix

Chrome/Safari/Firefox/Edge desktop, iOS Safari/Android Chrome mobile, widths 360–1728+, normal and reduced motion, light mode (dark mode out of scope unless separately scoped). **Full cross-browser/device QA matrix execution is a manual QA process beyond what a single implementation pass can complete — flagged as follow-up.**

## 52–56. Implementation Philosophy, Architecture, Deliverables, Tests, Definition of Done

Semantic HTML → CSS → lightweight progressive JS preferred over heavy rendering systems. Recommended resolver state machine: `INITIAL → LOADING_AVAILABILITY → EVALUATING → BLOCKING_INVALID → RANKING → RESOLVED → EXPLAINED` (kept, with `RANKING` calibrated per §9/§11 to mean "narrowing to the earliest valid time," not score-based reordering). Suggested component tree (`Navigation`, `Hero`/`MeetingResolverDemo`, `ComplexityProof`, `ViabilityComparison`, `CoordinationSystem`, `ScenarioExplorer`, `PrivacyTrust`, `FinalCTA`, `Footer`) followed directly. Full design-deliverable list (desktop/mobile masters, storyboards, tokens) and automated/visual-regression test list are process items for a design/QA team with tooling this session doesn't have — not fabricated here.

## 57. Final Design Principle

> Does this help the visitor understand why WenMeet can make a better meeting decision than a scheduler that only looks for overlapping free time? If the answer is no, the element should be simplified, merged, or removed. The site should never need to tell visitors that WenMeet is intelligent — they should be able to watch it make the better decision.
