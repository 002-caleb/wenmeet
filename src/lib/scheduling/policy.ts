/**
 * Scheduling policy — the search space WenMeet looks in.
 *
 * A window is not two dates. It is a range paradigm, plus recurring rules,
 * plus exceptions, evaluated in a specific time context. Those three are
 * deliberately separate concerns here: the paradigm (rolling / fixed /
 * specific) is mutually exclusive, while weekday rules, blackouts and
 * minimum notice are constraints applied on top of whichever paradigm is
 * chosen.
 *
 * Everything below operates on **local calendar dates** (YYYY-MM-DD) in the
 * policy timezone, not instants. That is the key simplification: a calendar
 * date's day-of-week is a property of the date itself, so weekday rules and
 * blackouts cannot drift across a DST boundary. The timezone only matters at
 * the two edges — deciding what "today" is, and converting a resolved date
 * back into UTC instants.
 */

export type RollingUnit = "days" | "weeks" | "months";

export type SchedulingPolicy =
  | { type: "rolling"; amount: number; unit: RollingUnit }
  | { type: "fixed"; startDate: string; endDate: string }
  | { type: "specific"; dates: string[] };

export interface BlackoutRange {
  startDate: string;
  endDate: string;
}

export interface SchedulingConstraints {
  /** IANA id. Never a fixed UTC offset — that would break across DST. */
  timezone: string;
  /** 0 = Sunday … 6 = Saturday. */
  activeWeekdays: number[];
  blackoutRanges: BlackoutRange[];
  minimumNoticeMinutes: number;
}

export type ExclusionReason = "weekday" | "blackout" | "notice";

export interface ResolvedWindow {
  /** Eligible dates, ascending. */
  dates: string[];
  /** Every date in the horizon that was ruled out, and why — drives the preview. */
  excluded: Array<{ date: string; reason: ExclusionReason }>;
  /** First and last date the paradigm considered, before constraints. */
  horizonStart: string;
  horizonEnd: string;
}

/**
 * Bounds a rolling window. Six months of candidate dates is already an
 * unusual ask; beyond that the preview becomes unreadable and the value to
 * the scheduling engine is negligible.
 */
export const MAX_HORIZON_DAYS = 200;

export const DEFAULT_ACTIVE_WEEKDAYS = [1, 2, 3, 4, 5];

// ---------------------------------------------------------------------------
// Date-key helpers. All arithmetic goes through UTC so it is DST-immune; the
// keys themselves carry no timezone meaning.
// ---------------------------------------------------------------------------

export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function keyToUtcMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

function utcMsToKey(ms: number): string {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysToKey(key: string, days: number): string {
  return utcMsToKey(keyToUtcMs(key) + days * 86400000);
}

/** Calendar-month arithmetic, clamping to the last valid day (Jan 31 + 1mo = Feb 28/29). */
export function addMonthsToKey(key: string, months: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const target = new Date(Date.UTC(y!, m! - 1 + months, 1));
  const daysInTarget = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return utcMsToKey(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d!, daysInTarget)));
}

/** 0 = Sunday … 6 = Saturday. Independent of any timezone. */
export function weekdayOfKey(key: string): number {
  return new Date(keyToUtcMs(key)).getUTCDay();
}

/** "Aug 24" — for surfacing a date key in copy, never the raw ISO string. */
export function formatDateKeyShort(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y!, m! - 1, d!)),
  );
}

export function daysBetweenKeys(a: string, b: string): number {
  return Math.round((keyToUtcMs(b) - keyToUtcMs(a)) / 86400000);
}

