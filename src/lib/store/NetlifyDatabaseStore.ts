import { getDatabase } from "@netlify/database";
import type {
  Availability,
  CalendarConnection,
  Meeting,
  Participant,
  ParticipantRole,
  SchedulingSnapshot,
  Waiver,
} from "../types";
import type { NebulaStore } from "./NebulaStore";
import { DEFAULT_ACTIVE_WEEKDAYS, type SchedulingPolicy } from "../scheduling/policy";

// Row shapes are intentionally untyped (`any`) at the query boundary —
// the map* functions below are the single place that translates Postgres's
// snake_case / Date / jsonb-as-string quirks into the domain's camelCase,
// ISO-string, plain-object shape. Nothing outside this file should ever
// see a raw row.

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function parseJsonb<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

function mapParticipant(row: any): Participant {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    timezone: row.timezone,
    clerkUserId: row.clerk_user_id ?? undefined,
  };
}

/** Rebuilds the discriminated policy union from its explicit columns. */
function mapPolicy(row: any): SchedulingPolicy {
  if (row.range_type === "rolling") {
    return { type: "rolling", amount: row.range_amount ?? 14, unit: row.range_unit ?? "days" };
  }
  if (row.range_type === "specific") {
    return { type: "specific", dates: parseJsonb(row.specific_dates ?? []) };
  }
  return {
    type: "fixed",
    startDate: toDateKey(row.range_start_date),
    endDate: toDateKey(row.range_end_date),
  };
}

/** A DATE column arrives as a Date or a string; both must become YYYY-MM-DD. */
function toDateKey(value: string | Date | null): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapMeeting(row: any): Meeting {
  return {
    id: row.id,
    title: row.title,
    organizerId: row.organizer_id,
    shareToken: row.share_token,
    durationMinutes: row.duration_minutes,
    schedulingPolicy: mapPolicy(row),
    schedulingConstraints: {
      timezone: row.scheduling_timezone ?? "UTC",
      activeWeekdays: row.active_weekdays ?? DEFAULT_ACTIVE_WEEKDAYS,
      blackoutRanges: parseJsonb(row.blackout_ranges ?? []),
      minimumNoticeMinutes: row.minimum_notice_minutes ?? 0,
    },
    windowStartUtc: toIso(row.window_start_utc),
    windowEndUtc: toIso(row.window_end_utc),
    decisionDependent: row.decision_dependent,
    status: row.status,
    proposedSlot:
      row.proposed_slot_start_utc && row.proposed_slot_end_utc
        ? { startUtc: toIso(row.proposed_slot_start_utc), endUtc: toIso(row.proposed_slot_end_utc) }
        : null,
    location: row.location_kind ? { kind: row.location_kind, detail: row.location_detail ?? null } : null,
    responseDeadlineUtc: row.response_deadline_utc ? toIso(row.response_deadline_utc) : null,
    currentSnapshotId: row.current_snapshot_id ?? null,
    createdAt: toIso(row.created_at),
  };
}

function mapRole(row: any): ParticipantRole {
  return { participantId: row.participant_id, meetingId: row.meeting_id, role: row.role };
}

function mapAvailability(row: any): Availability {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    participantId: row.participant_id,
    slots: parseJsonb(row.slots),
    status: row.status,
    submittedTimezone: row.submitted_timezone,
    updatedAt: toIso(row.updated_at),
    version: row.version,
  };
}

function mapWaiver(row: any): Waiver {
  return {
    meetingId: row.meeting_id,
    participantId: row.participant_id,
    waivedBy: row.waived_by,
    waivedAt: toIso(row.waived_at),
    waivedReason: row.waived_reason,
  };
}

function mapSnapshot(row: any): SchedulingSnapshot {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    createdAt: toIso(row.created_at),
    participantRoleIds: row.participant_role_ids ?? [],
    availabilityVersion: parseJsonb(row.availability_version),
    result: parseJsonb(row.result),
    retryCount: row.retry_count,
    retryCapExceeded: row.retry_cap_exceeded,
  };
}

function mapCalendarConnection(row: any): CalendarConnection {
  return {
    participantId: row.participant_id,
    provider: row.provider,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: toIso(row.expires_at),
    accountEmail: row.account_email,
  };
}

