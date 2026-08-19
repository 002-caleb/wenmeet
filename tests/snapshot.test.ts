import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStore } from "../src/lib/store/InMemoryStore";
import { runSchedulingSnapshot, revalidateBeforeLock, RETRY_SOFT_CAP } from "../src/lib/scheduling/snapshot";

describe("scheduling snapshot lifecycle (§7)", () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  async function setUpMeeting() {
    const organizer = await store.createParticipant({ name: "Org", email: "org@ccb.dev", timezone: "UTC" });
    const req1 = await store.createParticipant({ name: "Req", email: "req@ccb.dev", timezone: "UTC" });
    const kdm1 = await store.createParticipant({ name: "Kdm", email: "kdm@ccb.dev", timezone: "UTC" });

    const meeting = await store.createMeeting({
      shareToken: `tok-${Math.random().toString(36).slice(2, 10)}`,
      title: "Board sync",
      organizerId: organizer.id,
      windowStartUtc: "2026-09-01T00:00:00Z",
      windowEndUtc: "2026-09-05T00:00:00Z",
      decisionDependent: true,
      status: "collecting",
      proposedSlot: null,
      currentSnapshotId: null,
    });

    await store.assignRole({ participantId: organizer.id, meetingId: meeting.id, role: "organizer" });
    await store.assignRole({ participantId: req1.id, meetingId: meeting.id, role: "required" });
    await store.assignRole({ participantId: kdm1.id, meetingId: meeting.id, role: "kdm" });

    await store.upsertAvailability({
      meetingId: meeting.id,
      participantId: req1.id,
      slots: [{ startUtc: "2026-09-02T16:00:00Z", endUtc: "2026-09-02T19:00:00Z" }],
      status: "confirmed",
      submittedTimezone: "UTC",
    });
    await store.upsertAvailability({
      meetingId: meeting.id,
      participantId: kdm1.id,
      slots: [{ startUtc: "2026-09-02T17:00:00Z", endUtc: "2026-09-02T18:00:00Z" }],
      status: "confirmed",
      submittedTimezone: "UTC",
    });

    return { meeting, organizer, req1, kdm1 };
  }

  it("produces a proposed slot and marks the meeting ready", async () => {
    const { meeting } = await setUpMeeting();
    const { meeting: updated, snapshot } = await runSchedulingSnapshot(store, meeting.id);
    expect(updated?.status).toBe("ready");
    expect(updated?.proposedSlot).toEqual({ startUtc: "2026-09-02T17:00:00Z", endUtc: "2026-09-02T18:00:00Z" });
    expect(snapshot.retryCount).toBe(0);
  });

  it("revalidateBeforeLock discards a stale result and recalculates when a required participant's availability changed", async () => {
    const { meeting, req1 } = await setUpMeeting();
    await runSchedulingSnapshot(store, meeting.id);

    // req1 narrows their availability after the snapshot was taken.
    await store.upsertAvailability({
      meetingId: meeting.id,
      participantId: req1.id,
      slots: [{ startUtc: "2026-09-03T16:00:00Z", endUtc: "2026-09-03T19:00:00Z" }],
      status: "confirmed",
      submittedTimezone: "UTC",
    });

    const outcome = await revalidateBeforeLock(store, meeting.id);
    expect(outcome.changed).toBe(true);
    const updatedMeeting = await store.getMeeting(meeting.id);
    // No more overlap with kdm1's original slot -> no valid slot.
    expect(updatedMeeting?.status).toBe("no_valid_slot");
  });

  it("optional-participant changes never trigger revalidation", async () => {
    const { meeting, organizer } = await setUpMeeting();
    const opt = await store.createParticipant({ name: "Opt", email: "opt@ccb.dev", timezone: "UTC" });
    await store.assignRole({ participantId: opt.id, meetingId: meeting.id, role: "optional" });
    await runSchedulingSnapshot(store, meeting.id);

    await store.upsertAvailability({
      meetingId: meeting.id,
      participantId: opt.id,
      slots: [{ startUtc: "2026-09-04T00:00:00Z", endUtc: "2026-09-04T01:00:00Z" }],
      status: "confirmed",
      submittedTimezone: "UTC",
    });

    const outcome = await revalidateBeforeLock(store, meeting.id);
    expect(outcome.changed).toBe(false);
    void organizer;
  });

  it("retry cap exceeding never blocks recalculation — it only flags organizer notification (§7)", async () => {
    const { meeting, req1 } = await setUpMeeting();
    await runSchedulingSnapshot(store, meeting.id);

    let lastOutcome;
    for (let i = 0; i < RETRY_SOFT_CAP + 2; i += 1) {
      await store.upsertAvailability({
        meetingId: meeting.id,
        participantId: req1.id,
        slots: [{ startUtc: "2026-09-02T17:00:00Z", endUtc: `2026-09-02T${18 + i}:00:00Z` }],
        status: "confirmed",
        submittedTimezone: "UTC",
      });
      lastOutcome = await revalidateBeforeLock(store, meeting.id);
    }

    expect(lastOutcome?.changed).toBe(true);
    if (lastOutcome?.changed) {
      expect(lastOutcome.shouldNotifyRetryCapExceeded).toBe(true);
      expect(lastOutcome.snapshot.retryCount).toBeGreaterThan(RETRY_SOFT_CAP);
    }
    // Meeting is still fully live/recalculable — cap did not lock or freeze it.
    const updatedMeeting = await store.getMeeting(meeting.id);
    expect(updatedMeeting?.status).not.toBe("locked");
  });
});
