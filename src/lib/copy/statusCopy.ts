import type { AvailabilityStatus, MeetingStatus, Role } from "@/lib/types";

/**
 * docs/FRONTEND_PRODUCT_SYSTEM.md §5: raw application state must pass
 * through a presentation layer before rendering. Internal enum values
 * stay in logs and API payloads; only these strings reach the UI.
 */

export function describeAvailabilityStatus(status: AvailabilityStatus, participantName: string): string {
  switch (status) {
    case "submitted":
      return `Waiting for ${participantName}`;
    case "needs_confirmation":
      return "Still good?";
    case "confirmed":
      return `${participantName} is ready`;
  }
}

export function describeMeetingStatus(status: MeetingStatus): string {
  switch (status) {
    case "collecting":
      return "Waiting for availability";
    case "ready":
      return "Everyone's ready";
    case "no_valid_slot":
      return "No time works for everyone yet.";
    case "locked":
      return "Confirmed";
    case "needs_rescheduling":
      return "We need another time";
  }
}

const ROLE_LABEL: Record<Role, string> = {
  organizer: "Organizer",
  required: "Required",
  kdm: "Decision maker",
  optional: "Optional",
};

export function describeRole(role: Role): string {
  return ROLE_LABEL[role];
}

export function roleTooltip(role: Role): string | null {
  return role === "kdm" ? "This meeting won't be booked without them." : null;
}
