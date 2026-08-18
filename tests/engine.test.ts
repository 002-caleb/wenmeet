import { describe, expect, it } from "vitest";
import { computeSchedulingResult } from "../src/lib/scheduling/engine";
import type { Availability, ParticipantRole } from "../src/lib/types";

function availability(participantId: string, slots: Availability["slots"]): Availability {
  return {
    id: `a_${participantId}`,
    meetingId: "m1",
    participantId,
    slots,
    status: "confirmed",
    submittedTimezone: "UTC",
    updatedAt: new Date().toISOString(),
  };
}

const roles: ParticipantRole[] = [
  { participantId: "req1", meetingId: "m1", role: "required" },
  { participantId: "kdm1", meetingId: "m1", role: "kdm" },
];

describe("computeSchedulingResult", () => {
  it("proposes the earliest overlapping slot across all required+kdm", () => {
    const map = new Map([
      ["req1", availability("req1", [{ startUtc: "2026-09-01T16:00:00Z", endUtc: "2026-09-01T19:00:00Z" }])],
      ["kdm1", availability("kdm1", [{ startUtc: "2026-09-01T17:00:00Z", endUtc: "2026-09-01T18:00:00Z" }])],
    ]);
    const result = computeSchedulingResult(roles, map, []);
    expect(result.slot).toEqual({ startUtc: "2026-09-01T17:00:00Z", endUtc: "2026-09-01T18:00:00Z" });
  });

  it("§12: reports no valid slot explicitly rather than guessing or dropping a constraint", () => {
    const map = new Map([
      ["req1", availability("req1", [{ startUtc: "2026-09-01T16:00:00Z", endUtc: "2026-09-01T17:00:00Z" }])],
      ["kdm1", availability("kdm1", [{ startUtc: "2026-09-01T18:00:00Z", endUtc: "2026-09-01T19:00:00Z" }])],
    ]);
    const result = computeSchedulingResult(roles, map, []);
    expect(result.slot).toBeNull();
    expect(result.reason).toMatch(/no valid slot/i);
  });

  it("is not ready (and reports why) rather than computing overlap when a required participant hasn't answered", () => {
    const map = new Map([
      ["kdm1", availability("kdm1", [{ startUtc: "2026-09-01T17:00:00Z", endUtc: "2026-09-01T18:00:00Z" }])],
    ]);
    const result = computeSchedulingResult(roles, map, []);
    expect(result.slot).toBeNull();
    expect(result.reason).toMatch(/not ready/i);
  });

  it("a waived required participant no longer gates the overlap computation (§12)", () => {
    const map = new Map([
      ["kdm1", availability("kdm1", [{ startUtc: "2026-09-01T17:00:00Z", endUtc: "2026-09-01T18:00:00Z" }])],
    ]);
    const waivers = [
      { meetingId: "m1", participantId: "req1", waivedBy: "organizer", waivedAt: new Date().toISOString(), waivedReason: "conflict" },
    ];
    const result = computeSchedulingResult(roles, map, waivers);
    expect(result.slot).toEqual({ startUtc: "2026-09-01T17:00:00Z", endUtc: "2026-09-01T18:00:00Z" });
  });
});
