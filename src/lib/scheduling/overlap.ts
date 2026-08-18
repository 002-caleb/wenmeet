import type { TimeSlot } from "../types";

/** Intersect two sorted-by-start slot lists, returning overlapping ranges. */
function intersectTwo(a: TimeSlot[], b: TimeSlot[]): TimeSlot[] {
  const result: TimeSlot[] = [];
  for (const slotA of a) {
    for (const slotB of b) {
      const start = slotA.startUtc > slotB.startUtc ? slotA.startUtc : slotB.startUtc;
      const end = slotA.endUtc < slotB.endUtc ? slotA.endUtc : slotB.endUtc;
      if (start < end) result.push({ startUtc: start, endUtc: end });
    }
  }
  return result;
}

/**
 * Overlap across every required/KDM participant's confirmed availability.
 * Empty input list is treated as "fully available" (a meeting with zero
 * Required/KDM participants imposes no constraint) — callers should only
 * pass availability for participants that actually gate readiness.
 */
export function intersectAll(slotLists: TimeSlot[][]): TimeSlot[] {
  if (slotLists.length === 0) return [];
  return slotLists.reduce((acc, slots) => intersectTwo(acc, slots));
}
