# WenMeet Frontend Product System PRD

**Document type:** Product / Frontend Engineering Standard
**Status:** Canonical
**Applies to:** Entire customer-facing WenMeet web application
**Primary audience:** Product engineering, frontend engineering, design, AI coding agents, QA
**Implementation format:** Markdown committed to repository
**Path:** `docs/FRONTEND_PRODUCT_SYSTEM.md`

## 0. Purpose

This document defines the non-negotiable product, copy, interface, and frontend engineering rules for WenMeet.

It exists because implementation details must not leak into the customer experience.

WenMeet may contain sophisticated infrastructure underneath:

- calendar synchronization,
- scheduling constraints,
- participant roles,
- timezone conversion,
- deterministic scoring,
- locking,
- concurrency,
- provider APIs,
- snapshots,
- retries,
- background workflows.

The interface must not expose that complexity unless the user specifically needs it to make a decision.

The governing principle is:

> The machine can be complicated. The product cannot be.

Every frontend change must satisfy this document.

## 1. Product Definition

WenMeet helps groups find a time to meet.

The canonical public explanation is:

> Pick your times. Share one link. WenMeet finds when everyone can meet.

The product is not publicly positioned as:

- an internal scheduling utility,
- a CCB-specific tool,
- an engineering experiment,
- a prototype,
- a calendar research project,
- an AI scheduler,
- a PRD implementation,
- an internal distributed-team solution.

It is a standalone product intended for people and organizations across industries.

## 2. Public Positioning

WenMeet must appear capable of serving:

- executives,
- founders,
- investors,
- professional services,
- recruiting teams,
- advisors,
- sales teams,
- client teams,
- boards,
- distributed organizations,
- partnerships,
- internal teams.

Do not narrow the public product around the founding team's personal use case.

Internal usage is product validation. It is not marketing positioning.

## 3. Public / Internal Separation

The frontend must enforce a strict boundary between **public product** and **internal implementation**.

**Public product includes**

- meeting title, duration, dates, participants, availability,
- roles expressed in human terms,
- best available times, booking, calendars, meeting location,
- user-facing errors, confirmation states.

**Internal implementation includes**

- PRD versions, scaffold terminology, algorithm versions, snapshot IDs,
- database state, UTC normalization, provider webhook state, retry counts,
- queue state, Netlify details, Docker details, test coverage,
- enum names, API status, implementation progress.

Internal implementation information must not appear on public product routes.

## 4. Forbidden Public Terminology

The following terms must never appear in primary customer-facing UI unless placed inside explicitly technical documentation:

```
PRD
scaffold
unit tested
snapshot revalidation
normalized to UTC
needs_confirmation
retry ceiling
API surface
database
webhook
Netlify
Docker
OpenNext
constraint solver
scheduling engine
algorithm version
score weight
participant_roles
calendar_busy_intervals
```

These are valid engineering concepts. They are not valid product copy.

## 5. Internal State Translation

Raw application state must pass through a presentation layer before rendering.

```ts
const participantStatusCopy = {
  needs_confirmation: "Still good?",
  waiting: "Waiting for response",
  confirmed: "Ready",
  declined: "Can't make it",
  waived: "Not required for this meeting",
};

const meetingStatusCopy = {
  draft: "Draft",
  collecting_availability: "Waiting for availability",
  ready: "Everyone's ready",
  evaluating: "Finding the best times…",
  proposed: "Times ready",
  scheduled: "Booked",
  locked: "Confirmed",
  needs_rescheduling: "We need another time",
  cancelled: "Cancelled",
  completed: "Completed",
};
```

Never render database enums directly.

## 6. The Five-Second Test

A first-time visitor must understand within five seconds:

- **What does WenMeet do?** It finds when a group can meet.
- **What do I do?** Choose my availability and share a link.
- **Why is that useful?** WenMeet removes scheduling back-and-forth.
- **What can I do next?** Create a WenMeet.

If any landing-page section makes this harder to understand, remove or simplify it.

## 7. Product Vocabulary

