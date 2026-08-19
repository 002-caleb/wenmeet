# ForgeOS

**Paradigm:** Spec-Driven Agentic Development
**Scope:** Repo-level, agent-agnostic. Not tied to Claude, Codex, or any single tool — any agent working in this repo reads this before writing code.
**Status:** v0.1

## 1. Purpose

ForgeOS converts ambiguous product intent into bounded, verifiable software implementation.

```
Human Intent
    ↓
Semantic Compression      (find the smallest durable concept)
    ↓
Domain Model              (what actually exists)
    ↓
Behavior + Invariants     (what may and may not happen)
    ↓
Contracts                 (boundaries between components)
    ↓
Acceptance Criteria       (how correctness is proven)
    ↓
Implementation Slice      (bounded work order)
    ↓
Code
    ↓
Conformance Verification
```

It exists to prevent: prompt drift, architecture drift, accidental feature
expansion, inconsistent domain concepts, an agent modifying unrelated
systems, duplicated business logic, implementation before behavior is
understood, giant monolithic PRDs, and re-explaining the same product
intent every session.

**Doctrine: spec first, agents second, code last.**

## 2. A compiler, not a prompt collection

```
product intent → parse → semantic analysis → domain representation
              → behavioral contracts → implementation plan → code
```

The intermediate representation — the Spec IR — matters more than any
single prompt. An agent should rarely receive raw brainstorming as its
primary instruction; it should receive a slice (§9) derived from the
graph below.

## 3. The spec graph

Specs are not just files in folders — they form a dependency graph.

```
Product Thesis
      │
      ├──────────────┐
      ▼              ▼
 Experience        Domain
      │              │
      │              ▼
      │            Rules
      │              │
      └──────┬───────┘
             ▼
          Contract
             │
             ▼
        Acceptance
             │
             ▼
    Implementation Slice
             │
             ▼
           Code
```

Every spec declares:

```yaml
id: scheduling-policy
kind: domain
status: shipped        # see §12
depends_on: [meeting]
invariants:
  - policy belongs to exactly one meeting
  - timezone must always be explicit
  - candidate availability is derived from policy, never persisted as availability
consumers: [meeting-wizard, respond-flow, dashboard]
```

This is what lets a question like "what depends on this?" or "what's
stale if I change blackout semantics?" get answered by reading, not by
re-deriving from scratch. In this repo the graph is maintained as
markdown (`graph.md`) rather than a compiled `graph.json` — honest about
what's actually tooled today versus what the framework aspires to.

## 4. Spec types

| Type | Answers |
|---|---|
| `thesis` | Why are we building this? |
| `experience` | What does the user see, understand, do? |
| `domain` | What things actually exist? (framework-agnostic) |
| `behavior` | What happens when something changes? |
| `contract` | How can another part of the system depend on this safely? |
| `acceptance` | How will we prove this works? |
| `slice` | The bounded implementation assignment — the unit of agentic work. |

## 5. Complexity router

Not everything needs the full ladder.

- **PATCH** (copy tweak, spacing, icon swap) → Intent + Acceptance + Slice. Don't manufacture architecture for a button color.
- **FEATURE** (new scheduling behavior, new roles, a new dashboard workflow) → Intent + Experience + Domain + Behavior + Contract + Acceptance + Slice.
- **SYSTEM** (consensus engine, auth, calendar sync, billing) → full ladder plus explicit failure modes, observability, security, migration, rollback, performance.

## 6. Semantic compression

Before writing anything, find the smallest durable concept that explains
the request.

> "rolling dates, fixed dates, specific days, blackouts, weekends, notice
> periods" → **SchedulingPolicy**

> "required people, decision maker, optional people" → **ParticipantRole**
> (not three separate features)

The question to ask explicitly: *is this a new feature, or a new
manifestation of a domain primitive that already exists?* This happens
before any database design or component generation — get the noun right
before designing its controls.

## 7. The no-code gate

A FEATURE or SYSTEM slice cannot go to an implementation agent until:

```
FORGE GATE — <name>

Domain       <PASS | FAIL | N/A (why)>   Can the concept be named?
State        <PASS | FAIL | N/A (why)>   Do we understand its lifecycle?
Rules        <PASS | FAIL | N/A (why)>   Do we know what may/may not happen?
Contract     <PASS | FAIL | N/A (why)>   Are its boundaries defined?
Acceptance   <PASS | FAIL | N/A (why)>   Can correctness be demonstrated?

READY FOR IMPLEMENTATION | IMPLEMENTATION BLOCKED
```

