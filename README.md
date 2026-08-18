# WenMeet

Intelligent meeting coordination for Conscious Capital Brands. Formerly
"Nebula Habitats" — renamed per PRD v2. Product ownership: Caleb Pierre
(CTO). Original prototype: Elias.

This is a from-scratch V1 scaffold built directly against PRD v2's
resolved sections, so it does **not** carry over the older gaps the PRD
flagged in a prior build (retry-count locking, Google-only, static-only
availability with no live-sync seam). Where a full production
implementation needs infrastructure this scaffold doesn't have
(a provisioned Supabase project, real Google/Microsoft OAuth apps), that
piece is stubbed and clearly marked below — everything else is real,
working code with unit tests.

## What's implemented

- **§4 Participant roles** — `participant_roles` many-to-many
  (`src/lib/types.ts`, `db/schema.sql`). A meeting can have zero, one, or
  multiple KDMs; a participant can hold more than one role on the same
  meeting.
- **§6 Timezone correction after submission** — `src/lib/timezone/tzCorrection.ts`.
  A timezone change moves existing submissions to `needs_confirmation`
  without touching the stored UTC instants. `src/components/TimezoneConverter.tsx`
  is the "reason across zones without leaving the page" widget.
- **§7 Scheduling readiness & concurrency**:
  - Readiness gates only on Required + KDM, excludes waived participants,
    and treats `needs_confirmation` as blocking, not answered
    (`src/lib/scheduling/readiness.ts`).
  - T-24h auto-lock, time-based and not attempt-based
    (`src/lib/scheduling/lock.ts`).
  - Versioned snapshot scheduling with automatic recalculation when a
    Required/KDM participant's confirmed availability changes before
    lock, soft-capped at 2 retries for organizer-notification purposes
    only — the cap never blocks the eventual T-24h lock
    (`src/lib/scheduling/snapshot.ts`).
- **§12 Rescheduling & waivers**:
  - Before lock: no overlap → explicit "no valid slot" result, never a
    guess (`src/lib/scheduling/engine.ts`).
  - After lock: a Required/KDM decline moves the meeting to
    `needs_rescheduling` (`src/lib/scheduling/waiver.ts`).
  - `Waived` is a per-meeting record (`waived_by`, `waived_at`,
    `waived_reason`) that never touches the participant's global role
    (`db/schema.sql`, `src/lib/scheduling/waiver.ts`).
- **§15 Hosting** — Netlify via `@netlify/plugin-nextjs` (`netlify.toml`),
  plus an independent multi-stage `Dockerfile` with standalone Next.js
  output so the same image runs on Netlify, a container host, or locally.
  Data layer is built against the `NebulaStore` interface
  (`src/lib/store/NebulaStore.ts`) specifically because Netlify Functions
  are stateless with cold starts — nothing that must persist may live only
  in the in-memory store.

Run the test suite covering the above (readiness, engine overlap/no-slot,
T-24h lock, snapshot revalidation + soft-capped retries, waivers,
timezone correction):

```
npm install
npm test
```

## What's stubbed (flagged explicitly, not silently missing)

- **Supabase-backed `NebulaStore`** (`src/lib/store/SupabaseStore.ts`) —
  every method throws until a real Supabase project is provisioned and
  `db/schema.sql` applied. `DATA_STORE=memory` (default) uses
  `InMemoryStore` for dev/demo only; it does **not** persist across a
  Netlify Functions cold start. Every production deploy must set
  `DATA_STORE=supabase`.
- **Google + Outlook calendar sync** (`src/lib/calendar/`) — both are P0
  per PRD §20, and both are wired to the same `CalendarProvider`
  interface so neither is privileged, but the actual OAuth + live
  busy/free reads are not implemented. This means the "availability grid
  as a live source of truth" (PRD §12) — confirmed V1 scope but flagged
  in the PRD as a materially larger build — is **not** built yet; this
  scaffold implements statically painted/submitted availability only.
  `CalendarProvider.getBusyBlocks` is the seam where live sync plugs in
  without needing to touch the scheduling engine.
- **UI** — the API routes and domain logic are complete and tested; the
  participant-facing "paint a grid" interaction and the organizer
  dashboard are not built out beyond a minimal availability page with the
  timezone-converter widget (`src/app/meetings/[id]/availability/page.tsx`).
  Routes exist under `src/app/api/meetings/**` to drive everything
  programmatically in the meantime.

## Open questions this scaffold does not resolve

Per the PRD's own "Open Questions — Not Yet Resolved" section:

- KDM proxy assignment + live in-meeting voting — not built; needs a
  scope decision (V1 vs. P1/P2) before it's worth designing for.
- Shared calendar visibility between CEO/CTO — not built; needs a scope
  decision.
- Naming — the PRD's title block treats "WenMeet" as final and this
  scaffold is named accordingly, but flag for the team that the PRD's own
  Open Questions section listed this as unconfirmed. If it changes, the
  main rename surface is: `package.json` name/description, this README,
  `src/app/layout.tsx` metadata, and doc comments referencing "WenMeet".

## Architecture at a glance

```
src/lib/types.ts              domain model (Participant, Meeting, Availability, Waiver, ...)
src/lib/store/                NebulaStore interface + InMemoryStore + SupabaseStore (stub)
src/lib/scheduling/           readiness, overlap, engine, snapshot/lock, waiver
src/lib/timezone/             timezone-change → needs_confirmation, tz display conversion
src/lib/calendar/             CalendarProvider seam (Google/Outlook stubs)
src/app/api/**                REST-ish routes wiring the above together
src/app/**/page.tsx           minimal UI
db/schema.sql                 Supabase schema matching src/lib/types.ts
tests/**                      vitest coverage of every resolved PRD section above
```

## Deploying

- **Netlify**: connect the repo, `netlify.toml` handles the rest. Set
  `DATA_STORE=supabase` plus the Supabase and OAuth env vars from
  `.env.example` in the Netlify site's environment settings before going
  beyond internal demo use.
- **Docker**: `docker build -t wenmeet . && docker run -p 3000:3000 --env-file .env wenmeet`