**Preferred:** Create a WenMeet, When can you meet?, Choose your times, Share, People, Required, Optional, Decision maker, Best times, Book, Calendars, Meeting location, Ready, Waiting.

**Avoid:** Submit availability, Scheduling readiness, Hard constraint, Soft constraint, KDM, Constraint evaluation, Snapshot, Candidate score, Normalized interval, Availability state, Provider synchronization.

Internal terminology may exist in code. Public terminology must remain human.

## 8. Canonical Product Loop

```
CREATE → CHOOSE → SHARE → RESPOND → FIND → BOOK
```

Every major screen should correspond to one stage. Do not introduce additional mandatory steps unless they eliminate meaningful user risk.

## 9. Organizer Golden Path

```
/new → meeting basics → /availability → choose organizer availability
  → /share → copy link → /meeting/:id → watch responses
  → choose best time → book
```

Target: create and share a WenMeet in under 30 seconds.

## 10. Participant Golden Path

```
open shared link → understand meeting → choose availability → continue → done
```

Target: a participant should respond in under 30 seconds on mobile. Permanent account creation must not be required merely to submit availability.

## 11. One Screen, One Question

Every primary workflow screen must answer one dominant question, e.g. "What are we meeting about?", "When can you meet?", "Who needs to be there?", "Which time should we book?"

Do not combine multiple conceptual decisions on one screen merely because they exist in the same database object.

## 12. One Primary Action

Every workflow screen gets one visually dominant CTA (e.g. "Choose my times →", "Continue →", "Copy link", "Book meeting"). Secondary controls may exist but must not compete visually. Never display three equally weighted CTAs.

## 13. Progressive Disclosure

Default experience contains only what the majority of users need.

**Default meeting creation:** title, duration, date range — then proceed directly to availability.

**Advanced options** (revealed only on request): participant roles, meeting location, detailed timezone preferences, calendar preferences, optional attendees, custom scheduling constraints.

## 14. Landing Page Rules

The landing page is a product surface, not an engineering report.

**Required above fold:** WenMeet identity, clear product promise, primary CTA, calendar compatibility signal, real product visual.

**Recommended hero:**

> Stop asking when everyone is free.
> Pick your times. Share one link. WenMeet finds when everyone can meet.
> Create a WenMeet →
> Works with Google Calendar and Outlook

## 15. Forbidden Landing Page Content

Do not display: build status, PRD status, internal milestones, test counts, architecture diagrams, infrastructure providers, API links, implementation badges, "V1 scaffold", "real code", "unit tested", internal team geography, internal company names, founder names as product examples.

These may exist on `/docs`, `/changelog`, `/developers`, `/about/build` if required — not on conversion-focused public surfaces.

## 16. Product Visual Requirement

The hero must show WenMeet doing its job: availability grid, participant status, best-time recommendation, booking action. Avoid decorative illustrations that do not explain the workflow. Product visuals should answer: what happens after I click Create?

## 17. Demo Data Policy

Public demos must use fictional or generic data. Never use internal people, exact internal locations, or internal meeting names as default public fixtures.

**Allowed example names:** Maya, Jordan, Alex, Sam, Taylor.

**Allowed meeting examples:** Investor Introduction, Client Strategy Call, Hiring Panel, Partnership Discussion, Board Meeting, Product Review, Advisor Call.

**Allowed geographic examples:** New York, London, Singapore, Toronto, San Francisco, Berlin.

Examples should vary across demos. No specific combination should reveal the founding team's internal operating pattern.

## 18. Industry Neutrality

Do not position WenMeet around a single industry unless on an industry-specific landing page. Homepage messaging must remain broadly useful.

Preferred: "Built for meetings that involve more than two calendars." Not: "Built for finance teams." / "Built for startups."

Industry-specific pages may later exist: `/for/recruiting`, `/for/investors`, `/for/consulting`, `/for/sales`, `/for/boards`.

## 19. Availability Screen

The availability UI must be dramatically simplified. Canonical structure:

```
← WenMeet

Strategy Call
30 min · Aug 18–22

When can you meet?
Select every time that works.

[ Los Angeles · PDT ▾ ]

[ AVAILABILITY GRID ]

12 times selected
[ Continue → ]
```

