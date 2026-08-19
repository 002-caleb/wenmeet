import type { AssignableRole, MeetingLocationKind } from "@/lib/types";
import {
  DEFAULT_ACTIVE_WEEKDAYS,
  addDaysToKey,
  resolveWindow,
  todayKeyInZone,
  validatePolicy,
  windowBoundsUtc,
  type SchedulingConstraints,
  type SchedulingPolicy,
} from "@/lib/scheduling/policy";

/** The five steps, in order. Index is the step number - 1. */
export const WIZARD_STEPS = ["Meeting", "People", "Availability", "Place", "Review"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export interface DraftInvite {
  /** Local-only id so React keys survive reordering and edits. */
  key: string;
  name: string;
  email: string;
  role: AssignableRole;
}

export interface WizardDraft {
  title: string;
  durationMinutes: number;
  /** The search space. Replaces the old start/end pair. */
  policy: SchedulingPolicy;
  constraints: SchedulingConstraints;
  timezone: string;
  /** True while `timezone` is still the browser's guess. */
  timezoneDetected: boolean;
  invites: DraftInvite[];
  locationKind: MeetingLocationKind;
  locationDetail: string;
  /** "none" | "24h" | "48h" | "custom" */
  deadlineChoice: string;
  /** Local YYYY-MM-DD, only meaningful when deadlineChoice === "custom". */
  deadlineDate: string;
}

export const DURATION_OPTIONS = [15, 30, 45, 60] as const;

export function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function emptyDraft(timezone: string): WizardDraft {
  const today = new Date();
  return {
    title: "",
    durationMinutes: 30,
    policy: { type: "rolling", amount: 14, unit: "days" },
    constraints: {
      timezone,
      activeWeekdays: DEFAULT_ACTIVE_WEEKDAYS,
      blackoutRanges: [],
      minimumNoticeMinutes: 0,
    },
    timezone,
    timezoneDetected: true,
    invites: [],
    locationKind: "undecided",
    locationDetail: "",
    deadlineChoice: "none",
    deadlineDate: toDateInput(addDays(today, 2)),
  };
}

/**
 * Blocking problems for a given step, in the user's language. An empty array
 * means the step may be left. Steps are only gated where continuing would
 * produce a meeting the engine cannot use.
 */
export function validateStep(step: WizardStep, draft: WizardDraft): string[] {
  const errors: string[] = [];

  if (step === "Meeting") {
    if (!draft.title.trim()) errors.push("Give the meeting a name.");
    errors.push(...validatePolicy(draft.policy, draft.constraints));
  }

  if (step === "People") {
    // Participants are optional here on purpose: the share link is a
    // supported way to gather people, so requiring emails up front would
    // block a real workflow.
    for (const invite of draft.invites) {
      if (invite.email.trim() && !invite.email.includes("@")) {
        errors.push(`"${invite.email.trim()}" doesn't look like an email address.`);
        break;
      }
    }
  }

  if (step === "Place") {
    if (draft.locationKind === "custom_link") {
      const detail = draft.locationDetail.trim();
      let ok = false;
      try {
        ok = ["http:", "https:"].includes(new URL(detail).protocol);
      } catch {
        ok = false;
      }
      if (!ok) errors.push("Add a full meeting link starting with https://");
    }
    if (draft.deadlineChoice === "custom" && !draft.deadlineDate) {
      errors.push("Pick a date for the response deadline.");
    }
  }

  return errors;
}

/** Resolved bounds of the draft's policy, or null if nothing is eligible. */
export function toWindowUtc(draft: WizardDraft): { windowStartUtc: string; windowEndUtc: string } | null {
  return windowBoundsUtc(resolveWindow(draft.policy, draft.constraints), draft.constraints.timezone);
}

export function toDeadlineUtc(draft: WizardDraft): string | null {
  if (draft.deadlineChoice === "none") return null;
  if (draft.deadlineChoice === "24h") return new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  if (draft.deadlineChoice === "48h") return new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  if (draft.deadlineChoice === "custom" && draft.deadlineDate) {
    const [y, m, d] = draft.deadlineDate.split("-").map(Number);
    return new Date(y!, m! - 1, d!, 17, 0, 0, 0).toISOString();
  }
  return null;
}

export function roleCounts(draft: WizardDraft) {
  const named = draft.invites.filter((i) => i.email.trim());
  return {
    // The organizer is always required and always attends.
    required: named.filter((i) => i.role === "required").length + 1,
    decision: named.filter((i) => i.role === "kdm").length,
    optional: named.filter((i) => i.role === "optional").length,
  };
}
