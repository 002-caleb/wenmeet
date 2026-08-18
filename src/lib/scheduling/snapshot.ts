import type { NebulaStore } from "../store/NebulaStore";
import type { Availability } from "../types";
import { computeSchedulingResult } from "./engine";

/** Organizer-visibility soft cap (PRD §7). Exceeding it never blocks the T-24h lock. */
export const RETRY_SOFT_CAP = 2;

async function loadAvailabilityMap(store: NebulaStore, meetingId: string): Promise<Map<string, Availability>> {
  const rows = await store.getAvailabilityForMeeting(meetingId);
  return new Map(rows.map((a) => [a.participantId, a]));
}

/**
 * Starts a scheduling run: freezes a snapshot of roles/constraints/
 * confirmed-availability and computes against it (PRD §7).
 */
export async function runSchedulingSnapshot(store: NebulaStore, meetingId: string) {
  const meeting = await store.getMeeting(meetingId);
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  const roles = await store.getRolesForMeeting(meetingId);
  const waivers = await store.getWaiversForMeeting(meetingId);
  const availabilityMap = await loadAvailabilityMap(store, meetingId);

  const result = computeSchedulingResult(roles, availabilityMap, waivers);

  const availabilityVersion: Record<string, number> = {};
  for (const [participantId, a] of availabilityMap) availabilityVersion[participantId] = a.version;

  const snapshot = await store.createSnapshot({
    meetingId,
    participantRoleIds: roles.map((r) => r.participantId),
    availabilityVersion,
    result,
    retryCount: 0,
    retryCapExceeded: false,
  });

  await store.updateMeeting(meetingId, {
    currentSnapshotId: snapshot.id,
    proposedSlot: result.slot,
    status: result.slot ? "ready" : "no_valid_slot",
  });

  return { meeting: await store.getMeeting(meetingId), snapshot };
}

/**
 * PRD §7: before the T-24h lock fires, WenMeet performs a final
 * validation against the latest confirmed data. If a Required attendee
 * or KDM changed their availability since the snapshot, the stale
 * result is discarded and recalculated automatically. Optional
 * submissions never interrupt a run. Recalculation is soft-capped at 2
 * retries for organizer visibility only — the cap never blocks the
 * eventual T-24h auto-lock.
 */
export async function revalidateBeforeLock(store: NebulaStore, meetingId: string) {
  const meeting = await store.getMeeting(meetingId);
  if (!meeting || !meeting.currentSnapshotId) return { changed: false as const };

  const snapshot = await store.getSnapshot(meeting.currentSnapshotId);
  if (!snapshot) return { changed: false as const };

  const roles = await store.getRolesForMeeting(meetingId);
  const waivers = await store.getWaiversForMeeting(meetingId);
  const waivedIds = new Set(waivers.map((w) => w.participantId));
  const gatingIds = new Set(
    roles.filter((r) => (r.role === "required" || r.role === "kdm") && !waivedIds.has(r.participantId)).map((r) => r.participantId),
  );

  const availabilityMap = await loadAvailabilityMap(store, meetingId);

  const stale = [...gatingIds].some((participantId) => {
    const latest = availabilityMap.get(participantId);
    const snapshotted = snapshot.availabilityVersion[participantId];
    return latest && latest.version !== snapshotted;
  });

  if (!stale) return { changed: false as const };

  const result = computeSchedulingResult(roles, availabilityMap, waivers);
  const retryCount = snapshot.retryCount + 1;
  const retryCapExceeded = retryCount > RETRY_SOFT_CAP;

  const availabilityVersion: Record<string, number> = {};
  for (const [participantId, a] of availabilityMap) availabilityVersion[participantId] = a.version;

  const updatedSnapshot = await store.updateSnapshot(snapshot.id, {
    result,
    retryCount,
    retryCapExceeded,
    availabilityVersion,
  });

  await store.updateMeeting(meetingId, {
    proposedSlot: result.slot,
    status: result.slot ? "ready" : "no_valid_slot",
  });

  return {
    changed: true as const,
    snapshot: updatedSnapshot,
    /** Surface this to the organizer notification path — never used to block the lock. */
    shouldNotifyRetryCapExceeded: retryCapExceeded,
  };
}
