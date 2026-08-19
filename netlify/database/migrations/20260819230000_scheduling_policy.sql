-- Scheduling policy: a search space, not two dates.
--
-- Explicit columns rather than one opaque JSON blob, so the policy stays
-- queryable, validatable at the database level, and migratable. Only the two
-- naturally variable collections (specific dates, blackout ranges) use JSON,
-- because their cardinality is genuinely unbounded.
--
-- Existing meetings keep working: they are backfilled as fixed ranges from
-- the window they already have, which is exactly what they meant.

alter table meetings add column if not exists range_type text
  check (range_type in ('rolling', 'fixed', 'specific'));

-- Rolling only.
alter table meetings add column if not exists range_amount int;
alter table meetings add column if not exists range_unit text
  check (range_unit in ('days', 'weeks', 'months'));

-- Fixed only. Stored as calendar dates, not instants: "Monday" and a
-- blackout date are local-calendar concepts, and pinning them to a UTC
-- instant would shift them across a DST change.
alter table meetings add column if not exists range_start_date date;
alter table meetings add column if not exists range_end_date date;

-- The timezone every date semantic is evaluated in. IANA id, never an
-- offset — an offset cannot survive DST.
alter table meetings add column if not exists scheduling_timezone text;

-- 0 = Sunday … 6 = Saturday.
alter table meetings add column if not exists active_weekdays int[] not null default '{1,2,3,4,5}';

alter table meetings add column if not exists minimum_notice_minutes int not null default 0;

-- Unbounded collections.
alter table meetings add column if not exists specific_dates jsonb not null default '[]';
alter table meetings add column if not exists blackout_ranges jsonb not null default '[]';

-- Backfill: every pre-existing meeting was a fixed window.
update meetings
   set range_type = 'fixed',
       range_start_date = (window_start_utc at time zone 'UTC')::date,
       range_end_date = (window_end_utc at time zone 'UTC')::date
 where range_type is null;

-- Older rows predate an explicit timezone; UTC is what they were actually
-- evaluated in, so recording that is accurate rather than a guess.
update meetings set scheduling_timezone = 'UTC' where scheduling_timezone is null;

alter table meetings alter column range_type set not null;
alter table meetings alter column scheduling_timezone set not null;

-- max_meetings_per_day is deliberately absent. The engine does not evaluate
-- organizer calendar events against a daily cap, and shipping an inert
-- control would be worse than not offering it.
