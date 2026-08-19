-- Meeting details captured by the creation wizard.
--
-- duration_minutes previously did not exist at all: the old create form
-- collected a duration and silently discarded it. Existing rows are
-- backfilled to 30, which is what that form defaulted to.
--
-- location_kind / location_detail record how the meeting happens. WenMeet
-- does not generate Meet or Teams links yet, so this stores the organizer's
-- intent, not a provisioned conference.

alter table meetings add column if not exists duration_minutes int not null default 30;

alter table meetings add column if not exists location_kind text
  check (location_kind in ('google_meet', 'teams', 'custom_link', 'phone', 'in_person', 'undecided'));

alter table meetings add column if not exists location_detail text;

-- Advisory only — nothing closes a meeting when this passes. It exists so
-- the organizer can state urgency and participants can see it.
alter table meetings add column if not exists response_deadline_utc timestamptz;
