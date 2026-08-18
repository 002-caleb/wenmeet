const LOCK_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * PRD §7 (CEO directive): the meeting auto-locks 24 hours before the
 * scheduled time, regardless of retry count. This replaces the original
 * retry-ceiling approach entirely — there is no attempt counter that can
 * block or extend this cutoff. Availability may keep changing freely
 * right up until T-24h.
 */
export function isPastLockCutoff(proposedSlotStartUtc: string, nowUtc: string): boolean {
  const lockAt = new Date(proposedSlotStartUtc).getTime() - LOCK_WINDOW_MS;
  return new Date(nowUtc).getTime() >= lockAt;
}

export function lockCutoffUtc(proposedSlotStartUtc: string): string {
  return new Date(new Date(proposedSlotStartUtc).getTime() - LOCK_WINDOW_MS).toISOString();
}
