import type { TimeSlot } from "../types";

/**
 * Seam for live calendar busy/free data — the availability grid should be
 * a live source of truth, not a static submission.
 *
 * Google is real (src/lib/calendar/providers.ts, backed by the OAuth flow
 * under src/app/api/auth/google/). Microsoft is still a stub — same
 * priority as Google (see README), not yet built.
 */
export interface CalendarProvider {
  readonly kind: "google" | "microsoft";

  /**
   * Returns busy blocks for a participant within [rangeStartUtc, rangeEndUtc],
   * including time already consumed by other concurrent WenMeet-scheduled
   * meetings competing for the same slots.
   */
  getBusyBlocks(participantId: string, rangeStartUtc: string, rangeEndUtc: string): Promise<TimeSlot[]>;
}

export class NotImplementedCalendarProvider implements CalendarProvider {
  constructor(readonly kind: "google" | "microsoft") {}

  async getBusyBlocks(): Promise<TimeSlot[]> {
    throw new Error(
      `${this.kind} calendar sync is not implemented in this scaffold yet. ` +
        "Availability is currently static-painted only (see PRD §12 implementation status).",
    );
  }
}
