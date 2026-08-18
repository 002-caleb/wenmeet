# WenMeet — Handoff Summary

Status as of this session. Written for whoever picks this up next — human or agent.

## Live right now

- **Production:** [wenmeet.conscience.fund](https://wenmeet.conscience.fund) — Netlify site `wenmeet-demo`, custom domain on Netlify-managed DNS (auto SSL, auto DNS record).
- **Repo:** [github.com/ghettoeinstein/wenmeet](https://github.com/ghettoeinstein/wenmeet), `main` branch.
- **Local dev:** `npm install && npm run dev` → [http://localhost:3000](http://localhost:3000).
- **Data layer:** Netlify Database (managed Postgres) in production and deploy previews, in-memory store for plain local `next dev`. See "Persistence" below — this is a real change from earlier in this project's life (it briefly targeted Supabase; that's gone now).

## What WenMeet is

Deterministic meeting scheduling: pick your times, share one link, WenMeet finds the overlap. No LLM in the scheduling path — rules-based overlap of required/decision-maker/optional attendees, timezone-safe, with a T-24h auto-lock and rescheduling/waiver handling. Full narrative in [README.md](README.md).

## Product/UX contracts (read before touching customer-facing code)

Four docs in `docs/` are canonical — they govern copy, routing, and product decisions, not just past sessions' choices:

- **[docs/PRD_V3.md](docs/PRD_V3.md)** — the current full product spec, supersedes v2 where they conflict. The most important open conflict: it specifies a much richer meeting/availability state machine (10 meeting states, 7 availability states) than what's actually implemented (5 and 3 respectively) — not yet reconciled, see "Known gaps" below.
- **[docs/FRONTEND_PRODUCT_SYSTEM.md](docs/FRONTEND_PRODUCT_SYSTEM.md)** — forbidden terminology (no "PRD", "scaffold", raw enum names, etc. in customer-facing UI), copy rules, visual density rules, acceptance checklists. `npm run lint:copy` enforces the terminology rule — **run it before shipping any customer-facing change.**
- **[docs/AVAILABILITY_CONTEXT_AND_DATE_NAV.md](docs/AVAILABILITY_CONTEXT_AND_DATE_NAV.md)** — the participant availability screen's contract.
- **[docs/AUTHENTICATED_APP_SHELL_ROUTING.md](docs/AUTHENTICATED_APP_SHELL_ROUTING.md)** — marketing (`/`) vs. authenticated app (`/app/**`) separation rules.

## What's built and real (not stubbed)

### Domain logic
Participant roles, readiness gating, deterministic overlap engine, T-24h lock, versioned scheduling snapshots, rescheduling/waivers, timezone-change correction. Covered by `tests/` — 7 test files, 26 tests, `npm test`.

### Persistence — Netlify Database
- `src/lib/store/NetlifyDatabaseStore.ts` — full `NebulaStore` implementation using `@netlify/database`'s raw SQL client (not Drizzle — kept simple, no ORM dependency).
- Schema lives in `netlify/database/migrations/20260818200113_initial_schema.sql` — applied automatically by Netlify on every deploy (production and preview branches each get their own isolated database).
- **Verified for real**, not just typechecked: `tests/netlifyDatabaseStore.test.ts` runs all 18 store methods against an actual ephemeral Postgres instance (via `@netlify/database-dev`'s `NetlifyDB` harness), asserting on real round-tripped rows — jsonb fields, `uuid[]` arrays, upsert-with-version-increment, ON CONFLICT idempotency, all confirmed working.
- `DATA_STORE` env var: `"memory"` (default, plain `next dev`) or `"netlify"` (production + deploy-preview contexts, set in `netlify.toml`).
- **Not yet verified end-to-end on the live site** — I can't sign in myself to test it (that's a "you do it" boundary, not a technical one). Please sign in on the live site, create a meeting, refresh the page, and confirm it's still there.

### Auth (Clerk)
`@clerk/nextjs@6.39.6` — pinned to the last major supporting Next.js 14 (the `7.x` line requires Next 15/16). Sign-in/sign-up, nav controls, `next`-param-preserving redirect (validated against open-redirect in `src/lib/auth/safeNext.ts`).

### Authenticated app shell (`src/app/app/`)
- `middleware.ts`: authenticated `/` → `/app` redirect (server-side, no flash); `/app/**` requires auth.
- Separate nav (Meetings, Calendars, + New WenMeet, UserButton, active-route highlighting) — no marketing links.
- `/app` home + `/app/meetings`: show the organizer's *real* created meetings (empty state if none).
- `/app/new`: a real form — calls `POST /api/meetings` and creates a meeting.
- `/app/settings`: honest stub, not built.

### Clerk ↔ Participant identity bridge
`src/lib/auth/currentParticipant.ts` — find-or-creates a `Participant` keyed on `clerkUserId`, runs on every `/app` visit. `POST /api/meetings` derives `organizerId` from the Clerk session server-side (closed a real impersonation hole that existed in the original scaffold — anyone could previously POST as any `organizerId`).

### Calendar integrations — both real now
- **Google**: `src/lib/calendar/googleOAuth.ts`, `/api/auth/google/{authorize,callback}`, `GoogleCalendarProvider`. Scopes: `calendar.readonly`, `userinfo.email`. The Google Cloud OAuth app is in "Testing" mode — only emails on the Test users list can complete consent (`calebsaunders@gmail.com` is added). Verified end-to-end by the user this session.
- **Microsoft**: `src/lib/calendar/microsoftOAuth.ts`, `/api/auth/microsoft/{authorize,callback}`, `MicrosoftCalendarProvider` (Microsoft Graph, `common` tenant endpoint — supports both work/school and personal accounts). Scopes: `Calendars.Read`, `offline_access`, `User.Read`. **Not yet tested end-to-end** — credentials were set up this session but nobody has clicked through the Microsoft consent screen yet.
- Both store a `CalendarConnection.accountEmail` — captured at OAuth callback time — so the UI can show *which* account is connected, not just a generic "Connected" badge. `/app/calendars` shows real per-provider connect/connected state for both.
- `src/lib/calendar/aggregateBusy.ts` — merges busy blocks across every connected provider, tagged by source (`google`/`microsoft`). **Built but not wired into any UI yet.**

### Visual design
Redesign audit applied (see the `redesign-existing-projects` skill): Inter → Outfit font, removed the blue/purple/cyan gradient (replaced with a monochromatic blue treatment), added `:focus-visible` states, skip-to-content link, smooth scroll, `text-wrap: balance`, tabular numerals, active nav-link highlighting, a real branded favicon (`src/app/icon.tsx`, generated via `next/og`), and a branded 404 page.

## Known gaps (in priority order)

1. **The participant availability screen (`/meetings/[id]/availability`) still shows mock data.** `calendarConnected` and the `BUSY` set are hardcoded — not real per-participant calendar data, even though the underlying capability (`aggregateBusy.ts`) is real and built. Wiring this in is the natural next step: needs a couple of API routes (e.g. `/api/me/calendars`, `/api/me/busy`) the client-side page can fetch, plus updating `AvailabilityGrid`'s `busy` prop to carry *which* provider a slot came from so highlighting can show "Google" vs. "Outlook" distinctly (a user explicitly asked for this: "highlighting should show which calendar").
2. **Dead button, mostly fixed:** "Add WenMeet to your calendar" is now disabled with a tooltip instead of silently doing nothing — still not wired to anything real (would need a write scope neither OAuth app currently requests).
3. **Microsoft OAuth untested end-to-end.** Code is real and typechecked; nobody has actually clicked through the consent screen.
4. **PRD v3's expanded state machines aren't implemented.** `MeetingStatus` is 5 states today; PRD_V3 §47 specifies 10 (adds `draft/evaluating/proposed/scheduled/cancelled/completed`). `AvailabilityStatus` is 3 states; PRD_V3 wants 7 (adds `invited/joined/pending/declined`). This touches the scheduling engine and its existing tests — not a quick rename.
5. **Organizer flow is partial.** `/app/new` creates a meeting with only the organizer as a participant — no UI for inviting others/assigning roles, generating a share link, the organizer "room" (readiness/best-time view), or booking. Domain logic exists and is tested; only the UI is missing.
6. **No event-creation (write) scope** for either calendar provider — both are read-only free/busy. Booking → actually creating the calendar event + Meet/Teams link needs broader scopes and new code.
7. **Route structure still doesn't match PRD_V3 §36's canonical `/m/[shareToken]` scheme** — the app still uses `/meetings/[id]/availability`. Flagged multiple times across sessions, still not done — a real but contained rename/restructure.

## Environment / credentials inventory

All real, live values — **only in `.env.local` (gitignored) and Netlify's env vars, never committed:**

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk auth (test-mode keys) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`/`SIGN_UP_...` | Both `/app` (never `/`) |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Google Calendar OAuth app (Testing mode) |
| `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET` | Microsoft Entra app registration (multi-tenant + personal accounts) |
| `DATA_STORE` | `memory` (local default) or `netlify` (production/preview, set per-context in `netlify.toml`) |

No manual database connection string is needed — Netlify injects `NETLIFY_DB_URL` automatically once the database is provisioned (it was, on the deploy that shipped this).

Netlify account: team `a-shefedin`, logged in as Aman Shefedin. `conscience.fund` DNS is fully Netlify-managed (Netlify is also the registrar).

## Tooling

- `npm run lint:copy` (`scripts/lint-product-copy.mjs`) — scans `src/app`/`src/components` for forbidden terminology per `FRONTEND_PRODUCT_SYSTEM.md` §4/§66.
- Clerk CLI + Netlify CLI installed and authenticated locally.
- Netlify + Clerk agent-skill docs installed under `.claude/skills/` and `.agents/` — gitignored (tooling artifacts, not app code).
- `@netlify/database-dev` (devDependency) — spins up a real ephemeral Postgres for testing the store without needing `netlify dev` running.

## Recommended next steps, in order

1. Sign in on the live site, create a meeting, refresh — confirm Netlify Database persistence actually works end-to-end in production (I verified the migration applies cleanly and the store's SQL is correct against a real Postgres instance, but haven't verified the full authenticated round-trip live).
2. Test the Microsoft OAuth flow end-to-end.
3. Wire real calendar data into `/meetings/[id]/availability` (item 1 in Known Gaps) — `aggregateBusy.ts` already exists, it just needs API routes + grid changes to consume it.
4. Decide whether to take on PRD_V3's expanded state machines now or keep the current 5/3-state model a while longer — it's a real migration, not a quick edit.
5. Build the rest of the organizer flow (invite participants, share link, meeting room, booking).
