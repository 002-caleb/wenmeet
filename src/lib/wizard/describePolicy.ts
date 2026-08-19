import {
  resolveWindow,
  weekdayOfKey,
  type SchedulingConstraints,
  type SchedulingPolicy,
} from "@/lib/scheduling/policy";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** "Mon–Fri" when contiguous, otherwise "Mon, Wed, Fri". */
function describeWeekdays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0 || sorted.length === 7) return "Any day";

  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1]! + 1);
  if (contiguous && sorted.length > 2) {
    return `${DAY_NAMES[sorted[0]!]}–${DAY_NAMES[sorted[sorted.length - 1]!]}`;
  }
  return sorted.map((d) => DAY_NAMES[d]).join(", ");
}

function describeNotice(minutes: number): string | null {
  if (minutes <= 0) return null;
  if (minutes % (24 * 60) === 0) return `${pluralize(minutes / (24 * 60), "day")} notice`;
  if (minutes % 60 === 0) return `${pluralize(minutes / 60, "hour")} notice`;
  return `${pluralize(minutes, "minute")} notice`;
}

/**
 * The policy in the organizer's language — what they chose, not the raw form
 * values. "Next 6 weeks · Mon–Fri" beats "2026-08-19 → 2026-09-30".
 */
export function describePolicy(
  policy: SchedulingPolicy,
  constraints: SchedulingConstraints,
  now: Date = new Date(),
): { range: string; rules: string; eligibleDays: number } {
  let range: string;
  if (policy.type === "rolling") {
    const unit = policy.amount === 1 ? policy.unit.replace(/s$/, "") : policy.unit;
    range = `Next ${policy.amount} ${unit}`;
  } else if (policy.type === "fixed") {
    range = policy.startDate && policy.endDate ? `${policy.startDate} → ${policy.endDate}` : "Pick dates";
  } else {
    const n = policy.dates.length;
    range = n === 0 ? "No dates picked" : `${pluralize(n, "specific date")}`;
  }

  const resolved = resolveWindow(policy, constraints, now);
  const blackoutCount = resolved.excluded.filter((e) => e.reason === "blackout").length;

  const parts = [describeWeekdays(constraints.activeWeekdays)];
  if (blackoutCount > 0) parts.push(`${pluralize(blackoutCount, "date")} blocked`);
  const notice = describeNotice(constraints.minimumNoticeMinutes);
  if (notice) parts.push(notice);

  return {
    range,
    rules: parts.join(" · "),
    eligibleDays: resolved.dates.length,
  };
}

/** Longer form for the meeting detail page. */
export function describePolicyLines(
  policy: SchedulingPolicy,
  constraints: SchedulingConstraints,
  now: Date = new Date(),
): string[] {
  const { range, rules, eligibleDays } = describePolicy(policy, constraints, now);
  return [range, rules, `${pluralize(eligibleDays, "day")} searchable`];
}

export { describeWeekdays };
