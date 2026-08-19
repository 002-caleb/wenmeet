# WenMeet — Spec Graph (current state)

Maintained by hand (see FORGE.md §14 — no compiler yet). Rebuilt whenever a
FEATURE or SYSTEM change lands. Status values: `draft`, `modeled`,
`contracted`, `implementing`, `verified`, `shipped`, `stale`, `blocked`.

`shipped` here means: real code, real tests, **and confirmed working in
production** — not just committed. Where something is committed but
unverified in production, it says so explicitly.

---

## Product thesis

> Role-aware meeting coordination for remote-first teams. The differentiator
> from a generic scheduling link: participant *importance* (Required /
> Decision-maker / Optional) is a first-class input to the scheduling
> decision, not just calendar overlap.

## Domain concepts

### `meeting` — **shipped**

```yaml
depends_on: []
invariants:
  - a meeting has exactly one organizer, derived from the authenticated session
  - status transitions are one-directional except needs_rescheduling (post-lock recovery)
  - proposedSlot is set only by the scheduling engine, never by client input
consumers: [participant-role, scheduling-policy, share-token, workspace-view]
```
Real lifecycle (`collecting → ready → no_valid_slot → locked →
needs_rescheduling`), backed by `runSchedulingSnapshot` /
`revalidateBeforeLock`, T-24h auto-lock, versioned snapshots. Unit-tested
(`snapshot.test.ts`, `lock.test.ts`).

**Incident, 2026-08-19:** `DATA_STORE` was scoped to Netlify's "Builds,
Post processing" only, never "Functions"/"Runtime". `getStore()` reads
`process.env.DATA_STORE` at request time inside the deployed function, so
it always saw `undefined` and silently fell back to `InMemoryStore`.
Production had never actually persisted a `meeting` to Postgres since
this variable was introduced — every meeting created on the live site
existed only inside one warm container and vanished on the next cold
start or differently-routed request. Fixed by re-scoping the variable to
all scopes in both `production` and `deploy-preview`, then verified with
a real UUID, a fresh-navigation lookup, and an independent cookie-less
`curl` request. This is exactly the class of gap this framework exists to
surface — invisible until someone traces effect back to a scope setting,
not a code defect `git blame` would ever point to.

### `participant-role` — **shipped**

```yaml
depends_on: [meeting]
invariants:
  - required + kdm gate readiness identically; optional never blocks
  - a participant can hold multiple roles on the same meeting
  - a meeting can have zero, one, or multiple decision-makers
consumers: [meeting, scheduling-engine, wizard-people-step, respond-flow]
```
`readiness.ts` / `engine.ts` are real and tested. Honest architectural
note baked into the copy layer: Required and Decision-maker (kdm) are
**behaviorally identical today** — both hard-gate; kdm exists as a
labeled distinction for the UI/product story, not yet a different
scheduling behavior. This is stated in `statusCopy.ts`, not hidden.

### `scheduling-policy` — **shipped**

```yaml
depends_on: [meeting]
invariants:
  - policy belongs to exactly one meeting
  - timezone is always explicit — dates/weekdays/blackouts are evaluated
    as local calendar dates, never as UTC-shifted instants
  - candidate availability is derived from policy at read time, never persisted as availability
consumers: [wizard-availability-step, meeting-api]
```
Rolling / Fixed / Specific as a mutually-exclusive discriminated union;
weekday rules, blackout ranges, minimum notice as composable constraints
on top. Explicit typed Postgres columns, not a JSON blob (ADR — see
below). 35 tests, including the DST-boundary and midnight-crossing-notice
cases. **Server re-validates and re-resolves always** — a client's
resolved window is treated as derived data, never trusted.

**Gap:** replaces the *shape* of the old `windowStartUtc`/`windowEndUtc`
pair but the scheduling **engine** (`engine.ts`) still only ever reads
those two resolved bounds — it has no awareness of weekday/blackout rules
as first-class inputs to slot ranking. The policy currently *produces* a
correct window; it does not yet *participate* in which slot within that
window gets chosen.

### `share-token` — **shipped**