That is the screen.

## 20. Timezone UX

Timezone handling must be invisible when correct. Default display: `Los Angeles · PDT ▾`. Do not display `America/Los_Angeles` unless timezone settings are expanded. Do not show a timezone converter by default. Do not explain UTC. Do not list unrelated global cities.

The user only needs to know: WenMeet knows what local time I mean.

## 21. Timezone Change UX

Bad: "Availability moved to `needs_confirmation`."

Good:

> Still good?
> It looks like your timezone changed. We've updated your times.
> [ Looks good ] [ Change my times ]

Engineering state remains internal.

## 22. Availability Grid Requirements

Must support: click, click-and-drag, touch, drag selection, drag deselection, clear selected state, calendar conflicts, responsive rendering, keyboard accessibility, appropriate ARIA labels, fast local interaction.

Interaction should occur optimistically in client state. Do not wait for the server after every cell interaction.

## 23. Availability Grid Visual States

Canonical states: `FREE`, `BUSY`, `SELECTED`, `PREFERRED`, `DISABLED`.

Do not require users to read a legend to understand the primary three states. Visual language must remain obvious. Avoid excessive colors. Use shape, fill, opacity, border, and interaction states intentionally.

## 24. Mobile Availability UX

Do not shrink the desktop weekly grid onto a phone. Mobile must receive a dedicated layout:

```
MON 18   TUE 19   WED 20   THU 21   FRI 22
          ↑ active day
```

Then vertical time blocks underneath.

**Requirements:** thumb-friendly targets, sticky date selector, sticky bottom CTA, no precision dragging smaller than reasonable touch size, no forced horizontal page scroll.

## 25. Calendar Integration Copy

```
Calendars

Google Calendar
Keep WenMeet aware of when you're busy.
Connect

Microsoft Outlook
Use your existing work calendar.
Connect
```

Do not explain OAuth or API scopes in primary settings UI. A separate permission explanation can appear before authorization.

## 26. Meeting Location UX

Use: "Where should the meeting happen?"

Options: Google Meet, Microsoft Teams, Custom link, Phone, In person.

Do not say: "Your calendar provider does not dictate how your meeting happens." The product should demonstrate this rather than explain its architecture.

## 27. Better Public Integration Copy

> Use the calendar you already use. Meet where you already meet.
>
> Google Calendar · Outlook
> Google Meet · Microsoft Teams · Custom link

Simple.

## 28. Roles

**Public roles:** Required, Decision maker, Optional.

**Internal roles may remain:** `required`, `kdm`, `optional`.

UI should translate `kdm → "Decision maker"`.

Tooltip: "This meeting won't be booked without them."

Avoid teaching organizational scheduling theory to normal users.

## 29. Participant List

```
People

Maya Chen          Required        ▾
Jordan Williams    Decision maker  ▾
Alex Patel         Optional        ▾

+ Add person
```

Keep role selection inline. Avoid separate administration pages for basic participant management.

## 30. Organizer Room

The meeting room must prioritize: (1) Are we ready? (2) Who are we waiting for? (3) What times work? (4) Can I book?

```
Partnership Discussion
3 of 4 ready

Maya     Ready
Jordan   Ready
Alex     Ready
Taylor   Waiting

Best times
Thursday · 10:00 AM
Everyone required can make it.
Book →
```

## 31. Do Not Lead With Scores

Internal scoring may produce `94.2317`. Do not show that by default. Users care about reasons, not numerical optimization output.

Use: "Everyone required can make it." Optional expandable control: "Why this time?" then:

```
✓ Everyone required is available
✓ Decision makers are available
✓ Inside everyone's selected hours
✓ Most optional participants can join
```

## 32. Explainability Rule

Explain decisions in terms of human constraints. Never expose internal formula names.

Bad: "Fragmentation penalty: -10" → Good: "This avoids a short gap between meetings."
Bad: "Timezone comfort: +20" → Good: "This falls inside everyone's daytime availability."

## 33. No-Overlap State

