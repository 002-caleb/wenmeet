// WenMeet domain model.
//
// See PRD v2 for the resolutions this file implements:
//   §4  Participant roles (many-to-many, multiple KDMs)
//   §6  Timezone correction after submission
//   §7  Scheduling readiness, T-24h lock, versioned snapshot scheduling
//   §12 Rescheduling, waiver states, live availability grid

export type Role = "organizer" | "required" | "kdm" | "optional";

export interface Participant {
  id: string;
  name: string;
  email: string;
  /** IANA timezone, e.g. "America/Los_Angeles". */
  timezone: string;
  /** Bridges an authenticated Clerk user to their Participant record. Unset for participants who only ever respond via a shared link. */
  clerkUserId?: string;
}

/**
 * `participant_roles` — many-to-many (participant_id, meeting_id, role).
 * A meeting can have zero, one, or multiple KDMs. A participant can hold
 * more than one role on the same meeting (e.g. required + kdm).
 */
export interface ParticipantRole {
  participantId: string;
  meetingId: string;
  role: Role;
}

export type AvailabilityStatus = "submitted" | "needs_confirmation" | "confirmed";

export interface TimeSlot {
  /** ISO-8601 UTC instant. */
  startUtc: string;
  /** ISO-8601 UTC instant. */
  endUtc: string;
}

/**
 * A participant's availability for one meeting. Slots are always stored
 * normalized to UTC. `submittedTimezone` records what timezone the
 * participant was looking at when they painted the grid, so a later
 * timezone change can be detected.
 */
export interface Availability {
  id: string;
  meetingId: string;
  participantId: string;
  slots: TimeSlot[];
  status: AvailabilityStatus;
  submittedTimezone: string;
  updatedAt: string;
  /**
   * Monotonic counter, incremented on every upsert. Staleness checks
   * (PRD §7 versioned snapshot scheduling) compare this rather than
   * `updatedAt`, because two upserts can land within the same
   * millisecond (fast test runs, or genuinely concurrent submissions)
   * and an ISO-string timestamp comparison would silently miss a real
   * change in that case.
   */
  version: number;
}

/**
 * A participant's connected external calendar. `getBusyBlocks` (see
 * CalendarProvider) reads through this — tokens live here, not in
 * Participant, so the domain model stays provider-agnostic.
 */
export interface CalendarConnection {
  participantId: string;
  provider: "google" | "microsoft";
  accessToken: string;
  refreshToken: string;
  /** ISO-8601 UTC instant the access token expires. */
  expiresAt: string;
  /** The connected account's own address — shown in the UI so "is this my calendar?" has a visible answer. */
  accountEmail: string;
}

/**
 * A participant waived from one specific meeting. Their global role is
 * untouched — this record only affects `meetingId`.
 */
export interface Waiver {
  meetingId: string;
  participantId: string;
  waivedBy: string;
  waivedAt: string;
  waivedReason: string;
}

export type MeetingStatus =
  | "collecting" // gathering availability, not yet ready
  | "ready" // required+kdm all answered, no valid slot search run yet / in progress
  | "no_valid_slot" // pre-lock: no overlap between all required+kdm; organizer must act
  | "locked" // T-24h cutoff has passed for the proposed time
  | "needs_rescheduling"; // post-lock decline by a required/kdm participant

export interface SchedulingResult {
  slot: TimeSlot | null;
  /** Present when slot is null: why no time could be proposed. */
  reason?: string;
}

/**
 * A frozen snapshot of roles/constraints/confirmed-availability at the
 * moment a scheduling run started. Recalculation replaces `result` and
 * bumps `retryCount`; it never mutates history destructively (kept for
 * organizer visibility).
 */
export interface SchedulingSnapshot {
  id: string;
  meetingId: string;
  createdAt: string;
  participantRoleIds: string[]; // participantIds captured at snapshot time
  availabilityVersion: Record<string, number>; // participantId -> Availability.version used
  result: SchedulingResult;
  retryCount: number;
  /** True once retryCount exceeded the soft cap — organizer-visibility only, never blocks the T-24h lock. */
  retryCapExceeded: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  organizerId: string;
  /** The window the organizer is trying to schedule within. */
  windowStartUtc: string;
  windowEndUtc: string;
  decisionDependent: boolean;
  status: MeetingStatus;
  /** Set once a scheduling run proposes a time; drives the T-24h lock. */
  proposedSlot: TimeSlot | null;
  currentSnapshotId: string | null;
  createdAt: string;
}
