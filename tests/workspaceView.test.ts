import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStore } from "../src/lib/store/InMemoryStore";
import { runSchedulingSnapshot } from "../src/lib/scheduling/snapshot";
import { loadWorkspaceView, placeSummary, type MeetingSummary } from "../src/lib/dashboard/workspaceView";
import { meetingInput } from "./helpers/meetingInput";

describe("loadWorkspaceView (authenticated workspace dashboard)", () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  async function makeMeetingFor(organizerId: string, title: string) {
    const meeting = await store.createMeeting(
      meetingInput({
      title,
      organizerId,
      windowStartUtc: "2026-09-01T00:00:00Z",
      windowEndUtc: "2026-09-10T00:00:00Z",
      decisionDependent: false,
      status: "collecting",
      proposedSlot: null,
      currentSnapshotId: null,
      }),
    );
    await store.assignRole({ participantId: organizerId, meetingId: meeting.id, role: "organizer" });
    return meeting;
  }

  async function makeMeeting(title: string) {
    const organizer = await store.createParticipant({ name: "Org", email: "org@ccb.dev", timezone: "America/Los_Angeles" });
    const meeting = await makeMeetingFor(organizer.id, title);
    return { organizer, meeting };
  }

  it("buckets a meeting with no invitees as active, with zero role progress", async () => {
    const { organizer } = await makeMeeting("Solo sync");
    const view = await loadWorkspaceView(store, organizer.id);

    expect(view.totalMeetings).toBe(1);
    expect(view.active).toHaveLength(1);
    expect(view.attention).toHaveLength(0);
    expect(view.upcoming).toHaveLength(0);
    expect(view.active[0]!.participantCount).toBe(0);
    expect(view.active[0]!.lifecycle).toBe("collecting");
    expect(view.active[0]!.attentionRequired).toBe(false);
  });

  it("moves a meeting to Needs Attention once the engine finds a best match, with correct role counts", async () => {
    const { organizer, meeting } = await makeMeeting("Board Strategy Call");
    const req = await store.createParticipant({ name: "Req", email: "req@ccb.dev", timezone: "UTC" });
    const kdm = await store.createParticipant({ name: "Kdm", email: "kdm@ccb.dev", timezone: "UTC" });
    const opt = await store.createParticipant({ name: "Opt", email: "opt@ccb.dev", timezone: "UTC" });
    await store.assignRole({ participantId: req.id, meetingId: meeting.id, role: "required" });
    await store.assignRole({ participantId: kdm.id, meetingId: meeting.id, role: "kdm" });
    await store.assignRole({ participantId: opt.id, meetingId: meeting.id, role: "optional" });

    const slot = { startUtc: "2026-09-02T16:00:00Z", endUtc: "2026-09-02T17:00:00Z" };
    await store.upsertAvailability({ meetingId: meeting.id, participantId: req.id, slots: [slot], status: "confirmed", submittedTimezone: "UTC" });
    await store.upsertAvailability({ meetingId: meeting.id, participantId: kdm.id, slots: [slot], status: "confirmed", submittedTimezone: "UTC" });
    // opt1 deliberately never responds — must not block

    await runSchedulingSnapshot(store, meeting.id);

    const view = await loadWorkspaceView(store, organizer.id);
    expect(view.attention).toHaveLength(1);
    expect(view.active).toHaveLength(0);
    const summary = view.attention[0]!;
    expect(summary.lifecycle).toBe("ready");
    expect(summary.attentionReason).toBe("match_ready");
    expect(summary.roleProgress.required).toEqual({ ready: 1, total: 1 });
    expect(summary.roleProgress.decision).toEqual({ ready: 1, total: 1 });
    expect(summary.roleProgress.optional).toEqual({ ready: 0, total: 1 });
    expect(summary.recommendedTimeUtc).toBe(slot.startUtc);
  });

  it("surfaces a locked meeting with a future time as Upcoming, sorted earliest first", async () => {
    const organizer = await store.createParticipant({ name: "Org", email: "org@ccb.dev", timezone: "UTC" });
    const m1 = await makeMeetingFor(organizer.id, "Later meeting");
    await store.updateMeeting(m1.id, {
      status: "locked",
      proposedSlot: { startUtc: "2099-01-02T00:00:00Z", endUtc: "2099-01-02T01:00:00Z" },
    });
    const m2 = await makeMeetingFor(organizer.id, "Sooner meeting");
    await store.updateMeeting(m2.id, {
      status: "locked",
      proposedSlot: { startUtc: "2099-01-01T00:00:00Z", endUtc: "2099-01-01T01:00:00Z" },
    });

    const view = await loadWorkspaceView(store, organizer.id);
    expect(view.upcoming.map((i) => i.title)).toEqual(["Sooner meeting", "Later meeting"]);
  });

  it("drops a locked meeting whose proposed time has already passed", async () => {
    const { organizer, meeting } = await makeMeeting("Past meeting");
    await store.updateMeeting(meeting.id, {
      status: "locked",
      proposedSlot: { startUtc: "2000-01-01T00:00:00Z", endUtc: "2000-01-01T01:00:00Z" },
    });

    const view = await loadWorkspaceView(store, organizer.id);
    expect(view.upcoming).toHaveLength(0);
    expect(view.active).toHaveLength(0);
    expect(view.attention).toHaveLength(0);
    expect(view.totalMeetings).toBe(1);
  });

  it("puts no_valid_slot and needs_rescheduling meetings in Needs Attention", async () => {
    const organizer = await store.createParticipant({ name: "Org", email: "org@ccb.dev", timezone: "UTC" });
    const m1 = await makeMeetingFor(organizer.id, "Deadlocked meeting");
    await store.updateMeeting(m1.id, { status: "no_valid_slot" });
    const m2 = await makeMeetingFor(organizer.id, "Reschedule me");
    await store.updateMeeting(m2.id, { status: "needs_rescheduling" });

    const view = await loadWorkspaceView(store, organizer.id);
    expect(view.attention).toHaveLength(2);
    expect(view.attention.map((s) => s.attentionReason).sort()).toEqual([
      "needs_rescheduling",
      "no_valid_slot",
    ]);
  });

  it("never lists the same meeting in two sections", async () => {
    const organizer = await store.createParticipant({ name: "Org", email: "org@ccb.dev", timezone: "UTC" });
    const collecting = await makeMeetingFor(organizer.id, "Collecting");
    const ready = await makeMeetingFor(organizer.id, "Ready");
    await store.updateMeeting(ready.id, {
      status: "ready",
      proposedSlot: { startUtc: "2099-03-01T10:00:00Z", endUtc: "2099-03-01T11:00:00Z" },
    });
    const booked = await makeMeetingFor(organizer.id, "Booked");
    await store.updateMeeting(booked.id, {
      status: "locked",
      proposedSlot: { startUtc: "2099-03-02T10:00:00Z", endUtc: "2099-03-02T11:00:00Z" },
    });

    const view = await loadWorkspaceView(store, organizer.id);
    const ids = [...view.attention, ...view.active, ...view.upcoming].map((s) => s.id);
    expect(ids).toHaveLength(new Set(ids).size);
    expect(ids).toHaveLength(3);
    expect(view.attention.map((s) => s.id)).toEqual([ready.id]);
    expect(view.active.map((s) => s.id)).toEqual([collecting.id]);
    expect(view.upcoming.map((s) => s.id)).toEqual([booked.id]);
  });
});

