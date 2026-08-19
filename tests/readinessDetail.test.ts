import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStore } from "../src/lib/store/InMemoryStore";
import { computeReadinessDetail } from "../src/lib/scheduling/readinessDetail";

describe("computeReadinessDetail (KDM addendum §28)", () => {
  let store: InMemoryStore;
  let meetingId: string;

  async function invite(name: string, role: "kdm" | "required" | "optional") {
    const p = await store.createParticipant({ name, email: `${name}@ccb.dev`, timezone: "UTC" });
    await store.assignRole({ participantId: p.id, meetingId, role });
    return p;
  }

  const SLOT = { startUtc: "2026-09-01T16:00:00Z", endUtc: "2026-09-01T17:00:00Z" };

  beforeEach(async () => {
    store = new InMemoryStore();
    const organizer = await store.createParticipant({ name: "Org", email: "org@ccb.dev", timezone: "UTC" });
    const meeting = await store.createMeeting({
      title: "Board Strategy Call",
      organizerId: organizer.id,
      shareToken: "tok-detail-test",
      durationMinutes: 30,
      schedulingPolicy: { type: "fixed", startDate: "2026-09-01", endDate: "2026-09-10" },
      schedulingConstraints: { timezone: "UTC", activeWeekdays: [1, 2, 3, 4, 5], blackoutRanges: [], minimumNoticeMinutes: 0 },
      windowStartUtc: "2026-09-01T00:00:00Z",
      windowEndUtc: "2026-09-10T00:00:00Z",
      location: null,
      responseDeadlineUtc: null,
      decisionDependent: false,
      status: "collecting",
      proposedSlot: null,
      currentSnapshotId: null,
    });
    meetingId = meeting.id;
    await store.assignRole({ participantId: organizer.id, meetingId, role: "organizer" });
  });

  it("counts a confirmed KDM and required attendee toward readiness", async () => {
    const cindy = await invite("Cindy", "kdm");
    const aman = await invite("Aman", "required");
    await store.upsertAvailability({ meetingId, participantId: cindy.id, slots: [SLOT], status: "confirmed", submittedTimezone: "UTC" });
    await store.upsertAvailability({ meetingId, participantId: aman.id, slots: [SLOT], status: "confirmed", submittedTimezone: "UTC" });

    const detail = await computeReadinessDetail(store, meetingId);
    expect(detail.kdmTotal).toBe(1);
    expect(detail.kdmReadyCount).toBe(1);
    expect(detail.requiredTotal).toBe(1);
    expect(detail.requiredReadyCount).toBe(1);
    expect(detail.readyCount).toBe(2);
    expect(detail.gatingTotal).toBe(2);
  });

  it("counts a plain 'submitted' status as ready, not only 'confirmed'", async () => {
    const cindy = await invite("Cindy", "kdm");
    await store.upsertAvailability({ meetingId, participantId: cindy.id, slots: [SLOT], status: "submitted", submittedTimezone: "UTC" });
    const detail = await computeReadinessDetail(store, meetingId);
    expect(detail.kdm[0]!.ready).toBe(true);
    expect(detail.kdm[0]!.state).toBe("submitted");
  });

  it("excludes needs_confirmation from the ready count", async () => {
    const cindy = await invite("Cindy", "kdm");
    await store.upsertAvailability({ meetingId, participantId: cindy.id, slots: [SLOT], status: "needs_confirmation", submittedTimezone: "UTC" });
    const detail = await computeReadinessDetail(store, meetingId);
    expect(detail.kdm[0]!.ready).toBe(false);
    expect(detail.kdm[0]!.state).toBe("needs_confirmation");
    expect(detail.kdmReadyCount).toBe(0);
  });

  it("shows a non-responding gating participant as waiting", async () => {
    await invite("Jordan", "required");
    const detail = await computeReadinessDetail(store, meetingId);
    expect(detail.required[0]!.state).toBe("waiting");
    expect(detail.required[0]!.ready).toBe(false);
  });

  it("excludes a waived participant from both numerator and denominator, but still lists them", async () => {
    const cindy = await invite("Cindy", "kdm");
    await store.upsertAvailability({ meetingId, participantId: cindy.id, slots: [SLOT], status: "confirmed", submittedTimezone: "UTC" });
    await store.waiveParticipant({
      meetingId,
      participantId: cindy.id,
      waivedBy: "org",
      waivedAt: new Date().toISOString(),
      waivedReason: "Out of office",
    });

    const detail = await computeReadinessDetail(store, meetingId);
    // Still visible in the roster, per §35 ("remains visibly labeled").
    expect(detail.kdm).toHaveLength(1);
    expect(detail.kdm[0]!.waived).toBe(true);
    // But excluded from both sides of the ring, even though they responded.
    expect(detail.kdmTotal).toBe(0);
    expect(detail.kdmReadyCount).toBe(0);
    expect(detail.gatingTotal).toBe(0);
  });

  it("counts a required+kdm participant once, under kdm", async () => {
    const cindy = await store.createParticipant({ name: "Cindy", email: "cindy@ccb.dev", timezone: "UTC" });
    await store.assignRole({ participantId: cindy.id, meetingId, role: "required" });
    await store.assignRole({ participantId: cindy.id, meetingId, role: "kdm" });
    await store.upsertAvailability({ meetingId, participantId: cindy.id, slots: [SLOT], status: "confirmed", submittedTimezone: "UTC" });

    const detail = await computeReadinessDetail(store, meetingId);
    expect(detail.kdm).toHaveLength(1);
    expect(detail.required).toHaveLength(0);
    expect(detail.kdm[0]!.roles).toEqual(["kdm", "required"]);
    expect(detail.gatingTotal).toBe(1);
  });

  it("puts a pure optional participant in the optional list, never gating", async () => {
    const devon = await invite("Devon", "optional");
    await store.upsertAvailability({ meetingId, participantId: devon.id, slots: [SLOT], status: "confirmed", submittedTimezone: "UTC" });

    const detail = await computeReadinessDetail(store, meetingId);
    expect(detail.optional).toHaveLength(1);
    expect(detail.optional[0]!.responded).toBe(true);
    expect(detail.gatingTotal).toBe(0);
  });

  it("never counts the organizer as a gating participant", async () => {
    const detail = await computeReadinessDetail(store, meetingId);
    expect(detail.kdm).toHaveLength(0);
    expect(detail.required).toHaveLength(0);
    expect(detail.gatingTotal).toBe(0);
  });
});
