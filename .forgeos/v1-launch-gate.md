# WenMeet v1 Launch Gate

Applying FORGE.md §7 to each real system. This is the direct assessment —
not a status update written to reassure, a reading of what's actually
true against the code, the tests, and what I could independently verify
in production today.

---

## Gate results

| System | Domain | State | Rules | Contract | Acceptance | Verdict |
|---|:-:|:-:|:-:|:-:|:-:|---|
| Meeting lifecycle | PASS | PASS | PASS | PASS | PASS | **READY** |
| Participant roles | PASS | PASS | PASS | PASS | PARTIAL | **READY**, with a known simplification |
| Scheduling policy | PASS | PASS | PASS | PASS | PASS | **READY** |
| Share link / respond | PASS | PASS | PASS | PASS | PASS | **READY** |
| Workspace dashboard | PASS | PASS | PASS | PASS | PASS | **READY** |
| Creation wizard | PASS | PASS | PASS | PASS | PARTIAL | **READY**, with one known loss case |
| Calendar connection | PASS | PARTIAL | FAIL | PARTIAL | FAIL | **BLOCKED for its full promise** |
| Booking / write-back | FAIL | FAIL | FAIL | FAIL | FAIL | **NOT MODELED — not a v1 gap, a deliberate non-goal** |
| Notifications | FAIL | FAIL | FAIL | FAIL | FAIL | **NOT MODELED** |
| Production infra | — | — | — | — | — | **1 critical incident found + fixed today; 1 open item remains (CD)** |

Detail on each PARTIAL/FAIL follows. Nothing above is fabricated for the
scorecard — every PARTIAL/FAIL cites the specific code path that's
missing.

---

## Participant roles — Acceptance: PARTIAL

**Why not PASS:** the product story is "Required, Decision-maker, and
Optional behave differently." The code today has Required and
Decision-maker behaving **identically** — both hard-gate readiness, both
block scheduling until answered. There is no test, and no code path, that
distinguishes them. This is disclosed in `statusCopy.ts` rather than
hidden, which is why the gate isn't a hard FAIL — but a v1 launch
claiming role-awareness as the differentiator should either (a) ship a
real behavioral difference (e.g., KDM veto, KDM-only re-open on decline)
or (b) soften the marketing claim to match what's actually built.

## Creation wizard — Acceptance: PARTIAL

**Why not PASS:** wizard state is client-only. A browser refresh,
accidental back-navigation, or an auth redirect mid-wizard loses
everything typed. For a 5-step flow this is a real abandonment risk, not
a cosmetic one.

## Calendar connection — BLOCKED for its full promise

This is the largest gap in the repo relative to what the product claims.

- **Domain: PASS.** `CalendarConnection` is real, OAuth is real.
- **State: PARTIAL.** Tokens are stored and refreshed; there's no
  reconnect-on-expiry UX, no visible "this connection is broken" state
  anywhere in the product (dashboard, wizard, or detail page).
- **Rules: FAIL.** `aggregateBusy.ts` — the actual "merge Google + Microsoft
  busy blocks" logic — exists and is presumably functional in isolation,
  but **nothing in the codebase calls it**. The scheduling engine has zero
  visibility into anyone's real calendar. "Connect Google Calendar so
  WenMeet reads your free/busy automatically," which the wizard's
  Availability step literally says, is not true of what happens next.
- **Contract: PARTIAL.** The interface exists (`getBusyBlocksBySource`);
  nothing consumes it.
- **Acceptance: FAIL.** There is no test anywhere that a connected
  calendar changes a scheduling outcome, because it doesn't yet.

This is the single highest-leverage gap to close before calling calendar
integration a v1 feature rather than a v1 *stub with real OAuth
plumbing behind it*.

## Booking / calendar write-back — not modeled, and that's fine for v1

No domain spec exists because the product has never claimed to write
back to calendars. The wizard's "Meeting type" step honestly records
intent, not a provisioned conference. This is a legitimate v2 line, not a
gap to close before launch — flagging it here only so it's a decision on
record, not an oversight.

## Notifications — not modeled

No email, no webhook, anywhere. An organizer discovers a response only by
reloading the dashboard or detail page. Given the product's own pitch is
partly "share a link and let people respond asynchronously," the absence
of *any* notification (even a plain email on response) is a real gap for
how useful the async promise actually is in practice.

## Production infrastructure

- **Fixed today:** `DATA_STORE` scope incident (see `graph.md`). Confirmed
  end-to-end with a real UUID and an independent `curl` check — not just
  "should be fixed now."
- **Still open:** the Netlify site is **not connected to GitHub**. Every
  deploy is a manual `netlify deploy --build --prod` from a local
  machine. A push to `main` does nothing on its own. This is a process
  gap, not a code gap, but it's exactly the kind of thing that causes
  production to silently drift a day (or a session) behind what's
  committed — which is precisely what happened earlier in this project.
- **DNS is now code** (`infra/dns.json` + `scripts/infra-dns.mjs`),
  applied and verified. Clerk's production keys are staged in Netlify but
  intentionally **not** switched on — its TLS certificate for
  `clerk.conscience.fund` was still not issuing as of this session.

---

## Suggested next steps, in priority order

1. **Connect the Netlify site to GitHub.** Ten minutes of dashboard work,
   removes the single biggest source of "production doesn't match what's
   committed" risk. Everything else on this list matters less if deploys
   stay manual and easy to forget.

2. **Wire `aggregateBusy.ts` into the scheduling engine.** This is the
   real gap behind the product's second-biggest claim (role-awareness is
   the first). Concretely: readiness/resolution should treat a connected
   calendar's busy blocks as implicit unavailability, the same way an
   explicit "unavailable" slot works today. Needs its own FEATURE-level
   slice — domain, behavior, contract, acceptance — not just plumbing the
   existing function in.

3. **Decide what Decision-maker actually means**, then either implement
   the difference or adjust the wizard/landing copy to stop implying one
   exists. Whichever direction, it should be a recorded decision (an ADR
   in `graph.md`), not left ambiguous going into launch.

4. **Wizard draft persistence** — at minimum, session-storage the draft
   so a refresh or an auth redirect doesn't erase five steps of input.
   Server-side draft state (a real `Draft` lifecycle stage) is a larger
   lift; session storage is the cheap 80% fix.

5. **Some notification, even a minimal one.** A plain email on "someone
   responded" would materially change how usable the share-link flow is
   in practice, and there's no domain spec for it yet — worth a PATCH-or-
   FEATURE-level slice depending on how deep it goes (transactional email
   provider needs choosing).

6. **Once Clerk's cert is live:** flip the staged `pk_live_`/`sk_live_`
   keys on and redeploy. Nothing else blocks this switch today.

7. **Delete-meeting endpoint.** Doesn't exist. Low urgency, but worth
   noting since production now has a real, permanent, undeletable test
   row (`DB Persistence Verify`) sitting in it from today's verification
   pass.

None of the above block a v1 launch in the sense of "the app is broken."
They're the difference between "the core scheduling promise works and is
honestly represented" (true today) and "the two headline differentiators
— role-awareness and calendar-native scheduling — are fully real, not
partially real." That's a product call, not an engineering one.
