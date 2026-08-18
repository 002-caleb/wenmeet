import type { Availability, ParticipantRole, SchedulingResult, Waiver } from "../types";
import { intersectAll } from "./overlap";
import { computeReadiness } from "./readiness";

/**
 * PRD §12 (before lock): if there is no valid overlap between all
 * Required attendees and KDMs, WenMeet reports that no valid slot exists
 * in the current window — it never guesses or silently drops a
 * constraint. This function is the single place that decision gets made.
 */
export function computeSchedulingResult(
  roles: ParticipantRole[],
  availabilityByParticipant: Map<string, Availability>,
  waivers: Waiver[],
): SchedulingResult {
  const readiness = computeReadiness(roles, availabilityByParticipant, waivers);
  if (!readiness.ready) {
    return {
      slot: null,
      reason: `Not ready — waiting on: ${readiness.blocking.map((b) => `${b.participantId} (${b.reason})`).join(", ")}`,
    };
  }

  const waivedIds = new Set(waivers.map((w) => w.participantId));
  const gatingIds = new Set(
    roles
      .filter((r) => (r.role === "required" || r.role === "kdm") && !waivedIds.has(r.participantId))
      .map((r) => r.participantId),
  );

  const slotLists = [...gatingIds].map((id) => availabilityByParticipant.get(id)?.slots ?? []);
  const overlap = intersectAll(slotLists);

  if (overlap.length === 0) {
    return {
      slot: null,
      reason:
        "No valid slot exists in the current window across all Required attendees and KDMs. " +
        "Adjust the window or request updated availability — WenMeet will not guess or drop a constraint.",
    };
  }

  // Earliest overlapping slot wins for V1. (Optional-participant
  // preference weighting is explicitly V2+ scope, see PRD §12.)
  const best = overlap.reduce((earliest, s) => (s.startUtc < earliest.startUtc ? s : earliest));
  return { slot: best };
}
