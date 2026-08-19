import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACTIVE_WEEKDAYS,
  MAX_HORIZON_DAYS,
  addMonthsToKey,
  expandHorizon,
  formatDateKeyShort,
  resolveWindow,
  validatePolicy,
  weekdayOfKey,
  windowBoundsUtc,
  zonedTimeToUtc,
  type SchedulingConstraints,
  type SchedulingPolicy,
} from "../src/lib/scheduling/policy";

const LA = "America/Los_Angeles";

/** Wed 2026-08-19, 09:00 Pacific (16:00Z — PDT is UTC−7). */
const NOW = new Date("2026-08-19T16:00:00Z");

function constraints(over: Partial<SchedulingConstraints> = {}): SchedulingConstraints {
  return {
    timezone: LA,
    activeWeekdays: [0, 1, 2, 3, 4, 5, 6], // unrestricted unless a test says otherwise
    blackoutRanges: [],
    minimumNoticeMinutes: 0,
    ...over,
  };
}

const allDays = () => constraints();
const weekdaysOnly = () => constraints({ activeWeekdays: DEFAULT_ACTIVE_WEEKDAYS });

describe("date helpers", () => {
  it("knows the weekday of a calendar date without timezone ambiguity", () => {
    expect(weekdayOfKey("2026-08-19")).toBe(3); // Wednesday
    expect(weekdayOfKey("2026-08-22")).toBe(6); // Saturday
    expect(weekdayOfKey("2026-08-23")).toBe(0); // Sunday
  });

  it("formats a date key as human-readable copy, never raw ISO", () => {
    expect(formatDateKeyShort("2026-08-24")).toBe("Aug 24");
    expect(formatDateKeyShort("2026-01-05")).toBe("Jan 5");
  });

  it("clamps month arithmetic to a real day", () => {
    expect(addMonthsToKey("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsToKey("2028-01-31", 1)).toBe("2028-02-29"); // leap year
    expect(addMonthsToKey("2026-12-15", 1)).toBe("2027-01-15"); // crosses year
  });
});

describe("rolling windows", () => {
  it("covers a 3-day window starting today", () => {
    const policy: SchedulingPolicy = { type: "rolling", amount: 3, unit: "days" };
    expect(expandHorizon(policy, LA, NOW)).toEqual(["2026-08-19", "2026-08-20", "2026-08-21"]);
  });

  it("covers a 14-day window", () => {
    const policy: SchedulingPolicy = { type: "rolling", amount: 14, unit: "days" };
    const horizon = expandHorizon(policy, LA, NOW);
    expect(horizon).toHaveLength(14);
    expect(horizon[0]).toBe("2026-08-19");
    expect(horizon[13]).toBe("2026-09-01");
  });

  it("covers a 6-month window", () => {
    const policy: SchedulingPolicy = { type: "rolling", amount: 6, unit: "months" };
    const horizon = expandHorizon(policy, LA, NOW);
    expect(horizon[0]).toBe("2026-08-19");
    // Aug 19 + 6 months, minus a day — inclusive of today, exclusive of the
    // anniversary. Still inside the product horizon, so nothing is trimmed.
    expect(horizon[horizon.length - 1]).toBe("2027-02-18");
    expect(horizon).toHaveLength(184);
  });

  it("trims anything beyond the product horizon rather than exploding", () => {
    const horizon = expandHorizon({ type: "fixed", startDate: "2026-08-19", endDate: "2030-01-01" }, LA, NOW);
    expect(horizon).toHaveLength(MAX_HORIZON_DAYS);
  });

  it("treats weeks as seven days each", () => {
    const horizon = expandHorizon({ type: "rolling", amount: 2, unit: "weeks" }, LA, NOW);
    expect(horizon).toHaveLength(14);
  });

  it("returns nothing for a nonsense amount", () => {
    expect(expandHorizon({ type: "rolling", amount: 0, unit: "days" }, LA, NOW)).toEqual([]);
  });
});

describe("fixed ranges", () => {
  it("spans a cross-month range inclusively", () => {
    const horizon = expandHorizon({ type: "fixed", startDate: "2026-08-28", endDate: "2026-09-02" }, LA, NOW);
    expect(horizon).toEqual([
      "2026-08-28",
      "2026-08-29",
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
    ]);
  });

  it("spans a cross-year range", () => {
    const horizon = expandHorizon({ type: "fixed", startDate: "2026-12-30", endDate: "2027-01-02" }, LA, NOW);
    expect(horizon).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  });

  it("rejects a reversed range rather than silently inverting it", () => {
    expect(expandHorizon({ type: "fixed", startDate: "2026-09-10", endDate: "2026-09-01" }, LA, NOW)).toEqual([]);
  });
});

describe("specific dates", () => {
  it("keeps non-contiguous dates, sorted and deduplicated", () => {
    const horizon = expandHorizon(
      { type: "specific", dates: ["2026-09-08", "2026-08-21", "2026-09-02", "2026-08-21"] },
      LA,
      NOW,
    );
    expect(horizon).toEqual(["2026-08-21", "2026-09-02", "2026-09-08"]);
  });

  it("ignores malformed entries", () => {
    const horizon = expandHorizon({ type: "specific", dates: ["2026-08-21", "not-a-date", ""] }, LA, NOW);
    expect(horizon).toEqual(["2026-08-21"]);
  });
});

describe("weekday constraints", () => {
  it("excludes weekends by default", () => {
    const resolved = resolveWindow({ type: "rolling", amount: 7, unit: "days" }, weekdaysOnly(), NOW);
    // Wed 19 → Tue 25; Sat 22 and Sun 23 drop out.
    expect(resolved.dates).toEqual([
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-24",
      "2026-08-25",
    ]);
    expect(resolved.excluded).toEqual([
      { date: "2026-08-22", reason: "weekday" },
      { date: "2026-08-23", reason: "weekday" },
    ]);
  });

  it("treats an empty weekday set as no restriction, not as excluding everything", () => {
    const resolved = resolveWindow(
      { type: "rolling", amount: 3, unit: "days" },
      constraints({ activeWeekdays: [] }),
      NOW,
    );
    expect(resolved.dates).toHaveLength(3);
  });
});

describe("blackouts", () => {
  it("removes a single blackout date", () => {
    const resolved = resolveWindow(
      { type: "rolling", amount: 4, unit: "days" },
      allDays().blackoutRanges.length === 0
        ? constraints({ blackoutRanges: [{ startDate: "2026-08-21", endDate: "2026-08-21" }] })
        : allDays(),
      NOW,
    );
    expect(resolved.dates).toEqual(["2026-08-19", "2026-08-20", "2026-08-22"]);
    expect(resolved.excluded).toEqual([{ date: "2026-08-21", reason: "blackout" }]);
  });

  it("removes a blackout range spanning a year boundary", () => {
    const resolved = resolveWindow(
      { type: "fixed", startDate: "2026-12-22", endDate: "2027-01-04" },
      constraints({ blackoutRanges: [{ startDate: "2026-12-24", endDate: "2027-01-02" }] }),
      NOW,
    );
    expect(resolved.dates).toEqual(["2026-12-22", "2026-12-23", "2027-01-03", "2027-01-04"]);
  });

  it("removes a specific date that a blackout overlaps", () => {
    const resolved = resolveWindow(
      { type: "specific", dates: ["2026-08-21", "2026-08-24", "2026-09-02"] },
      constraints({ blackoutRanges: [{ startDate: "2026-08-24", endDate: "2026-08-24" }] }),
      NOW,
    );
    expect(resolved.dates).toEqual(["2026-08-21", "2026-09-02"]);
  });

  it("tolerates a reversed blackout range", () => {
    const resolved = resolveWindow(
      { type: "rolling", amount: 3, unit: "days" },
      constraints({ blackoutRanges: [{ startDate: "2026-08-21", endDate: "2026-08-20" }] }),
      NOW,
    );
    expect(resolved.dates).toEqual(["2026-08-19"]);
  });
});

describe("minimum notice", () => {
  it("drops today when notice pushes past the end of the local day", () => {
    // 09:00 Pacific + 20h lands at 05:00 next day, past today's end.
    const resolved = resolveWindow(
      { type: "rolling", amount: 3, unit: "days" },
      constraints({ minimumNoticeMinutes: 20 * 60 }),
      NOW,
    );
    expect(resolved.dates).toEqual(["2026-08-20", "2026-08-21"]);
    expect(resolved.excluded).toEqual([{ date: "2026-08-19", reason: "notice" }]);
  });

  it("keeps today when there is still usable time left in it", () => {
    const resolved = resolveWindow(
      { type: "rolling", amount: 2, unit: "days" },
      constraints({ minimumNoticeMinutes: 2 * 60 }),
      NOW,
    );
    expect(resolved.dates).toContain("2026-08-19");
  });

  it("crosses midnight correctly for a late-evening request", () => {
    // 23:00 Pacific on the 19th = 06:00Z on the 20th.
    const lateNight = new Date("2026-08-20T06:00:00Z");
    const resolved = resolveWindow(
      { type: "rolling", amount: 3, unit: "days" },
      constraints({ minimumNoticeMinutes: 4 * 60 }),
      lateNight,
    );
    // Local date is still the 19th, but only an hour of it remains.
    expect(resolved.dates[0]).toBe("2026-08-20");
  });
});

describe("timezone behaviour", () => {
  it("resolves 'today' from the policy timezone, not the server's", () => {
    // 2026-08-20T06:00Z is still Aug 19 in LA but already Aug 20 in London.
    const at = new Date("2026-08-20T06:00:00Z");
    expect(expandHorizon({ type: "rolling", amount: 1, unit: "days" }, LA, at)).toEqual(["2026-08-19"]);
    expect(expandHorizon({ type: "rolling", amount: 1, unit: "days" }, "Europe/London", at)).toEqual([
      "2026-08-20",
    ]);
  });

  it("changing timezone can shift the whole window", () => {
    const at = new Date("2026-08-20T06:00:00Z");
    const la = resolveWindow({ type: "rolling", amount: 2, unit: "days" }, constraints({ timezone: LA }), at);
    const tokyo = resolveWindow(
      { type: "rolling", amount: 2, unit: "days" },
      constraints({ timezone: "Asia/Tokyo" }),
      at,
    );
    expect(la.dates[0]).toBe("2026-08-19");
    expect(tokyo.dates[0]).toBe("2026-08-20");
  });

  it("uses the right offset on each side of a DST boundary", () => {
    // US DST ends 2026-11-01. Oct 31 is PDT (−7), Nov 2 is PST (−8).
    const before = zonedTimeToUtc("2026-10-31", 9 * 60, LA);
    const after = zonedTimeToUtc("2026-11-02", 9 * 60, LA);
    expect(before.toISOString()).toBe("2026-10-31T16:00:00.000Z");
    expect(after.toISOString()).toBe("2026-11-02T17:00:00.000Z");
  });

  it("keeps weekday rules stable across a DST change", () => {
    const resolved = resolveWindow(
      { type: "fixed", startDate: "2026-10-29", endDate: "2026-11-04" },
      weekdaysOnly(),
      NOW,
    );
    // Sat Oct 31 and Sun Nov 1 excluded — the DST change must not shift these.
    expect(resolved.dates).toEqual([
      "2026-10-29",
      "2026-10-30",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
    ]);
  });
});

describe("window bounds for storage", () => {
  it("spans local midnight through the end of the final day", () => {
    const resolved = resolveWindow({ type: "fixed", startDate: "2026-08-24", endDate: "2026-08-25" }, allDays(), NOW);
    const bounds = windowBoundsUtc(resolved, LA)!;
    expect(bounds.windowStartUtc).toBe("2026-08-24T07:00:00.000Z"); // local midnight, PDT
    expect(new Date(bounds.windowEndUtc).toISOString()).toBe("2026-08-26T06:59:59.999Z");
  });

  it("returns null when nothing is eligible", () => {
    const resolved = resolveWindow(
      { type: "fixed", startDate: "2026-08-22", endDate: "2026-08-23" },
      weekdaysOnly(),
      NOW,
    );
    expect(resolved.dates).toEqual([]);
    expect(windowBoundsUtc(resolved, LA)).toBeNull();
  });
});

describe("validation", () => {
  it("explains when weekday rules exclude everything", () => {
    const errors = validatePolicy(
      { type: "fixed", startDate: "2026-08-22", endDate: "2026-08-23" },
      weekdaysOnly(),
      NOW,
    );
    expect(errors.join(" ")).toMatch(/working days/i);
  });

  it("explains when blackouts exclude everything", () => {
    const errors = validatePolicy(
      { type: "fixed", startDate: "2026-08-24", endDate: "2026-08-25" },
      constraints({ blackoutRanges: [{ startDate: "2026-08-24", endDate: "2026-08-25" }] }),
      NOW,
    );
    expect(errors.join(" ")).toMatch(/blackout/i);
  });

  it("explains when both rules combine to exclude everything", () => {
    const errors = validatePolicy(
      { type: "fixed", startDate: "2026-08-21", endDate: "2026-08-23" },
      constraints({
        activeWeekdays: DEFAULT_ACTIVE_WEEKDAYS,
        blackoutRanges: [{ startDate: "2026-08-21", endDate: "2026-08-21" }],
      }),
      NOW,
    );
    expect(errors.join(" ")).toMatch(/working days and blackout dates/i);
  });

  it("rejects a rolling horizon beyond what WenMeet searches", () => {
    expect(validatePolicy({ type: "rolling", amount: 52, unit: "weeks" }, allDays(), NOW).length).toBe(1);
  });

  it("requires at least one specific date", () => {
    expect(validatePolicy({ type: "specific", dates: [] }, allDays(), NOW)).toEqual([
      "Pick at least one date.",
    ]);
  });

  it("passes a sensible default policy", () => {
    expect(validatePolicy({ type: "rolling", amount: 14, unit: "days" }, weekdaysOnly(), NOW)).toEqual([]);
  });
});