describe("placeSummary (§5 deterministic routing)", () => {
  const base: MeetingSummary = {
    id: "m1",
    title: "Test",
    lifecycle: "collecting",
    attentionRequired: false,
    attentionReason: null,
    roleProgress: {
      required: { ready: 0, total: 0 },
      decision: { ready: 0, total: 0 },
      optional: { ready: 0, total: 0 },
    },
    participantCount: 0,
    responseCount: 0,
    recommendedTimeUtc: null,
    scheduledTimeUtc: null,
    windowStartUtc: "2026-09-01T00:00:00Z",
    windowEndUtc: "2026-09-10T00:00:00Z",
    href: "/app/meetings/m1",
  };

  it("routes attention ahead of lifecycle, whatever the lifecycle is", () => {
    expect(placeSummary({ ...base, attentionRequired: true, attentionReason: "match_ready", lifecycle: "ready" })).toBe("attention");
    expect(placeSummary({ ...base, attentionRequired: true, attentionReason: "needs_rescheduling", lifecycle: "booked" })).toBe("attention");
  });

  it("routes by lifecycle when nothing needs the host", () => {
    expect(placeSummary({ ...base, lifecycle: "collecting" })).toBe("active");
    expect(placeSummary({ ...base, lifecycle: "ready" })).toBe("active");
    expect(placeSummary({ ...base, lifecycle: "booked" })).toBe("upcoming");
  });
});
