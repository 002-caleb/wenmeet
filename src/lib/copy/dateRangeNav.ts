// docs/AVAILABILITY_CONTEXT_AND_DATE_NAV.md §28: the UI must never allow
// navigation beyond the meeting's legal scheduling window.
import { addDays, formatDateRangeLabel } from "./dateLabels";

export interface DateRangeNavigationViewModel {
  visibleStart: Date;
  visibleEnd: Date;
  meetingStart: Date;
  meetingEnd: Date;
  canGoPrevious: boolean;
  canGoNext: boolean;
  label: string;
}

export function buildDateRangeNavigationViewModel(
  visibleStart: Date,
  visibleDays: number,
  meetingStart: Date,
  meetingEnd: Date,
): DateRangeNavigationViewModel {
  const visibleEnd = addDays(visibleStart, visibleDays - 1);
  return {
    visibleStart,
    visibleEnd,
    meetingStart,
    meetingEnd,
    canGoPrevious: visibleStart > meetingStart,
    canGoNext: visibleEnd < meetingEnd,
    label: formatDateRangeLabel(visibleStart, visibleEnd),
  };
}
