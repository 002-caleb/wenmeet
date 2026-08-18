import type {
  Availability,
  CalendarConnection,
  Meeting,
  Participant,
  ParticipantRole,
  SchedulingSnapshot,
  Waiver,
} from "../types";

/**
 * Data-access seam for the whole app. Netlify Functions are stateless
 * with cold starts, so nothing that must survive a cold start may live
 * only in process memory — it has to go through this interface.
 *
 * `InMemoryStore` implements this for local dev/demo only.
 * `NetlifyDatabaseStore` is the production implementation, backed by
 * Netlify Database (managed Postgres) — schema lives in
 * netlify/database/migrations/, applied automatically on deploy.
 */
export interface NebulaStore {
  // Participants
  createParticipant(p: Omit<Participant, "id">): Promise<Participant>;
  getParticipant(id: string): Promise<Participant | null>;
  getParticipantByClerkUserId(clerkUserId: string): Promise<Participant | null>;
  updateParticipantTimezone(id: string, timezone: string): Promise<Participant>;

  // Meetings
  createMeeting(m: Omit<Meeting, "id" | "createdAt">): Promise<Meeting>;
  getMeeting(id: string): Promise<Meeting | null>;
  updateMeeting(id: string, patch: Partial<Meeting>): Promise<Meeting>;
  getMeetingsByOrganizer(organizerId: string): Promise<Meeting[]>;

  // Roles (participant_roles, many-to-many)
  assignRole(role: ParticipantRole): Promise<void>;
  getRolesForMeeting(meetingId: string): Promise<ParticipantRole[]>;

  // Availability
  upsertAvailability(
    a: Omit<Availability, "id" | "updatedAt" | "version"> & { id?: string },
  ): Promise<Availability>;
  getAvailability(meetingId: string, participantId: string): Promise<Availability | null>;
  getAvailabilityForMeeting(meetingId: string): Promise<Availability[]>;

  // Waivers
  waiveParticipant(w: Waiver): Promise<void>;
  getWaiversForMeeting(meetingId: string): Promise<Waiver[]>;

  // Scheduling snapshots
  createSnapshot(s: Omit<SchedulingSnapshot, "id" | "createdAt">): Promise<SchedulingSnapshot>;
  updateSnapshot(id: string, patch: Partial<SchedulingSnapshot>): Promise<SchedulingSnapshot>;
  getSnapshot(id: string): Promise<SchedulingSnapshot | null>;

  // Calendar connections
  saveCalendarConnection(c: CalendarConnection): Promise<void>;
  getCalendarConnection(
    participantId: string,
    provider: CalendarConnection["provider"],
  ): Promise<CalendarConnection | null>;
}
