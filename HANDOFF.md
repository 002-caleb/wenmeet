# WenMeet — Handoff Summary

Status as of this session. Written for whoever picks this up next — human or agent.

## Live right now

- **Production:** [wenmeet.conscience.fund](https://wenmeet.conscience.fund) — Netlify site `wenmeet-demo`, custom domain on Netlify-managed DNS (auto SSL, auto DNS record, no manual registrar step needed).
- **Repo:** [github.com/ghettoeinstein/wenmeet](https://github.com/ghettoeinstein/wenmeet), `main` branch. Was previously untracked inside a home-directory-wide git repo — it's now its own standalone repo scoped to this folder only.
- **Local dev:** `npm install && npm run dev` → [http://localhost:3000](http://localhost:3000).

⚠️ **Production data does not persist.** `DATA_STORE=memory` (the default) resets on every Netlify Functions cold start. Meetings, participants, and calendar connections created on the live demo can vanish between requests. Local dev is fine — one persistent process. Wiring `DATA_STORE=supabase` (schema already written, see below) is the top infrastructure gap.

## What WenMeet is

Deterministic meeting scheduling: pick your times, share one link, WenMeet finds the overlap. No LLM in the scheduling path — rules-based overlap of required/decision-maker/optional attendees, timezone-safe, with a T-24h auto-lock and rescheduling/waiver handling. Full narrative in [README.md](README.md).

## Product/UX contracts (read these before touching customer-facing code)

Three docs in `docs/` are canonical — they govern copy, routing, and UX decisions, not just this session's choices:

- **[docs/FRONTEND_PRODUCT_SYSTEM.md](docs/FRONTEND_PRODUCT_SYSTEM.md)** — the big one. Forbidden terminology (no "PRD", "scaffold", "unit tested", raw enum names, etc. in customer-facing UI), copy rules, visual density rules, landing-page architecture, acceptance checklists. `npm run lint:copy` enforces the terminology rule automatically — **run it before shipping any customer-facing change**.
- **[docs/AVAILABILITY_CONTEXT_AND_DATE_NAV.md](docs/AVAILABILITY_CONTEXT_AND_DATE_NAV.md)** — the participant availability screen's contract (one question, real dates, timezone as a compact pill, busy/past-time handling).
- **[docs/AUTHENTICATED_APP_SHELL_ROUTING.md](docs/AUTHENTICATED_APP_SHELL_ROUTING.md)** — marketing (`/`) vs. authenticated app (`/app/**`) separation rules.

## What's built and real (not stubbed)

### Domain logic (pre-existing, untouched this session)
Participant roles, readiness gating, deterministic overlap engine, T-24h lock, versioned scheduling snapshots, rescheduling/waivers, timezone-change correction. All covered by `tests/` (20 tests, `npm test`).

### Landing page (`src/app/page.tsx`)
Full marketing page: hero with GSAP entrance animation + interactive availability-grid mockup, Share-one-link, How It Works, roles comparison, calendar/meeting-type integrations, timezone section, use-cases, trust section, final CTA. Demo names in the mockup are `Aman`, `Cindy`, `Brad` (explicitly chosen by the user — an earlier pass had accidentally used real team members' names, which is exactly the kind of internal-identity leak `FRONTEND_PRODUCT_SYSTEM.md` §17/§22 warns about).

### Auth (Clerk)
`@clerk/nextjs@6.39.6` — pinned to the last major supporting Next.js 14 (the current `7.x` line requires Next 15/16; upgrading Next wasn't in scope). Sign-in/sign-up pages, nav controls (`SignedIn`/`SignedOut`), `next`-param-preserving redirect (validated against open-redirect in `src/lib/auth/safeNext.ts`).

### Authenticated app shell (`src/app/app/`)
- `middleware.ts`: authenticated `/` → `/app` redirect (server-side, no flash); `/app/**` requires auth.
- `/app` layout: separate nav (Meetings, Calendars, + New WenMeet, UserButton) — no marketing links, per the routing PRD.
- `/app` home + `/app/meetings`: show the *real* meetings the signed-in organizer created (empty state if none — never fabricated data).
- `/app/new`: a real form — actually calls `POST /api/meetings` and creates a meeting.
- `/app/settings`: honest stub, not built.

### Clerk ↔ Participant identity bridge
`src/lib/auth/currentParticipant.ts` — `getOrCreateCurrentParticipant()` find-or-creates a `Participant` record keyed on `clerkUserId`, runs on every `/app` visit. `POST /api/meetings` now derives `organizerId` from the Clerk session server-side instead of trusting it from the request body — this closed a real impersonation hole that existed in the original scaffold (anyone could POST as any `organizerId`).

### Google Calendar (real OAuth, real API calls)
- `src/lib/calendar/googleOAuth.ts` — authorize URL, code exchange, token refresh, freebusy query, account-email lookup, all against Google's real endpoints.
- `/api/auth/google/{authorize,callback}` — CSRF-protected via a short-lived httpOnly state cookie.
- `GoogleCalendarProvider` (`src/lib/calendar/providers.ts`) — `getBusyBlocks` is real, refreshes an expired access token transparently.
- Scopes requested: `calendar.readonly`, `userinfo.email` (read-only; no event-creation scope yet).
- Credentials are real, live in `.env.local` (gitignored) and Netlify env vars — `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`.
- **The Google Cloud OAuth app is in "Testing" mode** — only emails added under Test users can complete the consent screen. `calebsaunders@gmail.com` is added.

### Microsoft Outlook (real OAuth, real API calls)
Same shape as Google, against Microsoft Graph:
- `src/lib/calendar/microsoftOAuth.ts`, `/api/auth/microsoft/{authorize,callback}`, `MicrosoftCalendarProvider`.
- Scopes: `Calendars.Read`, `offline_access`, `User.Read`. Uses the `common` tenant endpoint (app registration allows both work/school and personal Microsoft accounts).
- Credentials in `.env.local` / Netlify env vars — `MICROSOFT_OAUTH_CLIENT_ID` / `MICROSOFT_OAUTH_CLIENT_SECRET`.
- **Not yet tested end-to-end** — credentials were just set up this session; nobody has clicked through the Microsoft consent screen yet.

### `/app/calendars`
Real "Connect" links for both providers, real "Connected ✓" state (checked against the store, not a hardcoded boolean).

## In progress / known gaps (exactly where this session left off)

1. **`CalendarConnection.accountEmail`** was just added to the type (so the UI can show *which* Google/Outlook account is connected — a user asked "is that my calendar?" and the honest answer was no, it wasn't wired yet). Both OAuth callbacks now fetch and store it. `db/schema.sql` updated to match. **Not yet surfaced in any UI** — `/app/calendars` still just shows "Connected ✓" without the email.
2. **The participant availability screen (`/meetings/[id]/availability`) still shows fake data.** `calendarConnected` is a hardcoded `useState(true)`, and the busy cells (`BUSY` constant) are a hardcoded mock `Set`, not real calendar data. This is the screen a user was looking at when they asked "is that my calendar" — it isn't yet. `src/lib/calendar/aggregateBusy.ts` (new this session) merges busy blocks across every connected provider, tagged by source (`google`/`microsoft`) — this is the piece meant to replace the mock, **but it isn't wired into the page yet.**
3. **Still needed to finish that wiring:**
   - `/api/me/calendars` and `/api/me/busy` routes (or equivalent) so the client-side availability page can fetch real per-participant data.
   - `AvailabilityGrid` needs its `busy` prop to carry *which provider* a slot came from (currently just a `Set<string>` with no source), so highlighting can show "Google" vs. "Outlook" distinctly — this was the other half of the ask ("highlighting should show which calendar... a user should be able to have 2-3 calendars").
   - `CalendarStatus`/the availability page's connected-indicator needs to show multiple provider badges, not one generic boolean.
4. **Dead button:** "Add WenMeet to your calendar" on the availability confirmation screen has no `onClick` — it was always a placeholder per the original UX spec ("Optional") but currently looks clickable while doing nothing. Needs to be disabled/labeled honestly, or wired to a real calendar-event-creation call (would need a write scope neither OAuth app currently requests).
5. **Organizer flow is partial.** `/app/new` creates a meeting with only the organizer as a participant — no UI yet for inviting other participants/assigning roles, generating a share link, the organizer "meeting room" (readiness/best-time view), or booking. The domain logic for all of this exists (`src/lib/scheduling/`) and is tested; only the UI is missing.
6. **No event-creation (write) scope** requested for either Google or Microsoft — both are read-only free/busy today. Creating the actual calendar event + Meet/Teams link at booking time needs broader scopes and new code.

## Environment / credentials inventory

All real, live values — **only in `.env.local` (gitignored) and Netlify's env vars, never committed:**

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk auth (test-mode keys) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`/`SIGN_UP_...` | Both set to `/app` (never `/`, per the routing PRD) |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Google Calendar OAuth app (Testing mode) |
| `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET` | Microsoft Entra app registration (multi-tenant + personal accounts) |
| `DATA_STORE` | `memory` (default) or `supabase` — production needs `supabase` + `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, neither provisioned yet |

Netlify account: team `a-shefedin`, logged in as Aman Shefedin. `conscience.fund` DNS is fully Netlify-managed (Netlify is also the registrar).

## Tooling added this session

- `npm run lint:copy` (`scripts/lint-product-copy.mjs`) — scans `src/app`/`src/components` (skipping comments and `/api`) for the forbidden-terminology list from `FRONTEND_PRODUCT_SYSTEM.md` §4/§66. Run this alongside `npx tsc --noEmit` and `npm test` before considering any customer-facing change done.
- Clerk CLI + Netlify CLI installed and authenticated locally.
- Netlify + Clerk agent-skill docs installed under `.claude/skills/` and `.agents/` — gitignored (tooling artifacts, not app code).

## Recommended next steps, in order

1. Finish wiring real calendar data into `/meetings/[id]/availability` (item 2-3 above) — the aggregation helper already exists, it just needs the API routes + grid changes to consume it.
2. Fix or disable the dead "Add to calendar" button.
3. Test the Microsoft OAuth flow end-to-end (nobody has yet).
4. Decide on Supabase provisioning — production data loss on every cold start is the biggest real risk to demoing this live.
5. Build the rest of the organizer flow (invite participants, share link, meeting room, booking) — the domain logic is ready and tested; only UI is missing.