`N/A` is allowed; an unrecorded reason is not. §14 applies this gate to
every real system in this repo.

## 8. Roles (cognitive, not necessarily separate agents)

- **Product** — why, for whom, what outcome, what's explicitly out of scope. Cannot write production code.
- **Modeling** — semantic compression, domain concepts, state machines, invariants. Its job is finding the right abstraction, not the right component.
- **Architecture** — contracts, APIs, persistence, boundaries, migration. Cannot silently change product meaning to make implementation easier — a conflict there gets escalated, not resolved in code.
- **Implementation** — receives a bounded slice, may only touch `allowed_scope` unless a discovered dependency makes the work impossible (§10 — that's an escalation, not an improvisation).
- **Verification** — asks "does this conform to the declared graph?", not "does this look good?"

## 9. Implementation slice — the actual unit of work

```yaml
kind: slice
id: WEN-014
goal: Introduce Rolling Window scheduling.
why: Organizers need a dynamic horizon, not just a fixed date pair.
requires: [scheduling-policy.domain, scheduling-policy.behavior, scheduling-policy.contract]
allowed_scope: [SchedulingWindowStep, scheduling policy engine, migration, policy tests]
protected_scope: [consensus/readiness engine, participant roles, calendar OAuth, share-token auth]
invariants:
  - existing responses survive a policy change
  - timezone stays explicit through every calculation
  - candidate dates are derived, never persisted as availability
acceptance:
  - rolling windows support 1-200 days
  - inactive weekdays are excluded
  - blackouts remove exactly the dates they cover, nothing else
```

An implementation agent receives this, not the entire product history.

## 10. Change impact analysis

When a parent spec changes, trace the graph before touching code:

```
CHANGE: SchedulingPolicy blackout semantics
              ↓
Behavior Spec             STALE
API Contract               REVIEW
Wizard UI                  REVIEW
Acceptance Tests           STALE
Readiness/Consensus Engine UNAFFECTED
Clerk Auth                 UNAFFECTED
```

This is the check that prevents "I changed the date picker and somehow
broke readiness."

## 11. Change classification

- **Non-destructive** — meaning unchanged (meeting title edited).
- **Recomputational** — stored inputs still valid, derived values need recalculating (required participant added → responses survive, engine reruns).
- **Partially invalidating** — only the affected slice becomes invalid (a specific date removed → only that date's responses are affected, not the whole meeting).
- **Destructive** — meaning changes fundamentally (timezone changed after responses already exist). Requires an explicit migration or confirmation step, never a silent reinterpretation.

## 12. Spec lifecycle states

```
DRAFT → MODELED → CONTRACTED → APPROVED → IMPLEMENTING → VERIFIED → SHIPPED
```

Plus: `STALE`, `SUPERSEDED`, `DEPRECATED`, `BLOCKED`. Code should never
silently outrun its own spec's state — if the code is ahead, the spec is
STALE and that's recorded, not ignored.

## 13. Repository structure (this repo)

```
.forgeos/
  FORGE.md              this file
  graph.md              current domain status — the honest spec graph
  specs/
    00-product/         thesis
    02-domain/          durable concepts
    06-slices/          bounded work orders (as they're cut)
    07-decisions/        ADRs
```

No `06-slices` or `07-decisions` entries exist yet for work already
shipped — those get backfilled only if revisiting that work, not
retroactively invented for its own sake. Going forward, a FEATURE or
SYSTEM change gets a slice file before implementation starts.

## 14. Interface (target, not yet tooled)

The intended surface is small:

```
forge ingest              — turn a conversation/PRD/screenshot into intent
forge model                — semantic compression, propose domain primitives
forge spec                 — generate/update the required spec artifacts
forge graph                — show dependencies
forge gate <name>          — evaluate readiness for implementation
forge slice                — produce the next bounded work order
forge impact <concept>     — blast-radius report
forge drift                — find code != spec
```

None of this is built as a CLI today. This repo currently practices the
*discipline* by hand (this file, `graph.md`, the gate applied in §14 of
that file) without the automation. That gap is itself tracked honestly
rather than pretended away.

## 15. Ten principles

1. Intent precedes implementation.
2. Find the domain primitive before designing its controls.
3. Behavior belongs in explicit rules, not incidental UI code.
4. Contracts define ownership.
5. Invariants outrank implementation convenience.
6. Implementation work must be bounded.
7. Agents receive minimum sufficient context, not the whole repo.
8. Changes propagate through the dependency graph, not by memory.
9. Verification means conformance to the declared spec, not aesthetic review.
10. When ambiguity appears, move up the ladder — don't guess downward into code.
