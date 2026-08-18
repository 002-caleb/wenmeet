import { describe, expect, it } from "vitest";
import { computeReadiness } from "../src/lib/scheduling/readiness";
import type { Availability, ParticipantRole } from "../src/lib/types";

function availability(participantId: string, status: Availability["status"]): Availability {
  return {
    id: `a_${participantId}`,
    meetingId: "m1",
    participantId,
    slots: [{ startUtc: "2026-09-01T17:00:00Z", endUtc: "2026-09-01T18:00:00Z" }],
    status,
    submittedTimezone: "America/Los_Angeles",
    updatedAt: new Date().toISOString(),
  };
}

const roles: ParticipantRole[] = [
  { participantId: "organizer", meetingId: "m1", role: "organizer" },
  { participantId: "req1", meetingId: "m1", role: "required" },
  { participantId: "kdm1", meetingId: "m1", role: "kdm" },
  { participantId: "opt1", meetingId: "m1", role: "optional" },
];

describe("computeReadiness", () => {
  it("is ready when all required+kdm have confirmed availability, regardless of optional", () => {
    const map = new Map([
      ["req1", availability("req1", "confirmed")],
      ["kdm1", availability("kdm1", "confirmed")],
      // opt1 deliberately has no availability at all
    ]);
    const result = computeReadiness(roles, map, []);
    expect(result.ready).toBe(true);
    expect(result.blocking).toHaveLength(0);
  });

  it("is not ready when a required participant has not submitted", () => {
    const map = new Map([["kdm1", availability("kdm1", "confirmed")]]);
    const result = computeReadiness(roles, map, []);
    expect(result.ready).toBe(false);
    expect(result.blocking.map((b) => b.participantId)).toContain("req1");
  });

  it("treats needs_confirmation as blocking, not answered (§6/§7)", () => {
    const map = new Map([
      ["req1", availability("req1", "confirmed")],
      ["kdm1", availability("kdm1", "needs_confirmation")],
    ]);
    const result = computeReadiness(roles, map, []);
    expect(result.ready).toBe(false);
    expect(result.blocking).toEqual([{ participantId: "kdm1", reason: "needs_confirmation" }]);
  });

  it("supports multiple KDMs — all are hard constraints by default (§4)", () => {
    const multiKdmRoles: ParticipantRole[] = [
      ...roles,
      { participantId: "kdm2", meetingId: "m1", role: "kdm" },
    ];
    const map = new Map([
      ["req1", availability("req1", "confirmed")],
      ["kdm1", availability("kdm1", "confirmed")],
      // kdm2 missing
    ]);
    const result = computeReadiness(multiKdmRoles, map, []);
    expect(result.ready).toBe(false);
    expect(result.blocking.map((b) => b.participantId)).toContain("kdm2");
  });

  it("excludes a waived participant from gating entirely (§12)", () => {
    const map = new Map([["kdm1", availability("kdm1", "confirmed")]]);
    const waivers = [
      { meetingId: "m1", participantId: "req1", waivedBy: "organizer", waivedAt: new Date().toISOString(), waivedReason: "unavailable" },
    ];
    const result = computeReadiness(roles, map, waivers);
    expect(result.ready).toBe(true);
  });
});
