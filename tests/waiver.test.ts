import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStore } from "../src/lib/store/InMemoryStore";
import { waiveParticipant, handlePostLockDecline } from "../src/lib/scheduling/waiver";
import { computeReadiness } from "../src/lib/scheduling/readiness";

describe("waivers (§12)", () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("waiving a participant only affects the specific meeting, not their global role", async () => {
    const p = await store.createParticipant({ name: "Rae", email: "rae@ccb.dev", timezone: "UTC" });
    const m1 = await store.createMeeting({
      title: "M1",
      organizerId: p.id,
      windowStartUtc: "2026-09-01T00:00:00Z",
      windowEndUtc: "2026-09-02T00:00:00Z",
      decisionDependent: false,
      status: "collecting",
      proposedSlot: null,
      currentSnapshotId: null,
    });
    const m2 = await store.createMeeting({
      title: "M2",
      organizerId: p.id,
      windowStartUtc: "2026-09-01T00:00:00Z",
      windowEndUtc: "2026-09-02T00:00:00Z",
      decisionDependent: false,
      status: "collecting",
      proposedSlot: null,
      currentSnapshotId: null,
    });
    await store.assignRole({ participantId: p.id, meetingId: m1.id, role: "required" });
    await store.assignRole({ participantId: p.id, meetingId: m2.id, role: "required" });

    await waiveParticipant(store, m1.id, p.id, "organizer_id", "conflict");

    const waiversM1 = await store.getWaiversForMeeting(m1.id);
    const waiversM2 = await store.getWaiversForMeeting(m2.id);
    expect(waiversM1).toHaveLength(1);
    expect(waiversM1[0]).toMatchObject({ participantId: p.id, waivedBy: "organizer_id", waivedReason: "conflict" });
    expect(waiversM2).toHaveLength(0);

    // Global role assignment is untouched on both meetings.
    const rolesM1 = await store.getRolesForMeeting(m1.id);
    const rolesM2 = await store.getRolesForMeeting(m2.id);
    expect(rolesM1.some((r) => r.participantId === p.id && r.role === "required")).toBe(true);
    expect(rolesM2.some((r) => r.participantId === p.id && r.role === "required")).toBe(true);

    // And readiness for m1 no longer gates on the waived participant.
    const readiness = computeReadiness(rolesM1, new Map(), waiversM1);
    expect(readiness.ready).toBe(true);
  });

  it("post-lock decline moves the meeting to needs_rescheduling", async () => {
    const p = await store.createParticipant({ name: "Org", email: "o@ccb.dev", timezone: "UTC" });
    const meeting = await store.createMeeting({
      title: "Locked meeting",
      organizerId: p.id,
      windowStartUtc: "2026-09-01T00:00:00Z",
      windowEndUtc: "2026-09-02T00:00:00Z",
      decisionDependent: false,
      status: "locked",
      proposedSlot: { startUtc: "2026-09-01T17:00:00Z", endUtc: "2026-09-01T18:00:00Z" },
      currentSnapshotId: null,
    });

    const updated = await handlePostLockDecline(store, meeting.id);
    expect(updated.status).toBe("needs_rescheduling");
  });
});
