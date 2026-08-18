# WenMeet — Product Requirements Document v3

**Product:** WenMeet
**Organization:** Conscious Capital Brands
**Product Owner:** Caleb Pierre, CTO
**Status:** Build-ready V3
**Date:** August 2026
**Supersedes:** WenMeet / Nebula Habitats PRD v2 and prior prototype assumptions where conflicts exist

## 1. Product Definition

WenMeet is an intelligent coordination layer for important meetings. Its job is simple:

> Create a meeting, show when you can meet, share one link, let everyone add their availability, and WenMeet finds and books the best valid overlap.

WenMeet is not primarily a calendar application and is not an AI scheduling agent. Calendars know when people are busy. WenMeet understands who needs to attend, whose decision authority matters, which constraints are mandatory, which preferences are flexible, when calendars actually permit a meeting, how timezone differences affect participants, and which valid slot is best.

The scheduling decision itself is deterministic. AI is not required in the core scheduling path.

## 2. Product Thesis

Traditional scheduling tools largely solve: Person A + Person B + free calendar slot = meeting.

WenMeet is designed to solve: meeting objective + organizer + required participants + decision makers + optional participants + calendar reality + timezone reality + preferences + hard constraints = best viable convergence.

This gives WenMeet a foundation for broader meeting intelligence without requiring that larger vision in V1.

## 3. Core Product Principles

### 3.1 Organizer-first

Every WenMeet begins with the organizer's availability:

```
New WenMeet → Set meeting parameters → Confirm my availability
  → Generate shareable link → Participants respond
  → WenMeet calculates overlap → Confirm/book
```

The organizer should be able to create and share a WenMeet in approximately 20–30 seconds.

### 3.2 The shareable link is the product's distribution object

Every meeting receives a short, high-entropy URL (`wenmeet.com/m/7KQ4P...`), pasteable into any messaging system. Recipients should not need an explanation of WenMeet before responding.

### 3.3 Calendar connection improves the experience but must not gate participation

Preferred participant options: Continue with Google / Continue with Microsoft / Enter availability manually. A recipient must be able to respond without creating a permanent WenMeet account or granting calendar access.

### 3.4 Privacy by default

WenMeet should ingest the minimum calendar information required to determine availability — strongly prefer busy/free intervals over calendar titles, descriptions, attendees, meeting contents, or notes, unless a future feature explicitly requires them with user consent.

### 3.5 Deterministic scheduling

The scheduler must behave like infrastructure, not an AI opinion. Same inputs must produce the same result. Hard constraints must never be silently ignored. Every ranking decision must be explainable from stored scoring components.

## 4. V1 Golden Path

**Create WenMeet.** Required fields: meeting title, duration, scheduling window, organizer timezone. Optional: description, location preference, participant list, role assignments.

Duration presets: 15 / 30 / 45 / 60 minutes / Custom.

Default scheduling window: next 5 business days. Quick alternatives: this week / next week / next 10 business days / custom dates.

Timezone is automatically detected and prominently displayed.

## 5. Organizer Availability

Immediately after meeting creation: "When can you meet?" — a calendar grid over the selected window, combining calendar free/busy + manual availability + manual exclusions + preferred periods + existing WenMeet commitments = effective availability. The grid is a visual interface over live scheduling state, not a static painted form.

## 6. Availability States

Each time segment can conceptually be: `calendar_busy`, `calendar_free`, `manually_available`, `manually_blocked`, `preferred`, `wenmeet_reserved`. WenMeet calculates `EffectiveAvailability(participant)` from those inputs — painted availability is an override/preference layer, not the canonical truth.

## 7. Confirm and Share

Primary action: "Confirm & Invite People." After confirmation: the meeting persists, organizer availability becomes confirmed, a secure share URL is generated, and sharing actions (Copy Link, Text, Email, WhatsApp, Slack) surface immediately. WenMeet should not require the organizer to manually construct invitations before sharing.

## 8. Participant Join Flow

