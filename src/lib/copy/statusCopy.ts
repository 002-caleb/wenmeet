import type { AvailabilityStatus, MeetingStatus, Role } from "@/lib/types";
import type { AttentionReason, MeetingLifecycle } from "@/lib/dashboard/workspaceView";
import type { GatingState } from "@/lib/scheduling/readinessDetail";

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

/**
 * Roster row translation (§29). Lives here, not in the component, for the
 * same reason describeAvailabilityStatus does: the internal enum value
 * needs_confirmation must never appear as literal source text in a
 * customer-facing file (src/app, src/components) — the copy-lint enforces
 * this repo-wide, and src/lib/copy is its documented exemption boundary.
 */
export function describeGatingState(state: GatingState): { label: string; icon: string } {
  switch (state) {
    case "confirmed":
    case "submitted":
      return { label: "Available", icon: "✓" };
    case "needs_confirmation":
      return { label: "Confirm timezone", icon: "!" };
    case "waiting":
      return { label: "Waiting", icon: "○" };
  }
}

/**
 * §37: response freshness, always shown rather than left to a raw
 * timestamp. §40: precise language throughout — never "almost ready" or
 * "mostly available".
 */
export function describeFreshness(updatedAtIso: string, now: Date = new Date()): string {
  const updated = new Date(updatedAtIso);
  const startOfUpdated = new Date(updated.getFullYear(), updated.getMonth(), updated.getDate());
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDiff = Math.round((startOfNow.getTime() - startOfUpdated.getTime()) / 86400000);

  if (dayDiff <= 0) return "Updated today";
  if (dayDiff === 1) return "Updated yesterday";
  if (dayDiff <= 6) return `Updated ${dayDiff} days ago`;
  return `Updated ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(updated)}`;
}

export interface KdmSummary {
  kdmReady: number;
  kdmTotal: number;
  requiredReady: number;
  requiredTotal: number;
}

/** §40: the exact phrasing this product commits to — no softened substitutes. */
export function describeKdmReadiness({ kdmReady, kdmTotal, requiredReady, requiredTotal }: KdmSummary): string {
  if (kdmTotal === 0) {
    return requiredReady === requiredTotal ? "All required attendees can attend" : `Waiting on ${requiredTotal - requiredReady} required`;
  }
  if (kdmReady < kdmTotal) {
    const waiting = kdmTotal - kdmReady;
    return `Waiting on ${waiting} KDM${waiting === 1 ? "" : "s"}`;
  }
  if (requiredReady < requiredTotal) {
    return "All KDMs responded";
  }
  return kdmTotal === 1 ? "The key decision maker can attend" : "All key decision makers can attend";
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