/**
 * Production store, backed by Netlify Database (managed Postgres).
 * Schema lives in netlify/database/migrations/ — Netlify provisions the
 * database and applies pending migrations automatically on deploy; this
 * class only ever reads/writes rows, never DDL.
 */
export class NetlifyDatabaseStore implements NebulaStore {
  private db: ReturnType<typeof getDatabase>;

  /**
   * `connectionString` is only needed outside Netlify's own runtime (e.g.
   * tests via @netlify/database-dev) — in Functions/builds, `getDatabase()`
   * resolves the right branch automatically from the environment.
   */
  constructor(connectionString?: string) {
    this.db = getDatabase(connectionString ? { connectionString } : undefined);
  }

  /** Not part of NebulaStore — for tests against an ephemeral database only. */
  async close(): Promise<void> {
    await this.db.pool.end();
  }

  async createParticipant(p: Omit<Participant, "id">): Promise<Participant> {
    const rows = await this.db.sql<any>`
      INSERT INTO participants (name, email, timezone, clerk_user_id)
      VALUES (${p.name}, ${p.email}, ${p.timezone}, ${p.clerkUserId ?? null})
      RETURNING *
    `;
    return mapParticipant(rows[0]);
  }

  async getParticipant(id: string): Promise<Participant | null> {
    const rows = await this.db.sql<any>`SELECT * FROM participants WHERE id = ${id}`;
    return rows[0] ? mapParticipant(rows[0]) : null;
  }

  async getParticipantByClerkUserId(clerkUserId: string): Promise<Participant | null> {
    const rows = await this.db.sql<any>`SELECT * FROM participants WHERE clerk_user_id = ${clerkUserId}`;
    return rows[0] ? mapParticipant(rows[0]) : null;
  }

  async getParticipantByEmail(email: string): Promise<Participant | null> {
    const rows = await this.db.sql<any>`SELECT * FROM participants WHERE lower(email) = ${email.trim().toLowerCase()}`;
    return rows[0] ? mapParticipant(rows[0]) : null;
  }

  async updateParticipantTimezone(id: string, timezone: string): Promise<Participant> {
    const rows = await this.db.sql<any>`
      UPDATE participants SET timezone = ${timezone} WHERE id = ${id} RETURNING *
    `;
    if (!rows[0]) throw new Error(`Participant ${id} not found`);
    return mapParticipant(rows[0]);
  }

  async createMeeting(m: Omit<Meeting, "id" | "createdAt">): Promise<Meeting> {
    const rows = await this.db.sql<any>`
      INSERT INTO meetings (
        title, organizer_id, share_token, duration_minutes, window_start_utc, window_end_utc,
        range_type, range_amount, range_unit, range_start_date, range_end_date,
        scheduling_timezone, active_weekdays, minimum_notice_minutes, specific_dates, blackout_ranges,
        location_kind, location_detail, response_deadline_utc,
        decision_dependent, status, proposed_slot_start_utc, proposed_slot_end_utc, current_snapshot_id
      )
      VALUES (
        ${m.title}, ${m.organizerId}, ${m.shareToken}, ${m.durationMinutes}, ${m.windowStartUtc}, ${m.windowEndUtc},
        ${m.schedulingPolicy.type},
        ${m.schedulingPolicy.type === "rolling" ? m.schedulingPolicy.amount : null},
        ${m.schedulingPolicy.type === "rolling" ? m.schedulingPolicy.unit : null},
        ${m.schedulingPolicy.type === "fixed" ? m.schedulingPolicy.startDate : null},
        ${m.schedulingPolicy.type === "fixed" ? m.schedulingPolicy.endDate : null},
        ${m.schedulingConstraints.timezone},
        ${m.schedulingConstraints.activeWeekdays},
        ${m.schedulingConstraints.minimumNoticeMinutes},
        ${JSON.stringify(m.schedulingPolicy.type === "specific" ? m.schedulingPolicy.dates : [])},
        ${JSON.stringify(m.schedulingConstraints.blackoutRanges)},
        ${m.location?.kind ?? null}, ${m.location?.detail ?? null}, ${m.responseDeadlineUtc ?? null},
        ${m.decisionDependent}, ${m.status}, ${m.proposedSlot?.startUtc ?? null}, ${m.proposedSlot?.endUtc ?? null}, ${m.currentSnapshotId}
      )
      RETURNING *
    `;
    return mapMeeting(rows[0]);
  }

