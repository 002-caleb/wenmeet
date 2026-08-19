import { DEFAULT_ACTIVE_WEEKDAYS } from "../../src/lib/scheduling/policy";
import type { Meeting } from "../../src/lib/types";

export type MeetingInput = Omit<Meeting, "id" | "createdAt">;

/**
 * A complete, valid meeting for tests, with only the fields a given test
 * cares about overridden.
 *
 * Exists because `Meeting` is wide and grows: without this, every new field
 * breaks every fixture in every test file at once, which is noise rather
 * than signal.
 */
export function meetingInput(over: Partial<MeetingInput> = {}): MeetingInput {
  return {
    title: "Test meeting",
    organizerId: "organizer",
    shareToken: `tok-${Math.random().toString(36).slice(2, 10)}`,
    durationMinutes: 30,
    schedulingPolicy: { type: "fixed", startDate: "2026-09-01", endDate: "2026-09-10" },
    schedulingConstraints: {
      timezone: "UTC",
      activeWeekdays: DEFAULT_ACTIVE_WEEKDAYS,
      blackoutRanges: [],
      minimumNoticeMinutes: 0,
    },
    windowStartUtc: "2026-09-01T00:00:00Z",
    windowEndUtc: "2026-09-10T00:00:00Z",
    location: null,
    responseDeadlineUtc: null,
    decisionDependent: false,
    status: "collecting",
    proposedSlot: null,
    currentSnapshotId: null,
    ...over,
  };
}
