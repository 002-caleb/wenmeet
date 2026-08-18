import type {
  Availability,
  Meeting,
  Participant,
  ParticipantRole,
  SchedulingSnapshot,
  Waiver,
} from "../types";

/**
 * Data-access seam for the whole app. Netlify Functions are stateless
 * with cold starts (PRD §15), so nothing that must survive a cold start
 * may live only in process memory — it has to go through this interface.
 *
 * `InMemoryStore` implements this for local dev/demo only.
 * `SupabaseStore` is the production-shaped implementation; production
 * deployments must run with DATA_STORE=supabase and db/schema.sql applied.
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
}
