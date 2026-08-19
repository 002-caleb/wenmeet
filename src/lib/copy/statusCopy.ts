import type { AvailabilityStatus, MeetingStatus, Role } from "@/lib/types";
import type { AttentionReason, MeetingLifecycle } from "@/lib/dashboard/workspaceView";

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

/** Compact glyphs for the same three gating roles used on the marketing resolver — kept in sync so the promise matches the product. */
export const ROLE_SYMBOL: Record<"required" | "kdm" | "optional", string> = {
  required: "●",
  kdm: "◆",
  optional: "○",
};

export const ROLE_SYMBOL_LABEL: Record<"required" | "kdm" | "optional", string> = {
  required: "Required",
  kdm: "Decision",
  optional: "Optional",
};

/**
 * Workspace dashboard translation layer. The dashboard consumes the two
 * canonical primitives (lifecycle, attention) — these turn them into the
 * only strings allowed to reach the screen.
 */

export function describeLifecycle(lifecycle: MeetingLifecycle): string {
  switch (lifecycle) {
    case "collecting":
      return "Collecting";
    case "ready":
      return "Ready";
    case "booked":
      return "Booked";
  }
}

export interface AttentionCopy {
  /** Short chip: why this is in the attention queue. */
  label: string;
  /** One line explaining what happened, in the host's language. */
  detail: string;
  /** The single next thing to do. */
  action: string;
  tone: "ready" | "blocked";
}

export function describeAttention(reason: AttentionReason): AttentionCopy {
  switch (reason) {
    case "match_ready":
      return {
        label: "Best match ready",
        detail: "Everyone required can make this time.",
        action: "Review match",
        tone: "ready",
      };
    case "no_valid_slot":
      return {
        label: "No time works yet",
        detail: "There's no overlap across everyone required in this date range.",
        action: "Review options",
        tone: "blocked",
      };
    case "needs_rescheduling":
      return {
        label: "Needs a new time",
        detail: "Someone required dropped out after this was booked.",
        action: "Find another time",
        tone: "blocked",
      };
  }
}
