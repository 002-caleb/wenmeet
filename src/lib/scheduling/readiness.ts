import type { Availability, ParticipantRole, Waiver } from "../types";

export interface ReadinessResult {
  ready: boolean;
  /** participantIds blocking readiness, with why. */
  blocking: Array<{ participantId: string; reason: "no_availability" | "needs_confirmation" }>;
}

/**
 * PRD §7: readiness only waits on Required + KDM roles. Optional never
 * blocks. A Required/KDM participant currently in `needs_confirmation`
 * blocks readiness — that state exists specifically to block; treating
 * it as "answered" would defeat the purpose of the timezone-correction
 * flow (§6). A waived participant (§12) is excluded entirely: waiving
 * is the explicit mechanism for removing someone from consideration.
 */
export function computeReadiness(
  roles: ParticipantRole[],
  availabilityByParticipant: Map<string, Availability>,
  waivers: Waiver[],
): ReadinessResult {
  const waivedIds = new Set(waivers.map((w) => w.participantId));

  const gatingParticipantIds = new Set(
    roles
      .filter((r) => (r.role === "required" || r.role === "kdm") && !waivedIds.has(r.participantId))
      .map((r) => r.participantId),
  );

  const blocking: ReadinessResult["blocking"] = [];
  for (const participantId of gatingParticipantIds) {
    const availability = availabilityByParticipant.get(participantId);
    if (!availability) {
      blocking.push({ participantId, reason: "no_availability" });
    } else if (availability.status === "needs_confirmation") {
      blocking.push({ participantId, reason: "needs_confirmation" });
    }
  }

  return { ready: blocking.length === 0, blocking };
}
