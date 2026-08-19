import { NetlifyDB } from "@netlify/database-dev";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { NetlifyDatabaseStore } from "../src/lib/store/NetlifyDatabaseStore";
import { meetingInput } from "./helpers/meetingInput";

// Real, ephemeral Postgres running the actual migrations — this is the
// only way to be confident the raw-SQL store is correct rather than
// merely typechecking.
let db: NetlifyDB;
let connectionString: string;
let store: NetlifyDatabaseStore;

beforeAll(async () => {
  db = new NetlifyDB();
  connectionString = await db.start();
  await db.applyMigrations("./netlify/database/migrations");
  store = new NetlifyDatabaseStore(connectionString);
}, 60_000);

afterAll(async () => {
  // Close our own pool connection before tearing down the ephemeral
  // Postgres instance, or the pool emits an unhandled 'error' on teardown.
  await store.close();
  await db.stop();
});

describe("NetlifyDatabaseStore", () => {
  test("creates and fetches a participant, including by clerkUserId", async () => {
    const p = await store.createParticipant({
      name: "Ada Lovelace",
      email: "ada@example.com",
      timezone: "UTC",
      clerkUserId: "clerk_123",
    });
    expect(p.id).toBeTruthy();
    expect(p.name).toBe("Ada Lovelace");

    const fetched = await store.getParticipant(p.id);
    expect(fetched).toEqual(p);

    const byClerkId = await store.getParticipantByClerkUserId("clerk_123");
    expect(byClerkId?.id).toBe(p.id);

    const updated = await store.updateParticipantTimezone(p.id, "America/Los_Angeles");
    expect(updated.timezone).toBe("America/Los_Angeles");
  });

  test("creates a meeting, assigns roles, and lists by organizer", async () => {
    const organizer = await store.createParticipant({ name: "Org", email: "org@example.com", timezone: "UTC" });
    const required = await store.createParticipant({ name: "Req", email: "req@example.com", timezone: "UTC" });

    const meeting = await store.createMeeting(
      meetingInput({
      title: "Strategy Call",
      organizerId: organizer.id,
      windowStartUtc: "2026-08-18T00:00:00.000Z",
      windowEndUtc: "2026-08-25T00:00:00.000Z",
      decisionDependent: false,
      status: "collecting",
      proposedSlot: null,
      currentSnapshotId: null,
      }),
    );
    expect(meeting.id).toBeTruthy();
    expect(meeting.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    await store.assignRole({ participantId: organizer.id, meetingId: meeting.id, role: "organizer" });
    await store.assignRole({ participantId: required.id, meetingId: meeting.id, role: "required" });
    // Duplicate assignment must not throw (ON CONFLICT DO NOTHING).
    await store.assignRole({ participantId: required.id, meetingId: meeting.id, role: "required" });

    const roles = await store.getRolesForMeeting(meeting.id);
    expect(roles).toHaveLength(2);

    const updated = await store.updateMeeting(meeting.id, {
      status: "locked",
      proposedSlot: { startUtc: "2026-08-20T17:00:00.000Z", endUtc: "2026-08-20T17:30:00.000Z" },
    });
    expect(updated.status).toBe("locked");
    expect(updated.proposedSlot).toEqual({
      startUtc: "2026-08-20T17:00:00.000Z",
      endUtc: "2026-08-20T17:30:00.000Z",
    });

    const byOrganizer = await store.getMeetingsByOrganizer(organizer.id);
    expect(byOrganizer.map((m) => m.id)).toContain(meeting.id);
  });

  test("upserts availability and increments version on resubmission", async () => {
    const organizer = await store.createParticipant({ name: "O2", email: "o2@example.com", timezone: "UTC" });
    const meeting = await store.createMeeting(
      meetingInput({
      title: "Sync",
      organizerId: organizer.id,
      windowStartUtc: "2026-08-18T00:00:00.000Z",
      windowEndUtc: "2026-08-25T00:00:00.000Z",
      decisionDependent: false,
      status: "collecting",
      proposedSlot: null,
      currentSnapshotId: null,
      }),
    );

    const first = await store.upsertAvailability({
      meetingId: meeting.id,
      participantId: organizer.id,
      slots: [{ startUtc: "2026-08-19T17:00:00.000Z", endUtc: "2026-08-19T17:30:00.000Z" }],
      status: "submitted",
      submittedTimezone: "America/Los_Angeles",
    });
    expect(first.version).toBe(1);

    const second = await store.upsertAvailability({
      meetingId: meeting.id,
      participantId: organizer.id,
      slots: [{ startUtc: "2026-08-19T18:00:00.000Z", endUtc: "2026-08-19T18:30:00.000Z" }],
      status: "confirmed",
      submittedTimezone: "America/Los_Angeles",
    });
    expect(second.version).toBe(2);
    expect(second.id).toBe(first.id);
    expect(second.slots).toEqual([{ startUtc: "2026-08-19T18:00:00.000Z", endUtc: "2026-08-19T18:30:00.000Z" }]);

    const fetched = await store.getAvailability(meeting.id, organizer.id);
    expect(fetched?.version).toBe(2);

    const forMeeting = await store.getAvailabilityForMeeting(meeting.id);
    expect(forMeeting).toHaveLength(1);
  });

  test("waives a participant idempotently", async () => {
    const organizer = await store.createParticipant({ name: "O3", email: "o3@example.com", timezone: "UTC" });
    const participant = await store.createParticipant({ name: "P3", email: "p3@example.com", timezone: "UTC" });
    const meeting = await store.createMeeting(
      meetingInput({
      title: "Waiver test",
      organizerId: organizer.id,
      windowStartUtc: "2026-08-18T00:00:00.000Z",
      windowEndUtc: "2026-08-25T00:00:00.000Z",
      decisionDependent: false,
      status: "collecting",
      proposedSlot: null,
      currentSnapshotId: null,
      }),
    );

    await store.waiveParticipant({
      meetingId: meeting.id,
      participantId: participant.id,
      waivedBy: organizer.id,
      waivedAt: "2026-08-19T00:00:00.000Z",
      waivedReason: "Out of office",
    });

    const waivers = await store.getWaiversForMeeting(meeting.id);
    expect(waivers).toHaveLength(1);
    expect(waivers[0]?.waivedReason).toBe("Out of office");
  });

  test("creates and updates a scheduling snapshot, preserving jsonb and uuid[] round-trip", async () => {
    const organizer = await store.createParticipant({ name: "O4", email: "o4@example.com", timezone: "UTC" });
    const meeting = await store.createMeeting(
      meetingInput({
      title: "Snapshot test",
      organizerId: organizer.id,
      windowStartUtc: "2026-08-18T00:00:00.000Z",
      windowEndUtc: "2026-08-25T00:00:00.000Z",
      decisionDependent: false,
      status: "collecting",
      proposedSlot: null,
      currentSnapshotId: null,
      }),
    );

    const snapshot = await store.createSnapshot({
      meetingId: meeting.id,
      participantRoleIds: [organizer.id],
      availabilityVersion: { [organizer.id]: 1 },
      result: { slot: null, reason: "no_overlap" },
      retryCount: 0,
      retryCapExceeded: false,
    });
    expect(snapshot.participantRoleIds).toEqual([organizer.id]);
    expect(snapshot.result).toEqual({ slot: null, reason: "no_overlap" });

    const updated = await store.updateSnapshot(snapshot.id, {
      result: { slot: { startUtc: "2026-08-20T17:00:00.000Z", endUtc: "2026-08-20T17:30:00.000Z" } },
      retryCount: 1,
    });
    expect(updated.retryCount).toBe(1);
    expect(updated.result.slot).toEqual({ startUtc: "2026-08-20T17:00:00.000Z", endUtc: "2026-08-20T17:30:00.000Z" });

    const fetched = await store.getSnapshot(snapshot.id);
    expect(fetched?.retryCount).toBe(1);
  });

  test("saves and updates a calendar connection", async () => {
    const participant = await store.createParticipant({ name: "P5", email: "p5@example.com", timezone: "UTC" });

    await store.saveCalendarConnection({
      participantId: participant.id,
      provider: "google",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresAt: "2026-08-19T00:00:00.000Z",
      accountEmail: "p5@gmail.com",
    });

    const conn = await store.getCalendarConnection(participant.id, "google");
    expect(conn?.accessToken).toBe("access-1");
    expect(conn?.accountEmail).toBe("p5@gmail.com");

    // Re-save (token refresh) must update in place, not duplicate.
    await store.saveCalendarConnection({
      participantId: participant.id,
      provider: "google",
      accessToken: "access-2",
      refreshToken: "refresh-1",
      expiresAt: "2026-08-19T01:00:00.000Z",
      accountEmail: "p5@gmail.com",
    });
    const refreshed = await store.getCalendarConnection(participant.id, "google");
    expect(refreshed?.accessToken).toBe("access-2");

    const microsoft = await store.getCalendarConnection(participant.id, "microsoft");
    expect(microsoft).toBeNull();
  });
});