```yaml
depends_on: [meeting]
invariants:
  - shareToken is a distinct secret from the meeting id — the id appears
    in organizer-only URLs, so it must never double as the public credential
  - a caller through the public respond endpoint can never assign themselves organizer
  - submitted availability must fall inside the meeting's resolved window
consumers: [respond-flow, dashboard-share-panel]
```
CSPRNG token generation (~59 bits, look-alike characters excluded),
public `/m/:token` page with no auth, `/api/m/:token/respond` treating
everything except the token as hostile input. 11 tests covering the
attack surface specifically (privilege escalation, window injection,
malformed token, locked-meeting rejection, dedupe-by-email).

**Gap:** organizer never gets notified when someone responds — no email,
no webhook. The dashboard/detail page must be polled by loading it.

### `workspace-view` (dashboard) — **shipped**

```yaml
depends_on: [meeting, participant-role]
invariants:
  - a meeting appears in exactly one of Attention / Active / Upcoming
  - attentionRequired takes precedence over lifecycle in routing
  - empty state renders through the same component tree as populated state
consumers: [app-home, meeting-detail]
```
`placeSummary` is a pure deterministic function; `buildMeetingSummary` is
the single place a `Meeting` becomes dashboard-shaped, shared by the
dashboard and the detail page so they can't drift. 8 tests including "no
meeting appears twice."

### `calendar-connection` — **partial**

```yaml
depends_on: []
invariants:
  - tokens live on CalendarConnection, not Participant — domain stays provider-agnostic
consumers: [wizard-availability-step, calendars-page]
```
Google + Microsoft OAuth are real: token exchange, refresh, free/busy
query, account-email capture. **Gap, significant:** `aggregateBusy.ts`
(the merge-across-providers logic) is never consumed anywhere. The
scheduling engine has no visibility into anyone's actual calendar
busy/free state — readiness and resolution today run purely on
explicitly-submitted availability slots. "Connect your calendar" in the
wizard is real (OAuth completes, tokens save) but doesn't yet change what
the engine considers.

### `wizard` (creation flow) — **shipped**

```yaml
depends_on: [meeting, scheduling-policy, participant-role]
invariants:
  - every field the wizard submits is re-validated server-side
  - a step's local validation errors never silently pass through to creation
```
5-step flow (Meeting → People → Availability → Place → Review), draft
state is client-only (no server-side draft persistence — a browser
refresh mid-wizard loses progress; §33 in the original PRD flagged this
as a "where technically feasible" item, and it currently isn't
implemented).

### `booking` / calendar write-back — **not modeled**

No domain spec exists for this yet. WenMeet can *decide* a time; nothing
writes it to Google/Microsoft, generates a Meet/Teams link, or sends a
calendar invite. The wizard's "Meeting type" step records organizer
*intent* (`google_meet` / `teams` / `custom_link` / ...), not a
provisioned conference — this is stated in the UI copy, not implied.

---

## Architecture decisions (informal ADR log)

**ADR — SchedulingPolicy storage.** Explicit typed Postgres columns
(`range_type`, `range_amount`, `range_unit`, `range_start_date`,
`range_end_date`, `scheduling_timezone`, `active_weekdays`,
`minimum_notice_minutes`), with `specific_dates`/`blackout_ranges` as
jsonb only because those two collections are genuinely unbounded.
Rejected: one opaque `range_value` JSON blob — would have been faster to
ship but harder to query, migrate, and validate. Existing meetings
backfill as `fixed` ranges from their current window.

**ADR — max meetings/day, not shipped.** The original PRD for
SchedulingPolicy proposed a daily meeting cap. Not built: the engine
doesn't evaluate organizer calendar events against any limit, so exposing
the control would be an inert setting. Consistent with the no-code-gate
principle — don't ship a control the domain can't back.

**ADR — Required vs Decision-maker, not behaviorally distinct.** Both
hard-gate readiness identically today. Documented in the copy layer
rather than silently implied to be different. A real product decision is
pending on whether/how they should diverge (e.g., KDM veto power,
KDM-only re-open-for-decline).