Opening a WenMeet link shows the meeting context, detected timezone (correctable before submission), and three options: Continue with Google / Continue with Microsoft / Enter availability manually.

## 9. Participant Roles

Roles are modeled independently from participants. Supported V1 roles: Organizer, Required, KDM (Key Decision Maker), Optional, Waived. A participant may hold multiple roles — the database must use a many-to-many role model. **Do not model KDM as a single field on `meeting`.**

## 10. Role Authority

Only the organizer may assign or modify meeting roles. Participants joining through a shared link may not self-designate as KDM/Required/Organizer. Default shared-link participant role: Optional, or Required if the organizer generated a participant-specific invitation with that role.

## 11. Hard and Soft Constraints

**Hard participants**: organizer + required participants + all KDM participants, unless explicitly waived for that meeting. A candidate slot is invalid if any non-waived hard participant cannot attend:

```
∀ participant ∈ HardParticipants: candidate_slot ⊆ EffectiveAvailability(participant)
```

**Soft participants**: optional attendees affect ranking but never invalidate a candidate.

## 12. Waivers

A participant may be waived from a specific meeting after lock or during an explicit organizer decision. Waiver records `meeting_id`, `participant_id`, `waived_by`, `waived_at`, `waived_reason`. Affects only that meeting — the participant's global identity/role elsewhere is unchanged.

## 13. Timezone Model

All scheduling calculations are stored and performed in UTC. Local timezone is presentation/preference context only:

```
Local input → timezone conversion → UTC → scheduler → UTC result → participant-local rendering
```

A timezone change after availability confirmation moves that participant to `needs_confirmation`; existing availability is converted and re-rendered in the new timezone, and the participant can confirm, edit, or resubmit. Until confirmation, Required/KDM availability doesn't count toward scheduling readiness.

## 14. Timezone Comfort

Timezone suitability is deterministic. Each participant can eventually have preferred/available/never hours. V1 defaults may use configurable business-hour bands, e.g.:

```
08:00–17:00 → ideal
07:00–08:00, 17:00–19:00 → acceptable
06:00–07:00, 19:00–21:00 → poor
outside → severe penalty or unavailable
```

No sentiment analysis is involved.

## 15. Calendar Providers — P0

Google and Microsoft must have first-class parity. Provider abstraction:

```ts
interface CalendarProvider {
  getBusy(): ...
  getEvents(): ...
  createEvent(): ...
  updateEvent(): ...
  deleteEvent(): ...
  subscribeToChanges(): ...
  renewSubscription(): ...
}
```

Scheduling domain logic must not directly depend on Google- or Microsoft-specific data structures.

## 16. Meeting / Conference Providers — P0

Calendar provider and meeting-location provider are separate concepts. Supported V1 meeting locations: Google Meet, Microsoft Teams, Phone, In Person, Custom URL. Default pairing (Google Calendar → Google Meet, Microsoft Calendar → Microsoft Teams) is a default, not a restriction — e.g. a Microsoft Outlook user may still schedule a Google Meet.

## 17. Live Calendar Availability

Live calendar state is P0. Effective availability must react when a Google/Outlook event appears or is removed, another WenMeet claims the same time, manual availability changes, or a timezone changes:

```
Calendar Busy + Manual Availability + Manual Blocks + Preferences + WenMeet Reservations → Effective Availability
```

## 18. Deterministic Scheduling Engine

The heart of WenMeet is a pure scheduling engine:

```ts
schedule(snapshot: SchedulingSnapshot): SchedulingResult
```

The engine must not call Google, call Microsoft, query the database, send emails, call an LLM, or mutate external systems. It receives normalized input and returns deterministic output: JSON in → deterministic scheduling → JSON out.

## 19. Scheduling Resolution

V1 canonical resolution: 5-minute intervals. A participant's availability window is represented internally as a bitset (`1` = available, `0` = unavailable). Hard availability intersection:

```
organizer_mask AND required_mask_1 AND required_mask_2 AND kdm_mask_1 ... = feasible_mask
```

A 30-minute meeting requires six consecutive available 5-minute intervals — computationally inexpensive and deterministic.

## 20. Candidate Generation

```
1. Freeze SchedulingSnapshot.
2. Determine hard participant set.
3. Exclude waived participants.
4. Verify all Required/KDM participants have confirmed availability and are not needs_confirmation.
5. Convert all relevant calendar state to UTC.
6. Calculate EffectiveAvailability for each participant.
7. Intersect hard-participant availability.
8. Identify continuous windows >= meeting duration.
9. Generate legal candidate start times.
10. Score each candidate.
11. Sort deterministically.
12. Return top candidates.
```

## 21. Candidate Scoring

Hard constraints are never scoring weights. Bad: "KDM available = +100". Correct: "KDM unavailable → candidate INVALID." Soft factors rank only after feasibility is established:

```
Score(slot) =
  + optional attendance
  + preferred-time alignment
  + organizer preference
  + participant preference
  + timezone comfort
  + calendar buffer quality
  - fragmentation penalty
  - meeting-density penalty
  - inconvenient-hour penalty
```

Initial weights should be version-controlled and easily tunable.

## 22. Explainability

Every candidate stores a scoring trace, e.g.:

```json
{
  "score": 87,
  "components": {
    "optionalAttendance": 20,
    "preferredHours": 30,
    "timezoneComfort": 25,
    "calendarBuffer": 12,
    "fragmentationPenalty": 0
  }
}
```

This lets WenMeet explain a result in plain language without generative AI.

## 23. Deterministic Tie Breaking

Ordering: highest score → highest hard-participant preference coverage → highest optional attendance → earliest candidate → deterministic candidate ID. Identical scheduling snapshots must produce identical results.

## 24. Scheduling Snapshots

Every evaluation runs against a versioned immutable snapshot containing: meeting window, duration, roster, roles, waivers, confirmed availability, calendar busy intervals, manual blocks, preferences, timezone state, existing WenMeet commitments, algorithm version, score-weight version, snapshot version. Supports reproducibility, debugging, auditability, concurrency safety.

## 25. Concurrency

```
snapshot → calculate → candidate result → compare latest version
```

If state changed materially: discard stale result, create fresh snapshot, recalculate. Optional-attendee changes don't interrupt active calculations; Required/KDM changes do.

## 26. Readiness

```
Organizer confirmed AND all Required confirmed AND all KDM confirmed
  AND no Required/KDM participant = needs_confirmation
```

Optional participants never block readiness.

## 27. Open-Roster Meetings

A shared group-chat link creates ambiguity about expected participant count. Meetings support Roster Status: OPEN / READY / LOCKED. For open-link meetings, the organizer explicitly triggers "Find the best time" to signal the current hard roster is sufficient. Explicitly invited rosters may transition to Ready automatically.

## 28. Proposed Slots

Organizer dashboard shows best candidates with score, without unnecessary participant calendar detail:

```
Investment Discussion
3 required participants ready, 1 optional waiting

Best matches
Thu Aug 20 · 10:00 AM PT — Score 94
Thu Aug 20 · 11:30 AM PT — Score 89
Fri Aug 21 · 9:00 AM PT — Score 84
```

## 29. Availability Privacy

Non-organizer participants receive aggregated availability only — never another participant's detailed calendar or individual availability unless authorized. Organizer gets the detail necessary to coordinate. Raw calendar event titles should not be required for normal scheduling.

## 30. Booking

```
final validation → reserve WenMeet slot → create calendar event
  → create Meet/Teams conference if requested → invite participants
  → persist provider IDs → meeting = scheduled
```

Writes must be idempotent. Retries must never create duplicate meetings.

## 31. T-24 Hour Lock