  async getMeeting(id: string): Promise<Meeting | null> {
    const rows = await this.db.sql<any>`SELECT * FROM meetings WHERE id = ${id}`;
    return rows[0] ? mapMeeting(rows[0]) : null;
  }

  async getMeetingByShareToken(shareToken: string): Promise<Meeting | null> {
    const rows = await this.db.sql<any>`SELECT * FROM meetings WHERE share_token = ${shareToken}`;
    return rows[0] ? mapMeeting(rows[0]) : null;
  }

  async updateMeeting(id: string, patch: Partial<Meeting>): Promise<Meeting> {
    const existing = await this.getMeeting(id);
    if (!existing) throw new Error(`Meeting ${id} not found`);
    const merged = { ...existing, ...patch };
    const rows = await this.db.sql<any>`
      UPDATE meetings SET
        title = ${merged.title},
        organizer_id = ${merged.organizerId},
        duration_minutes = ${merged.durationMinutes},
        range_type = ${merged.schedulingPolicy.type},
        range_amount = ${merged.schedulingPolicy.type === "rolling" ? merged.schedulingPolicy.amount : null},
        range_unit = ${merged.schedulingPolicy.type === "rolling" ? merged.schedulingPolicy.unit : null},
        range_start_date = ${merged.schedulingPolicy.type === "fixed" ? merged.schedulingPolicy.startDate : null},
        range_end_date = ${merged.schedulingPolicy.type === "fixed" ? merged.schedulingPolicy.endDate : null},
        scheduling_timezone = ${merged.schedulingConstraints.timezone},
        active_weekdays = ${merged.schedulingConstraints.activeWeekdays},
        minimum_notice_minutes = ${merged.schedulingConstraints.minimumNoticeMinutes},
        specific_dates = ${JSON.stringify(merged.schedulingPolicy.type === "specific" ? merged.schedulingPolicy.dates : [])},
        blackout_ranges = ${JSON.stringify(merged.schedulingConstraints.blackoutRanges)},
        window_start_utc = ${merged.windowStartUtc},
        window_end_utc = ${merged.windowEndUtc},
        location_kind = ${merged.location?.kind ?? null},
        location_detail = ${merged.location?.detail ?? null},
        response_deadline_utc = ${merged.responseDeadlineUtc ?? null},
        decision_dependent = ${merged.decisionDependent},
        status = ${merged.status},
        proposed_slot_start_utc = ${merged.proposedSlot?.startUtc ?? null},
        proposed_slot_end_utc = ${merged.proposedSlot?.endUtc ?? null},
        current_snapshot_id = ${merged.currentSnapshotId}
      WHERE id = ${id}
      RETURNING *
    `;
    return mapMeeting(rows[0]);
  }

  async getMeetingsByOrganizer(organizerId: string): Promise<Meeting[]> {
    const rows = await this.db.sql<any>`
      SELECT * FROM meetings WHERE organizer_id = ${organizerId} ORDER BY created_at DESC
    `;
    return rows.map(mapMeeting);
  }

  async assignRole(role: ParticipantRole): Promise<void> {
    await this.db.sql`
      INSERT INTO participant_roles (participant_id, meeting_id, role)
      VALUES (${role.participantId}, ${role.meetingId}, ${role.role})
      ON CONFLICT (participant_id, meeting_id, role) DO NOTHING
    `;
  }

  async getRolesForMeeting(meetingId: string): Promise<ParticipantRole[]> {
    const rows = await this.db.sql<any>`SELECT * FROM participant_roles WHERE meeting_id = ${meetingId}`;
    return rows.map(mapRole);
  }

  async upsertAvailability(
    a: Omit<Availability, "id" | "updatedAt" | "version"> & { id?: string },
  ): Promise<Availability> {
    const rows = await this.db.sql<any>`
      INSERT INTO availability (meeting_id, participant_id, slots, status, submitted_timezone, updated_at, version)
      VALUES (${a.meetingId}, ${a.participantId}, ${JSON.stringify(a.slots)}::jsonb, ${a.status}, ${a.submittedTimezone}, now(), 1)
      ON CONFLICT (meeting_id, participant_id) DO UPDATE SET
        slots = EXCLUDED.slots,
        status = EXCLUDED.status,
        submitted_timezone = EXCLUDED.submitted_timezone,
        updated_at = now(),
        version = availability.version + 1
      RETURNING *
    `;
    return mapAvailability(rows[0]);
  }