Bad: "No valid candidate satisfies hard constraints."

Good: "No time works for everyone yet. Try a wider date range or ask someone to update their availability."

Actions: Change dates / Ask for new times.

## 34. Booking Flow

```
Book Thursday at 10:00 AM?

Partnership Discussion
30 min

People: Maya, Jordan, Alex
Meeting location: Google Meet ▾

[ Book meeting ]
```

After success:

```
Booked.
Thursday, Aug 20 · 10:00 AM
Invitations sent.
```

## 35. Error Philosophy

Errors should describe: (1) what happened, (2) whether user action is needed, (3) the next action.

Bad: "Microsoft Graph Error 429."

Good: "Outlook is taking longer than expected. Your availability is saved. We'll refresh your calendar shortly."

Errors should preserve user work whenever possible.

## 36. Loading Philosophy

Prefer contextual progress. Bad: "Loading…" Better: "Checking calendars…", "Finding the best times…", "Booking your meeting…"

Loading text should describe user intent, not system operations.

## 37. Empty States

Every empty state requires one sentence explaining state and one useful action.

> No meetings yet.
> Create your first WenMeet and send one link instead of asking everyone for times.
> Create a WenMeet →

## 38. Copy Rules

WenMeet copy is: short, concrete, conversational, confident, non-technical, active voice, outcome-oriented.

Maximum preferred headline length: 8 words. Maximum preferred supporting paragraph: 2 short sentences. Prefer one strong sentence over three explanatory ones.

## 39. Copy Compression Rule

Before shipping any copy, ask: can this convey the same meaning with half the words?

Bad: "WenMeet detects your local timezone before you paint availability and stores everything normalized to UTC."

Good: "Times appear in your local timezone."

Backend certainty does not require frontend explanation.

## 40. No Product Self-Praise

Avoid: intelligent, powerful, revolutionary, advanced, cutting-edge, next-generation, AI-powered, enterprise-grade — unless objectively necessary.

Show capability. Do not describe capability.

Bad: "Intelligent timezone coordination." Good: "Everyone sees the right local time."

## 41. Intelligence Rule

WenMeet should feel intelligent without announcing intelligence.

Bad: "Our deterministic scheduling engine evaluates participant constraints." Good: "Thursday at 10 works for everyone." The answer is the intelligence.

## 42. Visual Design Principles

The frontend should feel: calm, precise, fast, premium, lightweight, trustworthy, human.

Avoid: dashboard density, giant empty hero sections, excessive gradients, floating SaaS pills, developer badges, status-chip overload, glassmorphism everywhere, tiny gray text, generic AI visual language.

## 43. Layout Principles

```
--content-narrow: 680px;
--content-standard: 1120px;
--content-wide: 1280px;
```

Forms should generally stay narrow. Product grids may use standard/wide layouts. Avoid full-width text paragraphs.

## 44. Typography

Use typography to establish hierarchy before borders and boxes: page title, primary task, supporting context, product surface, primary action, secondary metadata.

Avoid excessive cards merely to separate every piece of information. Whitespace is a component.

## 45. Component Rules

Core reusable components should include:

```
<Button> <PageHeader> <MeetingSummary> <TimezoneSelector> <AvailabilityGrid>
<ParticipantList> <ParticipantStatus> <RoleSelect> <CandidateSlot>
<CalendarConnection> <MeetingLocationSelect> <ShareLink> <EmptyState>
<InlineNotice> <ConfirmDialog>
```

Do not create bespoke versions of identical interaction patterns across pages.

## 46. Button Hierarchy

Only three button levels: Primary (one per decision context), Secondary (alternative action), Tertiary (low-risk utility). Danger actions must be visually distinct but not dominant until confirmation.

## 47. Design Token Requirement

No arbitrary styling directly in feature components where a token exists. Codify: spacing, radius, type scale, surface, border, shadow, interaction states, animation durations, breakpoints.

The frontend should feel like one product even when multiple engineers or coding agents contribute.

## 48. Motion

Motion should communicate state changes.

