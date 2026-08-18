import type { TimeSlot } from "../types";

/**
 * Seam for live calendar busy/free data — the availability grid should be
 * a live source of truth, not a static submission.
 *
 * Both Google and Microsoft are real now (src/lib/calendar/providers.ts,
 * backed by the OAuth flows under src/app/api/auth/{google,microsoft}/).
 * `NotImplementedCalendarProvider` below is kept as the seam for adding a
 * future provider without touching the scheduling engine.
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
