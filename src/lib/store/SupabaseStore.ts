import type {
  Availability,
  Meeting,
  Participant,
  ParticipantRole,
  SchedulingSnapshot,
  Waiver,
} from "../types";
import type { NebulaStore } from "./NebulaStore";

/**
 * STUB. Production-shaped implementation of NebulaStore backed by
 * Supabase (see db/schema.sql for the matching schema).
 *
 * This scaffold does not wire up real Supabase credentials/queries —
 * that requires a provisioned project and is intentionally left for
 * the next build pass, same as the Google/Microsoft OAuth stubs in
 * src/lib/calendar/. Every method below throws until implemented so a
 * misconfigured `DATA_STORE=supabase` deploy fails loudly instead of
 * silently behaving like the in-memory store.
 */
export class SupabaseStore implements NebulaStore {
  constructor(private readonly supabaseUrl: string, private readonly serviceRoleKey: string) {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "SupabaseStore requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. " +
          "Set DATA_STORE=memory for local dev, or provide credentials for a real deploy.",
      );
    }
  }

  private notImplemented(method: string): never {
    throw new Error(
      `SupabaseStore.${method} is not implemented yet. See db/schema.sql for the target schema.`,
    );
  }

  async createParticipant(_p: Omit<Participant, "id">): Promise<Participant> {
    this.notImplemented("createParticipant");
  }
  async getParticipant(_id: string): Promise<Participant | null> {
    this.notImplemented("getParticipant");
  }
  async updateParticipantTimezone(_id: string, _timezone: string): Promise<Participant> {
    this.notImplemented("updateParticipantTimezone");
  }
  async createMeeting(_m: Omit<Meeting, "id" | "createdAt">): Promise<Meeting> {
    this.notImplemented("createMeeting");
  }
  async getMeeting(_id: string): Promise<Meeting | null> {
    this.notImplemented("getMeeting");
  }
  async updateMeeting(_id: string, _patch: Partial<Meeting>): Promise<Meeting> {
    this.notImplemented("updateMeeting");
  }
  async assignRole(_role: ParticipantRole): Promise<void> {
    this.notImplemented("assignRole");
  }
  async getRolesForMeeting(_meetingId: string): Promise<ParticipantRole[]> {
    this.notImplemented("getRolesForMeeting");
  }
  async upsertAvailability(
    _a: Omit<Availability, "id" | "updatedAt" | "version"> & { id?: string },
  ): Promise<Availability> {
    this.notImplemented("upsertAvailability");
  }
  async getAvailability(_meetingId: string, _participantId: string): Promise<Availability | null> {
    this.notImplemented("getAvailability");
  }
  async getAvailabilityForMeeting(_meetingId: string): Promise<Availability[]> {
    this.notImplemented("getAvailabilityForMeeting");
  }
  async waiveParticipant(_w: Waiver): Promise<void> {
    this.notImplemented("waiveParticipant");
  }
  async getWaiversForMeeting(_meetingId: string): Promise<Waiver[]> {
    this.notImplemented("getWaiversForMeeting");
  }
  async createSnapshot(
    _s: Omit<SchedulingSnapshot, "id" | "createdAt">,
  ): Promise<SchedulingSnapshot> {
    this.notImplemented("createSnapshot");
  }
  async updateSnapshot(_id: string, _patch: Partial<SchedulingSnapshot>): Promise<SchedulingSnapshot> {
    this.notImplemented("updateSnapshot");
  }
  async getSnapshot(_id: string): Promise<SchedulingSnapshot | null> {
    this.notImplemented("getSnapshot");
  }
}