**Good uses:** availability selection, participant joins, candidate refresh, successful booking, panel expansion, timezone update.

**Bad uses:** decorative floating objects, permanent looping gradients, excessive parallax, animation that delays interaction.

Recommended UI transition duration: 120–220ms. Most interactions should feel immediate.

## 49. Accessibility

Minimum target: WCAG 2.2 AA.

Mandatory: keyboard navigation, visible focus states, semantic HTML, sufficient contrast, labels for controls, no color-only status communication, accessible dialogs, screen-reader calendar descriptions, touch target sizes appropriate for mobile.

Accessibility is not a post-launch enhancement.

## 50. Responsive Standards

Required viewport validation: 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px+.

No page is considered complete after testing desktop only. Shared-link participant flows receive the highest mobile priority.

## 51. Frontend Performance

Targets: initial route usable quickly, no blocking calendar fetch before basic UI renders, availability interaction local-first, progressive calendar hydration, skeletons only where useful, minimal unnecessary JavaScript, no giant animation libraries for minor effects.

The user's selection should never feel coupled to network latency.

## 52. Optimistic Interaction

For reversible low-risk actions (selecting availability, changing preferences, editing meeting title, changing duration before booking): update UI immediately, persist in background. If persistence fails: preserve local state where possible, communicate clearly, provide retry.

## 53. Confirmation Rules

Require explicit confirmation for: booking a meeting, cancelling a booked meeting, waiving a required participant, changing a booked time, disconnecting a calendar if scheduling may be affected.

Do not require confirmation for harmless reversible actions.

## 54. URL Structure

Preferred: `/new`, `/m/:shareToken`, `/m/:shareToken/availability`, `/meetings/:meetingId`, `/meetings/:meetingId/edit`, `/calendars`, `/settings`.

Avoid exposing implementation terms in routes: `/scheduling-snapshot`, `/constraint-engine`, `/provider-state`.

## 55. Public Metadata

Every shared meeting page should generate strong metadata, e.g. title "Strategy Call — WenMeet", description "Choose the times that work for you."

Do not leak participant emails, internal meeting metadata, or calendar details into OpenGraph metadata.

## 56. Privacy Presentation

Never display raw calendar event names to other participants. Default interpretation: Available / Busy / Selected. The organizer does not need to know why someone is busy.

## 57. Public Demo Safety

Demo mode must never accidentally connect to production user data. Demo fixtures must be static or isolated. Demo labels should not expose internal team names, customer names, lead names, company relationships, private calendar information.

## 58. No Internal Geography Leakage

Public marketing must not repeatedly use a geographic combination copied from internal operations. Rotate scenarios across sections (e.g. "New York · London · Singapore" in one place, "Toronto · Berlin · San Francisco" in another). Better still: "Across offices, cities, and timezones." The capability matters, not the founding configuration.

## 59. Product-Hunt Quality Bar

Before public launch, the homepage must pass:

- **Screenshot test** — looks like a real shipping product without explanation.
- **Scroll test** — every section introduces a new reason to care.
- **CTA test** — a Create CTA remains reachable throughout the page without becoming repetitive.
- **Product test** — at least one visible element demonstrates the actual scheduling interaction.
- **Copy test** — no section reads like documentation.

## 60. Homepage Section Architecture

```
1. Hero
2. Interactive product demonstration
3. Choose → Share → Meet
4. Calendar integrations
5. Multi-person scheduling / roles
6. Timezone handling
7. Use cases
8. Trust / privacy
9. Final CTA
```

Maximum approximately 7–9 meaningful sections. Do not create a feature catalog of every internal capability.

## 61. Homepage Integration Section

> Your calendars already know when you're busy.
> WenMeet works with the tools your group already uses.
>
> Google Calendar · Microsoft Outlook
>
> Meet wherever you want.
>
> Google Meet · Microsoft Teams · Custom link · Phone · In person

No architecture explanation.

## 62. Homepage Timezone Section

> Everyone sees the right time.
> WenMeet handles timezones automatically, so every participant sees availability in their own local time.
>
> Different cities. Different calendars. One meeting.

Do not describe conversion mechanics.

