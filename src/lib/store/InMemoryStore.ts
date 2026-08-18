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

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

/**
 * Dev/demo implementation. Holds everything in process memory —
 * explicitly NOT for production (does not survive a Netlify Functions
 * cold start). See PRD §15.
 */
export class InMemoryStore implements NebulaStore {
  private participants = new Map<string, Participant>();
  private meetings = new Map<string, Meeting>();
  private roles: ParticipantRole[] = [];
  private availability = new Map<string, Availability>(); // key: meetingId:participantId
  private waivers: Waiver[] = [];
  private snapshots = new Map<string, SchedulingSnapshot>();
  private calendarConnections = new Map<string, CalendarConnection>(); // key: participantId:provider

  async createParticipant(p: Omit<Participant, "id">): Promise<Participant> {
    const participant: Participant = { ...p, id: nextId("participant") };
    this.participants.set(participant.id, participant);
    return participant;
  }

  async getParticipant(id: string): Promise<Participant | null> {
    return this.participants.get(id) ?? null;
  }

  async getParticipantByClerkUserId(clerkUserId: string): Promise<Participant | null> {
    for (const p of this.participants.values()) {
      if (p.clerkUserId === clerkUserId) return p;
    }
    return null;
  }

  async updateParticipantTimezone(id: string, timezone: string): Promise<Participant> {
    const existing = this.participants.get(id);
    if (!existing) throw new Error(`Participant ${id} not found`);
    const updated = { ...existing, timezone };
    this.participants.set(id, updated);
    return updated;
  }

  async createMeeting(m: Omit<Meeting, "id" | "createdAt">): Promise<Meeting> {
    const meeting: Meeting = { ...m, id: nextId("meeting"), createdAt: new Date().toISOString() };
    this.meetings.set(meeting.id, meeting);
    return meeting;
  }

  async getMeeting(id: string): Promise<Meeting | null> {
    return this.meetings.get(id) ?? null;
  }

  async updateMeeting(id: string, patch: Partial<Meeting>): Promise<Meeting> {
    const existing = this.meetings.get(id);
    if (!existing) throw new Error(`Meeting ${id} not found`);
    const updated = { ...existing, ...patch };
    this.meetings.set(id, updated);
    return updated;
  }

  async getMeetingsByOrganizer(organizerId: string): Promise<Meeting[]> {
    return [...this.meetings.values()]
      .filter((m) => m.organizerId === organizerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async assignRole(role: ParticipantRole): Promise<void> {
    const exists = this.roles.some(
      (r) => r.participantId === role.participantId && r.meetingId === role.meetingId && r.role === role.role,
    );
    if (!exists) this.roles.push(role);
  }

  async getRolesForMeeting(meetingId: string): Promise<ParticipantRole[]> {
    return this.roles.filter((r) => r.meetingId === meetingId);
  }

  async upsertAvailability(
    a: Omit<Availability, "id" | "updatedAt" | "version"> & { id?: string },
  ): Promise<Availability> {
    const key = `${a.meetingId}:${a.participantId}`;
    const existing = this.availability.get(key);
    const record: Availability = {
      id: existing?.id ?? a.id ?? nextId("availability"),
      meetingId: a.meetingId,
      participantId: a.participantId,
      slots: a.slots,
      status: a.status,
      submittedTimezone: a.submittedTimezone,
      updatedAt: new Date().toISOString(),
      version: (existing?.version ?? 0) + 1,
    };
    this.availability.set(key, record);
    return record;
  }

  async getAvailability(meetingId: string, participantId: string): Promise<Availability | null> {
    return this.availability.get(`${meetingId}:${participantId}`) ?? null;
  }

  async getAvailabilityForMeeting(meetingId: string): Promise<Availability[]> {
    return [...this.availability.values()].filter((a) => a.meetingId === meetingId);
  }

  async waiveParticipant(w: Waiver): Promise<void> {
    this.waivers = this.waivers.filter(
      (existing) => !(existing.meetingId === w.meetingId && existing.participantId === w.participantId),
    );
    this.waivers.push(w);
  }

  async getWaiversForMeeting(meetingId: string): Promise<Waiver[]> {
    return this.waivers.filter((w) => w.meetingId === meetingId);
  }

  async createSnapshot(
    s: Omit<SchedulingSnapshot, "id" | "createdAt">,
  ): Promise<SchedulingSnapshot> {
    const snapshot: SchedulingSnapshot = {
      ...s,
      id: nextId("snapshot"),
      createdAt: new Date().toISOString(),
    };
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  async updateSnapshot(id: string, patch: Partial<SchedulingSnapshot>): Promise<SchedulingSnapshot> {
    const existing = this.snapshots.get(id);
    if (!existing) throw new Error(`Snapshot ${id} not found`);
    const updated = { ...existing, ...patch };
    this.snapshots.set(id, updated);
    return updated;
  }

  async getSnapshot(id: string): Promise<SchedulingSnapshot | null> {
    return this.snapshots.get(id) ?? null;
  }

  async saveCalendarConnection(c: CalendarConnection): Promise<void> {
    this.calendarConnections.set(`${c.participantId}:${c.provider}`, c);
  }

  async getCalendarConnection(
    participantId: string,
    provider: CalendarConnection["provider"],
  ): Promise<CalendarConnection | null> {
    return this.calendarConnections.get(`${participantId}:${provider}`) ?? null;
  }

  /** Test/demo helper only — not part of the NebulaStore interface. */
  reset(): void {
    this.participants.clear();
    this.meetings.clear();
    this.roles = [];
    this.availability.clear();
    this.waivers = [];
    this.snapshots.clear();
    this.calendarConnections.clear();
  }
}