Availability remains changeable until 24 hours before the scheduled start. At T-24h, meeting → LOCKED. The cutoff is time-based, not retry-based. Before locking, WenMeet performs final validation against current confirmed state — if a hard participant changed availability, the stale proposal is discarded, recalculated, and the organizer notified.

## 32. After-Lock Conflict

If a Required participant or KDM becomes unavailable after lock: meeting → `needs_rescheduling`, organizer notified. Organizer can reschedule, explicitly waive that participant, or cancel. WenMeet never silently removes a hard participant.

## 33. Rescheduling

Uses the existing live availability model. Participants receive a new response request; previously supplied availability is prefilled where still valid inside the new window. Participant status becomes `needs_confirmation` until reconfirmed.

## 34. Notifications

P0: share-link invitation, participant joined, required participant responded, meeting ready, proposal changed, meeting booked, calendar sync issue, timezone needs confirmation, meeting needs rescheduling, T-24 lock, cancellation. Channels initially: email + in-product status. SMS and other channels may follow after validated demand.

## 35. Netlify-First Architecture

```
Next.js App Router, TypeScript
Netlify / OpenNext
Netlify Database / PostgreSQL
Netlify Functions
Netlify Async Workloads
Netlify Scheduled Functions
Netlify Edge Functions
Netlify Blobs where appropriate
GitHub, Deploy Previews
Google Calendar APIs, Google Meet
Microsoft Graph, Outlook / Microsoft 365, Microsoft Teams
```

## 36. Next.js Runtime

Suggested routes:

```
/
/new
/m/[shareToken]
/m/[shareToken]/availability
/m/[shareToken]/status

/dashboard
/dashboard/meetings
/dashboard/meetings/[id]

/settings
/settings/calendars
```

No separate frontend deployment is required for V1.

## 37. Persistence

Production canonical state resides in PostgreSQL. Application logic stays behind a store interface:

```ts
interface WenMeetStore {
  createMeeting(); getMeeting(); updateMeeting();
  addParticipant(); assignRole();
  saveAvailability(); getEffectiveAvailability();
  createSnapshot(); saveSchedulingResult();
  waiveParticipant(); lockMeeting();
}
```

Implementations: `NetlifyDatabaseStore` (production), `InMemoryStore` (tests/local) — preserves platform portability.

## 38. Functions

Netlify Functions handle synchronous privileged operations: Google/Microsoft OAuth callbacks, Google Calendar/Graph API requests, webhook receivers, calendar event creation, share-link mutations, secure participant actions. The deterministic scheduler remains a framework-independent application module.

## 39. Async Workloads

Durable async workflows handle: `availability.changed`, `participant.confirmed`, `calendar.changed`, `scheduling.evaluate`, `meeting.proposed`, `meeting.book`, `meeting.lock_due`, `meeting.reschedule`, `notification.send`. Example:

```
availability.changed → create snapshot → evaluate scheduling
  → validate snapshot → persist candidates → notify organizer
```

## 40. Scheduled Functions

Scheduled reconciliation as a safety mechanism: renewing provider webhook subscriptions, checking stale calendar integrations, reconciling missed calendar events, verifying approaching lock deadlines, cleanup of expired invitations. Should not replace event-driven architecture when events are available.

## 41. Edge Functions

Use the edge only where it materially improves the product — share-link routing, localization, lightweight request controls, abuse prevention, region-aware presentation. Do not place canonical scheduling logic at the edge.

## 42. Netlify Blobs

Not canonical meeting storage. Potential uses: generated `.ics` artifacts, immutable exports, temporary generated assets, cached non-critical artifacts. Relational meeting state stays in PostgreSQL.

## 43. Authentication vs Calendar Authorization

Separate concerns — WenMeet identity (participant/session identity) vs. calendar authorization (Google/Microsoft OAuth). A user may authenticate to WenMeet with one identity while connecting a different calendar provider. Calendar OAuth tokens must never be exposed to the browser after server-side exchange.

## 44. Guest Participation