## 63. Use-Case Section

Use scenarios rather than industries alone: Investor introductions, Hiring panels, Client strategy calls, Board meetings, Partnership discussions, Advisor calls, Distributed team meetings.

This allows people across industries to recognize themselves.

## 64. Trust Section

> Your calendar isn't our business.
> WenMeet needs to know when you're busy. It doesn't need to know why.

This should represent the actual architecture. Do not make privacy claims stronger than implementation guarantees.

## 65. Developer Guardrail Comments

Critical product components should include concise engineering comments where implementation decisions protect UX rules, e.g.:

```ts
// PUBLIC UX RULE:
// Never render raw participant status enums.
// Always pass through getParticipantStatusCopy().
```

```ts
// PRIVACY RULE:
// Event titles must not be returned by this selector.
// WenMeet only requires busy intervals here.
```

These are useful when AI coding agents modify the codebase later.

## 66. Product Linting

Create automated checks where practical: `scripts/lint-product-copy.ts`. It should scan customer-facing code for prohibited strings.

Initial blocked patterns: `needs_confirmation`, `snapshot`, `normalized to UTC`, `PRD`, `V1 scaffold`, `unit tested`, `API surface`, `snapshot revalidation`, `retry count`, `Netlify`, `Docker`.

Allow-list technical docs paths. CI should fail when blocked implementation terminology appears in customer-facing routes.

## 67. Internal Data Leakage Linting

Public frontend fixture files should be scanned for internal employee names, internal company names, private customer names, known internal test emails, private meeting titles.

Maintain internal fixtures separately from public demo fixtures: `/fixtures/public-demo/`, `/fixtures/internal-dev/`. Never import `internal-dev` fixtures into production marketing routes.

## 68. Copy Ownership

Every piece of customer-facing copy must live either directly in a deliberately reviewed component, or in a centralized product copy module. Avoid deriving customer copy from backend enums.

Recommended: `src/product/copy/{meeting,participant,calendar,errors,emptyStates,marketing}.ts`

## 69. Frontend Architecture Rule

Domain logic and presentation must remain separated.

Preferred: `domain state → view model → presentation copy → component`

Avoid: `database enum → component`

```ts
const viewModel = getMeetingViewModel(meeting);
return <MeetingStatus label={viewModel.statusLabel} />;
```

This makes product language enforceable.

## 70. View Model Requirement

Complex customer-facing screens should render from explicit frontend view models, e.g.:

```ts
type MeetingRoomViewModel = {
  title: string;
  durationLabel: string;
  dateLabel: string;
  statusLabel: string;
  participantSummary: string;
  participants: ParticipantViewModel[];
  candidates: CandidateViewModel[];
  primaryAction: ActionViewModel;
};
```

The component should not need to understand scheduling internals.

## 71. Frontend State Rule

Separate server truth from interaction state. Availability painting should remain smooth even when network state changes. Use optimistic local interaction with controlled synchronization. Do not rebuild the entire grid from remote data after every click.

## 72. Date and Time Formatting

Never expose raw timestamps. Never expose UTC to normal users. Always display e.g. "Thu, Aug 20 / 10:00 AM" using the viewer's relevant timezone. If multiple timezones need to be visible: "10:00 AM PT / 1:00 PM ET". Do not show ISO timestamps in customer UI.

## 73. Language Around Automation

Avoid implying WenMeet makes uncontrollable decisions. Prefer "WenMeet found 3 times." over "WenMeet automatically scheduled your meeting." until the organizer has explicitly enabled automatic booking. User control remains obvious.

## 74. User Agency

WenMeet recommends. The organizer confirms. V1 should not silently book a meeting based solely on a score unless the organizer has explicitly enabled such behavior.

Default: Find best times → organizer selects → book.

## 75. Destructive Actions

Never place destructive actions adjacent to primary positive actions without separation. Danger controls (e.g. "Cancel WenMeet") should sit behind a secondary affordance (e.g. a "•••" menu), not equally weighted next to the primary CTA.

## 76. Content Density Rule

