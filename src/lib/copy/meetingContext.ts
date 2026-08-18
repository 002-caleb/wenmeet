// docs/AVAILABILITY_CONTEXT_AND_DATE_NAV.md §27: presentation copy must
// already be resolved before it reaches a component — never let a
// component interpolate "{name} invited you" itself, since a missing name
// must fall back to safe generic copy, not a hardcoded fixture name.
import { formatDateRangeLabel } from "./dateLabels";

export interface MeetingContextViewModel {
  title: string;
  durationLabel: string;
  dateRangeLabel: string;
  meetingLocationLabel?: string;
  organizerLabel: string;
  participantCountLabel?: string;
}

export function buildMeetingContextViewModel(input: {
  title: string;
  durationMinutes: number;
  rangeStart: Date;
  rangeEnd: Date;
  location?: string;
  /** Only set this from real meeting/organizer data — never a fixture name. */
  organizerName?: string;
  participantCount?: number;
}): MeetingContextViewModel {
  return {
    title: input.title,
    durationLabel: `${input.durationMinutes} min`,
    dateRangeLabel: formatDateRangeLabel(input.rangeStart, input.rangeEnd),
    meetingLocationLabel: input.location,
    organizerLabel: input.organizerName ? `${input.organizerName} invited you` : "The organizer invited you.",
    participantCountLabel: input.participantCount ? `${input.participantCount} people` : undefined,
  };
}