External participants respond without a permanent account, represented by a secure participant/session token. Persistent accounts become useful for saved preferences, reusable availability rules, calendar connection persistence, meeting history, and their own WenMeet creation dashboard.

## 45. Security

Minimum V1: high-entropy share tokens, encrypted OAuth credentials/tokens, server-side provider token exchange, rate limiting, CSRF protection, secure cookies, role-based organizer actions, audit logging, minimal calendar-data collection, secrets managed through deployment environment, no calendar credentials in client storage, idempotent webhook processing, idempotent calendar booking, webhook signature verification where supported.

## 46. Core Database Entities

```
users
meetings
participants
participant_roles
meeting_participants

calendar_connections
calendar_busy_intervals

availability_rules
availability_overrides
availability_confirmations

scheduling_snapshots
candidate_slots
candidate_score_components

meeting_reservations
meeting_waivers

provider_subscriptions
provider_events

notifications
audit_events
```

## 47. Meeting State Machine

Meeting states: `draft`, `collecting_availability`, `ready`, `evaluating`, `proposed`, `scheduled`, `locked`, `needs_rescheduling`, `cancelled`, `completed`.

Participant availability status: `invited`, `joined`, `pending`, `confirmed`, `needs_confirmation`, `declined`, `waived`.

## 48. Algorithm Versioning

Every scheduling result stores `algorithm_version`, `score_weights_version`, `snapshot_version`. Changing scheduling logic must not make historical decisions impossible to reconstruct.

## 49. Testing Strategy

**Unit tests**: UTC normalization, interval intersection, bitset generation, meeting-duration windows, Required constraints, KDM constraints, waivers, timezone conversion, preference scoring, stable tie breaking, snapshot invalidation.

**Property tests**, e.g.: "No valid result may include an unavailable KDM." / "Adding an Optional attendee may change ranking but may never invalidate an otherwise valid slot." / "Waiving a participant may expand feasibility but never alter that participant globally." / "Same snapshot always returns same ordering."

**Integration tests**: Google/Microsoft free/busy, Google/Outlook event creation, Meet/Teams creation, OAuth refresh, webhook handling, provider retries.

## 50. Internal Dogfood Acceptance Test

A distributed group across multiple timezones should be able to create a meeting → share one link → connect mixed calendar providers → respond → obtain valid overlap → book meeting, without manually calculating timezone differences or repeated "what works for you?" messages. **If the internal team does not prefer WenMeet for real scheduling, V1 is not finished.**

## 51. V1 Scope (must ship)

New WenMeet · organizer-first availability · next-5-business-day default · shareable link · guest participation · timezone detection/correction · Required/KDM/Optional roles · live calendar-aware grid · manual availability fallback · Google Calendar · Microsoft Outlook/365 · Google Meet · Microsoft Teams · custom meeting URL · deterministic scheduler · candidate scoring · explainable rankings · snapshot concurrency · needs_confirmation · waiver state · rescheduling · T-24 lock · email notifications · organizer dashboard · booking to calendar · audit trail.

## 52. Explicit V1 Non-Goals

Do not delay shipping for: AI scheduling agents, sentiment analysis, meeting transcription, automatic meeting summaries, CRM, enterprise org charts, full shared organizational calendar, large-scale resource allocation, proxy voting UI, live in-meeting voting, Zoom (unless customer demand validates it), dozens of calendar providers, elaborate mobile applications. Responsive web is sufficient for initial V1.

## 53. KDM Proxy Decision

Not P0. The data model should not prevent it later — a future model may support `principal_kdm`, `proxy_participant`, `scope`, `assigned_by`, `assigned_at`, `expires_at`. Live meeting voting belongs in the broader meeting-intelligence roadmap. Neither should delay the scheduling wedge.

## 54. Shared Calendar Decision

A dedicated CEO/CTO shared WenMeet calendar is not required for V1. The organizer dashboard should provide Upcoming / Waiting / Needs Action / Scheduled / Completed. A team-level shared calendar may be added after internal usage demonstrates the need.

