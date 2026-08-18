import type { TimeSlot } from "../types";

/**
 * Seam for live calendar busy/free data (PRD §12 — "the availability grid
 * is a live source of truth, not a static submission", confirmed V1 scope).
 *
 * This scaffold implements the interface and where it plugs into the
 * scheduling engine, but the actual OAuth + calendar-read wiring for
 * Google and Microsoft is stubbed — same status as the original PRD's
 * "Google OAuth: stubbed" note. Build sequencing still needs a pass to
 * make CalendarProvider.getBusyBlocks return real data; until then the
 * app runs on statically painted availability only, matching the
 * "Not yet reflected in the build" flag in the PRD.
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
