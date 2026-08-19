import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStore } from "../src/lib/store/InMemoryStore";
import { handleParticipantTimezoneChange, confirmAvailability } from "../src/lib/timezone/tzCorrection";
import { computeReadiness } from "../src/lib/scheduling/readiness";

describe("timezone correction after submission (§6)", () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("moves confirmed availability to needs_confirmation and blocks readiness until re-confirmed", async () => {
    const participant = await store.createParticipant({ name: "Sam", email: "sam@ccb.dev", timezone: "America/Los_Angeles" });
    const meeting = await store.createMeeting({
      shareToken: `tok-${Math.random().toString(36).slice(2, 10)}`,
      title: "Standup",
      organizerId: participant.id,
      windowStartUtc: "2026-09-01T00:00:00Z",
      windowEndUtc: "2026-09-02T00:00:00Z",
      decisionDependent: false,
      status: "collecting",
      proposedSlot: null,
      currentSnapshotId: null,
    });
    await store.assignRole({ participantId: participant.id, meetingId: meeting.id, role: "required" });
    await store.upsertAvailability({
      meetingId: meeting.id,
      participantId: participant.id,
      slots: [{ startUtc: "2026-09-01T17:00:00Z", endUtc: "2026-09-01T18:00:00Z" }],
      status: "confirmed",
      submittedTimezone: "America/Los_Angeles",
    });

    // Storage stays UTC — this only exercises the timezone-change side effect.
    await handleParticipantTimezoneChange(store, participant.id, "America/New_York", [meeting.id]);

    const availability = await store.getAvailability(meeting.id, participant.id);
    expect(availability?.status).toBe("needs_confirmation");
    // The UTC instants themselves are untouched by the timezone change.
    expect(availability?.slots).toEqual([{ startUtc: "2026-09-01T17:00:00Z", endUtc: "2026-09-01T18:00:00Z" }]);
    expect(availability?.submittedTimezone).toBe("America/New_York");

    const roles = await store.getRolesForMeeting(meeting.id);
    const map = new Map([[participant.id, availability!]]);
    expect(computeReadiness(roles, map, []).ready).toBe(false);

    await confirmAvailability(store, meeting.id, participant.id);
    const reconfirmed = await store.getAvailability(meeting.id, participant.id);
    expect(reconfirmed?.status).toBe("confirmed");
    const map2 = new Map([[participant.id, reconfirmed!]]);
    expect(computeReadiness(roles, map2, []).ready).toBe(true);
  });
});
