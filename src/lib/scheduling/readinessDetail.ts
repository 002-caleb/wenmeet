import type { NebulaStore } from "../store/NebulaStore";
import type { Availability, AvailabilityStatus } from "../types";

/**
 * Per-participant readiness detail (PRD §28-29, §33, §37). Distinct from
 * `computeReadiness` (readiness.ts), which only answers "is this meeting
 * ready" — this answers "who, specifically, and why," which is what a
 * readiness ring and roster need to render.
 */

export type GatingRole = "kdm" | "required";

/** Whether a gating participant counts toward the ring's numerator. */
export type GatingState = "confirmed" | "submitted" | "needs_confirmation" | "waiting";

export interface GatingParticipantDetail {
  participantId: string;
  name: string;
  /** A participant can be both — shown once, listed under kdm (the stronger claim). */
  roles: GatingRole[];
  state: GatingState;
  /**
   * Counts toward the ring's numerator. False for a waived participant even
   * if they responded — §28: the denominator and numerator both exclude
   * waived participants, but §35 still shows them in the roster, visibly
   * labeled, so this stays separate from whether they're *in* the list.
   */
  ready: boolean;
  slotCount: number;
  /** Null if they've never responded. */
  updatedAt: string | null;
  submittedTimezone: string | null;
  waived: boolean;
}

export interface OptionalParticipantDetail {
  participantId: string;
  name: string;
  responded: boolean;
  slotCount: number;
}

export interface ReadinessDetail {
  kdm: GatingParticipantDetail[];
  required: GatingParticipantDetail[];
  optional: OptionalParticipantDetail[];
  /** Ring numerator/denominator — waived participants excluded from both. */
  readyCount: number;
  gatingTotal: number;
  kdmReadyCount: number;
  kdmTotal: number;
  requiredReadyCount: number;
  requiredTotal: number;
}

function stateFor(availability: Availability | undefined): GatingState {
  if (!availability) return "waiting";
  const status: AvailabilityStatus = availability.status;
  if (status === "needs_confirmation") return "needs_confirmation";
  // §28: the numerator counts `confirmed`, or `submitted` when timezone
  // confirmation isn't required — this product has no separate opt-in for
  // that distinction yet, so a plain "submitted" counts as ready too.
  return status === "confirmed" ? "confirmed" : "submitted";
}

export async function computeReadinessDetail(store: NebulaStore, meetingId: string): Promise<ReadinessDetail> {
  const [roles, availabilityRows, waivers] = await Promise.all([
    store.getRolesForMeeting(meetingId),
    store.getAvailabilityForMeeting(meetingId),
    store.getWaiversForMeeting(meetingId),
  ]);

  const waivedIds = new Set(waivers.map((w) => w.participantId));
  const availabilityByParticipant = new Map(availabilityRows.map((a) => [a.participantId, a]));

  // A participant can hold required + kdm simultaneously — one row, not two.
  const rolesByParticipant = new Map<string, Set<GatingRole | "optional">>();
  for (const r of roles) {
    if (r.role === "organizer") continue;
    const set = rolesByParticipant.get(r.participantId) ?? new Set();
    set.add(r.role as GatingRole | "optional");
    rolesByParticipant.set(r.participantId, set);
  }

  const kdm: GatingParticipantDetail[] = [];
  const required: GatingParticipantDetail[] = [];
  const optional: OptionalParticipantDetail[] = [];

  for (const [participantId, roleSet] of rolesByParticipant) {
    const participant = await store.getParticipant(participantId);
    const name = participant?.name ?? "Unknown";
    const availability = availabilityByParticipant.get(participantId);
    const waived = waivedIds.has(participantId);

    const isOptionalOnly = roleSet.has("optional") && !roleSet.has("kdm") && !roleSet.has("required");
    if (isOptionalOnly) {
      optional.push({
        participantId,
        name,
        responded: Boolean(availability),
        slotCount: availability?.slots.length ?? 0,
      });
      continue;
    }

    const gatingRoles: GatingRole[] = [];
    if (roleSet.has("kdm")) gatingRoles.push("kdm");
    if (roleSet.has("required")) gatingRoles.push("required");
    if (gatingRoles.length === 0) continue; // pure "optional" already handled above

    const state = stateFor(availability);
    const detail: GatingParticipantDetail = {
      participantId,
      name,
      roles: gatingRoles,
      state,
      ready: !waived && (state === "confirmed" || state === "submitted"),
      slotCount: availability?.slots.length ?? 0,
      updatedAt: availability?.updatedAt ?? null,
      submittedTimezone: availability?.submittedTimezone ?? null,
      waived,
    };

    // Listed under kdm (the stronger claim) if they hold both roles, so a
    // required+kdm participant never appears twice in the roster.
    if (gatingRoles.includes("kdm")) kdm.push(detail);
    else required.push(detail);
  }

  const nonWaived = (list: GatingParticipantDetail[]) => list.filter((p) => !p.waived);
  const readyOf = (list: GatingParticipantDetail[]) => nonWaived(list).filter((p) => p.ready).length;

  const kdmTotal = nonWaived(kdm).length;
  const requiredTotal = nonWaived(required).length;
  const kdmReadyCount = readyOf(kdm);
  const requiredReadyCount = readyOf(required);

  return {
    kdm,
    required,
    optional,
    readyCount: kdmReadyCount + requiredReadyCount,
    gatingTotal: kdmTotal + requiredTotal,
    kdmReadyCount,
    kdmTotal,
    requiredReadyCount,
    requiredTotal,
  };
}
