import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "../src/app/api/m/[token]/respond/route";
import { getStore } from "../src/lib/store";
import { generateShareToken } from "../src/lib/shareToken";
import type { Meeting, Participant } from "../src/lib/types";

/**
 * The respond endpoint is deliberately unauthenticated — the share token is
 * the only credential — so every one of these cases is a real attack surface,
 * not a theoretical one.
 */

const WINDOW_START = "2026-09-01T00:00:00Z";
const WINDOW_END = "2026-09-10T00:00:00Z";
const INSIDE = { startUtc: "2026-09-02T16:00:00Z", endUtc: "2026-09-02T17:00:00Z" };

function post(token: string, body: unknown) {
  return POST(
    new Request(`http://localhost/api/m/${token}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: { token } },
  );
}

describe("POST /api/m/:token/respond", () => {
  let organizer: Participant;
  let meeting: Meeting;
  let token: string;

  beforeEach(async () => {
    const store = getStore();
    organizer = await store.createParticipant({
      name: "Org",
      email: `org-${Math.random().toString(36).slice(2)}@ccb.dev`,
      timezone: "UTC",
    });
    token = generateShareToken();
    meeting = await store.createMeeting({
      title: "Board Strategy Call",
      organizerId: organizer.id,
      shareToken: token,
      windowStartUtc: WINDOW_START,
      windowEndUtc: WINDOW_END,
      decisionDependent: false,
      status: "collecting",
      proposedSlot: null,
      currentSnapshotId: null,
    });
  });

  const validBody = (over: Record<string, unknown> = {}) => ({
    name: "Cindy",
    email: `cindy-${Math.random().toString(36).slice(2)}@example.com`,
    timezone: "America/Los_Angeles",
    slots: [INSIDE],
    ...over,
  });

  it("saves a response and creates the participant, with no account required", async () => {
    const res = await post(token, validBody({ email: "cindy@example.com" }));
    expect(res.status).toBe(201);

    const store = getStore();
    const saved = await store.getAvailabilityForMeeting(meeting.id);
    expect(saved).toHaveLength(1);
    expect(saved[0]!.slots).toEqual([INSIDE]);

    const participant = await store.getParticipantByEmail("cindy@example.com");
    expect(participant?.name).toBe("Cindy");

    // They must actually be on the meeting, or readiness would ignore them.
    const roles = await store.getRolesForMeeting(meeting.id);
    expect(roles.some((r) => r.participantId === participant!.id && r.role === "required")).toBe(true);
  });

  it("404s an unknown token without revealing whether it was well-formed", async () => {
    const res = await post(generateShareToken(), validBody());
    expect(res.status).toBe(404);
  });

  it("404s a malformed token before touching the store", async () => {
    const res = await post("not-a-real-token", validBody());
    expect(res.status).toBe(404);
  });

  it("refuses to let a caller make themselves the organizer", async () => {
    const res = await post(token, validBody({ role: "organizer" }));
    expect(res.status).toBe(201);

    const store = getStore();
    const roles = await store.getRolesForMeeting(meeting.id);
    const organizerRoles = roles.filter((r) => r.role === "organizer");
    // The only organizer is still the person who created the meeting.
    expect(organizerRoles.every((r) => r.participantId === organizer.id)).toBe(true);
  });

  it("rejects availability outside the organizer's window", async () => {
    const res = await post(
      token,
      validBody({ slots: [{ startUtc: "2027-01-01T10:00:00Z", endUtc: "2027-01-01T11:00:00Z" }] }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a slot that ends before it starts", async () => {
    const res = await post(
      token,
      validBody({ slots: [{ startUtc: INSIDE.endUtc, endUtc: INSIDE.startUtc }] }),
    );
    expect(res.status).toBe(400);
  });

  it("requires a name and a plausible email", async () => {
    expect((await post(token, validBody({ name: "   " }))).status).toBe(400);
    expect((await post(token, validBody({ email: "nope" }))).status).toBe(400);
  });

  it("requires at least one selected time", async () => {
    expect((await post(token, validBody({ slots: [] }))).status).toBe(400);
  });

  it("caps absurdly large submissions", async () => {
    const many = Array.from({ length: 501 }, () => INSIDE);
    expect((await post(token, validBody({ slots: many }))).status).toBe(400);
  });

  it("stops accepting responses once the meeting is booked", async () => {
    await getStore().updateMeeting(meeting.id, { status: "locked" });
    const res = await post(token, validBody());
    expect(res.status).toBe(409);
  });

  it("updates rather than duplicates when the same person responds twice", async () => {
    const email = "brad@example.com";
    await post(token, validBody({ email, slots: [INSIDE] }));
    const second = { startUtc: "2026-09-03T16:00:00Z", endUtc: "2026-09-03T17:00:00Z" };
    await post(token, validBody({ email, name: "Brad", slots: [second] }));

    const saved = await getStore().getAvailabilityForMeeting(meeting.id);
    expect(saved).toHaveLength(1);
    expect(saved[0]!.slots).toEqual([second]);
  });
});