  async getAvailability(meetingId: string, participantId: string): Promise<Availability | null> {
    const rows = await this.db.sql<any>`
      SELECT * FROM availability WHERE meeting_id = ${meetingId} AND participant_id = ${participantId}
    `;
    return rows[0] ? mapAvailability(rows[0]) : null;
  }

  async getAvailabilityForMeeting(meetingId: string): Promise<Availability[]> {
    const rows = await this.db.sql<any>`SELECT * FROM availability WHERE meeting_id = ${meetingId}`;
    return rows.map(mapAvailability);
  }

  async waiveParticipant(w: Waiver): Promise<void> {
    await this.db.sql`
      INSERT INTO waivers (meeting_id, participant_id, waived_by, waived_at, waived_reason)
      VALUES (${w.meetingId}, ${w.participantId}, ${w.waivedBy}, ${w.waivedAt}, ${w.waivedReason})
      ON CONFLICT (meeting_id, participant_id) DO UPDATE SET
        waived_by = EXCLUDED.waived_by,
        waived_at = EXCLUDED.waived_at,
        waived_reason = EXCLUDED.waived_reason
    `;
  }

  async getWaiversForMeeting(meetingId: string): Promise<Waiver[]> {
    const rows = await this.db.sql<any>`SELECT * FROM waivers WHERE meeting_id = ${meetingId}`;
    return rows.map(mapWaiver);
  }

  async createSnapshot(s: Omit<SchedulingSnapshot, "id" | "createdAt">): Promise<SchedulingSnapshot> {
    const rows = await this.db.sql<any>`
      INSERT INTO scheduling_snapshots (
        meeting_id, participant_role_ids, availability_version, result, retry_count, retry_cap_exceeded
      )
      VALUES (
        ${s.meetingId}, ${s.participantRoleIds}::uuid[], ${JSON.stringify(s.availabilityVersion)}::jsonb,
        ${JSON.stringify(s.result)}::jsonb, ${s.retryCount}, ${s.retryCapExceeded}
      )
      RETURNING *
    `;
    return mapSnapshot(rows[0]);
  }

  async updateSnapshot(id: string, patch: Partial<SchedulingSnapshot>): Promise<SchedulingSnapshot> {
    const existing = await this.getSnapshot(id);
    if (!existing) throw new Error(`Snapshot ${id} not found`);
    const merged = { ...existing, ...patch };
    const rows = await this.db.sql<any>`
      UPDATE scheduling_snapshots SET
        participant_role_ids = ${merged.participantRoleIds}::uuid[],
        availability_version = ${JSON.stringify(merged.availabilityVersion)}::jsonb,
        result = ${JSON.stringify(merged.result)}::jsonb,
        retry_count = ${merged.retryCount},
        retry_cap_exceeded = ${merged.retryCapExceeded}
      WHERE id = ${id}
      RETURNING *
    `;
    return mapSnapshot(rows[0]);
  }

  async getSnapshot(id: string): Promise<SchedulingSnapshot | null> {
    const rows = await this.db.sql<any>`SELECT * FROM scheduling_snapshots WHERE id = ${id}`;
    return rows[0] ? mapSnapshot(rows[0]) : null;
  }

  async saveCalendarConnection(c: CalendarConnection): Promise<void> {
    await this.db.sql`
      INSERT INTO calendar_connections (participant_id, provider, access_token, refresh_token, expires_at, account_email)
      VALUES (${c.participantId}, ${c.provider}, ${c.accessToken}, ${c.refreshToken}, ${c.expiresAt}, ${c.accountEmail})
      ON CONFLICT (participant_id, provider) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        account_email = EXCLUDED.account_email
    `;
  }

  async getCalendarConnection(
    participantId: string,
    provider: CalendarConnection["provider"],
  ): Promise<CalendarConnection | null> {
    const rows = await this.db.sql<any>`
      SELECT * FROM calendar_connections WHERE participant_id = ${participantId} AND provider = ${provider}
    `;
    return rows[0] ? mapCalendarConnection(rows[0]) : null;
  }
}