If a screen contains more than two paragraphs before its main interactive element, more than five badges, or more than three explanation callouts — review it for over-explanation. Primary workflows should favor interaction over prose.

## 77. Badge Rule

Badges are for exceptional status, not normal content. Allowed: Waiting, Needs attention, Booked. Do not turn Google Meet / 30 minutes / Timezone / Required / Live calendar into decorative pills. Reduce pill overuse.

## 78. Card Rule

Not everything belongs in a card. Use cards when an object is conceptually contained, multiple similar objects repeat, or elevation improves hierarchy. Do not put every section into a rounded rectangle.

## 79. Marketing Background Rule

Use decorative gradients sparingly. The product should remain recognizable if all gradients disappear. Brand should come from typography, spacing, interaction, iconography, a controlled accent, and product surfaces — not generic purple SaaS backgrounds.

## 80. QA Acceptance Checklist

Every customer-facing PR must be reviewed against:

- Does this expose internal terminology?
- Is there one dominant user question?
- Is there one dominant CTA?
- Can the copy be cut in half?
- Is this understandable without knowing WenMeet architecture?
- Does mobile receive intentional design?
- Are raw enums hidden?
- Are times shown in human local format?
- Is user work preserved on errors?
- Is accessibility covered?
- Does this reveal internal company/team details?
- Does it look like a product rather than a prototype?

## 81. Landing Page Acceptance Checklist

- No "V1 scaffold" · No PRD language · No testing language · No API surface CTA
- No infrastructure badges · No internal team locations · No founder/team names in public default demo
- Product visible above fold · Create CTA above fold
- Google Calendar shown · Outlook shown · Google Meet shown · Microsoft Teams shown
- Mobile hero tested · Landing page understandable in five seconds

## 82. Availability Page Acceptance Checklist

- Title clearly identifies meeting · Duration and date range visible
- Main headline is "When can you meet?"
- Timezone is one compact control · No timezone converter visible by default · No UTC explanation
- No raw internal states · Availability grid dominates screen
- Touch interaction works · Keyboard interaction works
- Selected count visible when useful · Primary CTA is obvious
- Participant can finish quickly

## 83. Meeting Room Acceptance Checklist

- Organizer sees readiness immediately · Waiting participants are obvious
- Candidate times are easy to compare · No raw scores shown by default
- Explanation available on demand · Booking requires explicit action
- Calendar provider details are secondary · Internal scheduling machinery is invisible

## 84. Definition of Frontend Done

A frontend feature is **not** done because it compiles, tests pass, or backend state appears on-screen.

A feature is done when:

1. the user understands what is happening,
2. the user knows what to do next,
3. internal machinery remains hidden,
4. mobile behavior is intentional,
5. errors preserve confidence,
6. accessibility requirements pass,
7. product copy follows this specification,
8. it looks consistent with the rest of WenMeet.

## 85. AI Coding Agent Instruction

Any coding agent working on the WenMeet frontend must treat this document as a product contract. Before implementing or modifying customer-facing UI:

1. read this document,
2. identify the relevant screen rules,
3. preserve internal/public separation,
4. use existing product components,
5. use presentation copy rather than backend enums,
6. validate responsive behavior,
7. run product-copy lint,
8. run frontend tests,
9. compare final result against acceptance checklists.

An agent must not interpret backend completeness as permission to expose backend concepts.

## 86. Conflict Resolution

If another technical document conflicts with this document on customer-facing presentation, **this document wins** for frontend UX and copy.

Technical PRDs remain authoritative for: business logic, scheduling correctness, persistence, provider integration, state machines.

This document remains authoritative for: customer language, screen hierarchy, interaction model, visual density, public positioning, information disclosure.

## 87. Canonical Product Principle

WenMeet should never make users understand scheduling technology. They should experience:

```
When can you meet?
        ↓
 Send this link.
        ↓
Everyone's ready.
        ↓
Thursday at 10 works best.
        ↓
     Booked.
```

Everything required to make those five moments reliable can be sophisticated. The customer does not need to see it.

**Complexity belongs behind the screen. Confidence belongs on it.**
