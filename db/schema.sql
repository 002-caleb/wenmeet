-- WenMeet — Supabase schema.
-- Applied whenever DATA_STORE=supabase (required for every production
-- deployment; the in-memory NebulaStore does not persist across
-- Netlify Functions cold starts — see README and PRD §15).

create extension if not exists "pgcrypto";

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  timezone text not null
);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizer_id uuid not null references participants(id),
  window_start_utc timestamptz not null,
  window_end_utc timestamptz not null,
  decision_dependent boolean not null default false,
  status text not null default 'collecting'
    check (status in ('collecting', 'ready', 'no_valid_slot', 'locked', 'needs_rescheduling')),
  proposed_slot_start_utc timestamptz,
  proposed_slot_end_utc timestamptz,
  current_snapshot_id uuid,
  created_at timestamptz not null default now()
);

-- §4: participant_roles is many-to-many. A meeting can have zero, one,
-- or multiple KDMs; a participant can hold more than one role on the
-- same meeting (e.g. required + kdm).
create table if not exists participant_roles (
  participant_id uuid not null references participants(id),
  meeting_id uuid not null references meetings(id),
  role text not null check (role in ('organizer', 'required', 'kdm', 'optional')),
  primary key (participant_id, meeting_id, role)
);

create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id),
  participant_id uuid not null references participants(id),
  -- slots stored as an array of {startUtc, endUtc} in UTC, always.
  slots jsonb not null default '[]',
  status text not null default 'submitted'
    check (status in ('submitted', 'needs_confirmation', 'confirmed')),
  submitted_timezone text not null,
  updated_at timestamptz not null default now(),
  -- Monotonic counter incremented on every upsert. Snapshot staleness
  -- checks (§7) compare this, not updated_at — two upserts landing in
  -- the same instant would otherwise be indistinguishable.
  version int not null default 1,
  unique (meeting_id, participant_id)
);

-- §12: a participant waived from one specific meeting only. Their
-- global role (participant_roles) is untouched by this table.
create table if not exists waivers (
  meeting_id uuid not null references meetings(id),
  participant_id uuid not null references participants(id),
  waived_by uuid not null references participants(id),
  waived_at timestamptz not null default now(),
  waived_reason text not null,
  primary key (meeting_id, participant_id)
);

-- §7: frozen snapshot per scheduling run, retained for organizer
-- visibility of automatic recalculation (soft-capped at 2 retries; the
-- cap is visibility-only and never blocks the T-24h auto-lock).
create table if not exists scheduling_snapshots (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id),
  created_at timestamptz not null default now(),
  participant_role_ids uuid[] not null default '{}',
  availability_version jsonb not null default '{}', -- participant_id -> availability.version used
  result jsonb not null, -- { slot: {...} | null, reason?: string }
  retry_count int not null default 0,
  retry_cap_exceeded boolean not null default false
);

alter table meetings
  add constraint meetings_current_snapshot_fk
  foreign key (current_snapshot_id) references scheduling_snapshots(id)
  deferrable initially deferred;

create index if not exists idx_participant_roles_meeting on participant_roles(meeting_id);
create index if not exists idx_availability_meeting on availability(meeting_id);
create index if not exists idx_snapshots_meeting on scheduling_snapshots(meeting_id);