## 55. AI Policy

> AI may interpret intent. Mathematics determines availability.

No LLM required for calendar intersection, timezone calculation, scoring, role validation, readiness, locking, rescheduling, or candidate selection. Possible later AI features: natural-language interpretation of a request into structured constraints for the deterministic scheduler, or natural-language explanation of an already-deterministic result. The underlying decision remains inspectable.

## 56. V2+ Optimization Foundation

Future versions may coordinate multiple competing meetings for the same participant/time (e.g. three meetings competing for an executive's Thursday morning) — maximize total scheduling utility subject to participant, time, role, and meeting constraints. Potential methods: weighted interval scheduling, constraint programming, integer optimization, min-cost flow formulations. The V1 architecture must preserve enough canonical state to support this later.

## 57. Product Metrics

Activation (% of created WenMeets shared) · Participant conversion (% of invite-link visitors who submit availability) · Coordination completion (% of WenMeets reaching a valid candidate) · Booking rate (% of valid WenMeets ultimately booked) · Speed (median: meeting created → meeting booked) · Friction (average participant interactions required) · Organic distribution (% of participants who later create a WenMeet).

## 58. Quality Bar

WenMeet should not feel like a complicated enterprise application: extremely little setup, obvious next action, beautiful calendar interaction, clear timezone presentation, fast perceived performance, excellent mobile web behavior, strong typography, subtle motion, confidence around important meetings. The interface should hide scheduling complexity rather than exposing it.

## 59. Primary V1 Screens

```
1. Landing / New WenMeet
2. Meeting Setup
3. My Availability
4. Share WenMeet
5. Participant Join
6. Participant Availability
7. Organizer Room
8. Candidate Selection
9. Booking Confirmation
10. Calendar Connections
11. Needs Confirmation
12. Rescheduling
```

The product spine is **New WenMeet → My Availability → Share**. Everything else extends from that journey.

## 60. Recommended Build Sequence

1. **Product Spine** — New WenMeet, My Availability, shareable meeting room, participant response, role model, timezone model.
2. **Deterministic Engine** — EffectiveAvailability, bitset engine, hard constraints, candidate generation, scoring, explainability, snapshot versioning.
3. **Google** — OAuth, free/busy, calendar sync, event creation, Google Meet.
4. **Microsoft** — OAuth, Outlook/365 free/busy, Graph subscriptions, event creation, Teams.
5. **Live Coordination** — calendar webhooks, live availability updates, WenMeet reservations, concurrency validation, automatic recalculation.
6. **Reliability** — T-24 lock, rescheduling, waivers, async workflows, scheduled reconciliation, notifications, audit trail, rate limiting.
7. **Polish** — mobile responsiveness, loading states, animations, empty states, error recovery, calendar-provider edge cases, timezone edge cases, accessibility, performance.

## 61. V1 Definition of Done

An organizer can: create a meeting; see the next five business days by default; connect Google or Microsoft; see live calendar conflicts; specify preferred availability; confirm availability; receive a shareable link; send it through any channel; receive responses from one or many participants; assign Required/KDM/Optional roles; support mixed Google/Microsoft participants; handle different timezones correctly; calculate valid overlap without AI; produce deterministically ranked candidates; explain why a candidate ranked where it did; book the selected time; create a Google Meet/Teams meeting/other location; write the meeting to relevant calendars; react to calendar changes before lock; lock automatically at T-24h; enter rescheduling state when a hard participant becomes unavailable; support explicit participant waivers; maintain an auditable scheduling history.

## 62. Final Product Principle

> I know when I can meet. I share one link. Everyone responds. WenMeet finds the answer. The meeting appears on our calendars.

Underneath that simple interaction is a deterministic, auditable scheduling system capable of eventually becoming a much deeper coordination and meeting-intelligence platform. The V1 goal is not to build every future meeting feature — it's to make one behavior exceptionally good: important people should be able to converge on the right meeting time with almost no coordination overhead.