/** What calendar date it currently is, as seen from the policy timezone. */
export function todayKeyInZone(timezone: string, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    // en-CA yields YYYY-MM-DD.
    if (isDateKey(parts)) return parts;
  } catch {
    // Unknown zone — fall through to UTC rather than throwing mid-render.
  }
  return utcMsToKey(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Offset in minutes for a zone at a given instant. Recomputed per instant so
 * a window spanning a DST change gets the right offset on each side.
 */
function zoneOffsetMinutes(timezone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(at).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour === "24" ? "0" : p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/**
 * A local wall-clock time on a given date in a zone, as a UTC instant.
 * Iterates once because the offset itself depends on the instant we are
 * trying to find — the standard fixed-point for this conversion.
 */
export function zonedTimeToUtc(dateKey: string, minutesIntoDay: number, timezone: string): Date {
  const naive = keyToUtcMs(dateKey) + minutesIntoDay * 60000;
  let guess = new Date(naive - zoneOffsetMinutes(timezone, new Date(naive)) * 60000);
  guess = new Date(naive - zoneOffsetMinutes(timezone, guess) * 60000);
  return guess;
}

// ---------------------------------------------------------------------------
// Paradigm expansion
// ---------------------------------------------------------------------------

/** The dates a paradigm considers, before any constraint is applied. */
export function expandHorizon(
  policy: SchedulingPolicy,
  timezone: string,
  now: Date = new Date(),
): string[] {
  const today = todayKeyInZone(timezone, now);

  if (policy.type === "specific") {
    return [...new Set(policy.dates.filter(isDateKey))].sort();
  }

  if (policy.type === "fixed") {
    if (!isDateKey(policy.startDate) || !isDateKey(policy.endDate)) return [];
    if (policy.endDate < policy.startDate) return [];
    const span = Math.min(daysBetweenKeys(policy.startDate, policy.endDate), MAX_HORIZON_DAYS - 1);
    return Array.from({ length: span + 1 }, (_, i) => addDaysToKey(policy.startDate, i));
  }

  // Rolling: today through today + amount, inclusive of today.
  const amount = Math.floor(policy.amount);
  if (!Number.isFinite(amount) || amount < 1) return [];

  let end: string;
  if (policy.unit === "days") end = addDaysToKey(today, amount - 1);
  else if (policy.unit === "weeks") end = addDaysToKey(today, amount * 7 - 1);
  else end = addDaysToKey(addMonthsToKey(today, amount), -1);

  const span = Math.min(daysBetweenKeys(today, end), MAX_HORIZON_DAYS - 1);
  if (span < 0) return [today];
  return Array.from({ length: span + 1 }, (_, i) => addDaysToKey(today, i));
}

function inAnyBlackout(dateKey: string, ranges: BlackoutRange[]): boolean {
  return ranges.some((r) => {
    if (!isDateKey(r.startDate) || !isDateKey(r.endDate)) return false;
    // Tolerate a reversed range rather than silently ignoring it.
    const [lo, hi] = r.startDate <= r.endDate ? [r.startDate, r.endDate] : [r.endDate, r.startDate];
    return dateKey >= lo && dateKey <= hi;
  });
}

/**
 * Applies constraints to a paradigm's horizon, in the documented order:
 *
 *   paradigm boundary → timezone → working weekday → blackouts → minimum notice
 *
 * Downstream stages (organizer availability, participant availability,
 * role-aware viability, ranking) live in the engine, not here — this function
 * only decides which *dates* are worth asking about.
 */
export function resolveWindow(
  policy: SchedulingPolicy,
  constraints: SchedulingConstraints,
  now: Date = new Date(),
): ResolvedWindow {
  const horizon = expandHorizon(policy, constraints.timezone, now);
  const dates: string[] = [];
  const excluded: ResolvedWindow["excluded"] = [];

  // An empty weekday set would silently exclude everything, which is never
  // what someone means — treat it as "no weekday restriction".
  const activeWeekdays =
    constraints.activeWeekdays.length > 0 ? new Set(constraints.activeWeekdays) : null;

  const noticeMinutes = Math.max(0, constraints.minimumNoticeMinutes || 0);
  const earliestUsable = new Date(now.getTime() + noticeMinutes * 60000);

  for (const date of horizon) {
    if (activeWeekdays && !activeWeekdays.has(weekdayOfKey(date))) {
      excluded.push({ date, reason: "weekday" });
      continue;
    }
    if (inAnyBlackout(date, constraints.blackoutRanges)) {
      excluded.push({ date, reason: "blackout" });
      continue;
    }
    // A date survives notice only if some part of it is still bookable. The
    // end of the local day is the latest moment it could offer.
    const endOfDay = zonedTimeToUtc(date, 24 * 60, constraints.timezone);
    if (endOfDay <= earliestUsable) {
      excluded.push({ date, reason: "notice" });
      continue;
    }
    dates.push(date);
  }

  return {
    dates,
    excluded,
    horizonStart: horizon[0] ?? "",
    horizonEnd: horizon[horizon.length - 1] ?? "",
  };
}

/** The UTC instants a resolved window spans, for storage on the meeting. */
export function windowBoundsUtc(
  resolved: ResolvedWindow,
  timezone: string,
): { windowStartUtc: string; windowEndUtc: string } | null {
  const first = resolved.dates[0];
  const last = resolved.dates[resolved.dates.length - 1];
  if (!first || !last) return null;
  return {
    windowStartUtc: zonedTimeToUtc(first, 0, timezone).toISOString(),
    // End of the final day, so a participant can offer any time on it.
    windowEndUtc: new Date(zonedTimeToUtc(last, 24 * 60, timezone).getTime() - 1).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validatePolicy(
  policy: SchedulingPolicy,
  constraints: SchedulingConstraints,
  now: Date = new Date(),
): string[] {
  const errors: string[] = [];

  if (policy.type === "rolling") {
    if (!Number.isFinite(policy.amount) || Math.floor(policy.amount) < 1) {
      errors.push("Enter how far ahead WenMeet should look.");
    } else {
      const horizonDays =
        policy.unit === "days" ? policy.amount : policy.unit === "weeks" ? policy.amount * 7 : policy.amount * 31;
      if (horizonDays > MAX_HORIZON_DAYS) {
        errors.push(`That's further ahead than WenMeet searches — keep it within about ${Math.floor(MAX_HORIZON_DAYS / 7)} weeks.`);
      }
    }
  }

  if (policy.type === "fixed") {
    if (!isDateKey(policy.startDate) || !isDateKey(policy.endDate)) {
      errors.push("Pick a start and end date.");
    } else if (policy.endDate < policy.startDate) {
      errors.push("The end date has to come after the start date.");
    }
  }

  if (policy.type === "specific") {
    if (policy.dates.filter(isDateKey).length === 0) {
      errors.push("Pick at least one date.");
    }
  }

  if (errors.length > 0) return errors;

  // Only worth checking once the policy itself is coherent.
  const resolved = resolveWindow(policy, constraints, now);
  if (resolved.dates.length === 0) {
    const byReason = new Set(resolved.excluded.map((e) => e.reason));
    if (byReason.has("weekday") && byReason.has("blackout")) {
      errors.push("Your working days and blackout dates exclude every day in this window.");
    } else if (byReason.has("weekday")) {
      errors.push("No day in this window falls on one of your working days.");
    } else if (byReason.has("blackout")) {
      errors.push("Your blackout dates exclude every day in this window.");
    } else if (byReason.has("notice")) {
      errors.push("Every day in this window is inside your minimum notice period.");
    } else {
      errors.push("No scheduling days remain in this window.");
    }
  }

  return errors;
}
