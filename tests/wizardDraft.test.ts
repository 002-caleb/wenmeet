import { describe, expect, it } from "vitest";
import {
  emptyDraft,
  roleCounts,
  toDeadlineUtc,
  toWindowUtc,
  validateStep,
  type WizardDraft,
} from "../src/lib/wizard/draft";

function draft(over: Partial<WizardDraft> = {}): WizardDraft {
  return { ...emptyDraft("America/Los_Angeles"), title: "Board strategy call", ...over };
}

describe("wizard validation", () => {
  it("requires a meeting name", () => {
    expect(validateStep("Meeting", draft({ title: "   " }))).toContain("Give the meeting a name.");
  });

  it("rejects an end date before the start date", () => {
    const errors = validateStep(
      "Meeting",
      draft({ policy: { type: "fixed", startDate: "2026-09-10", endDate: "2026-09-01" } }),
    );
    expect(errors.join(" ")).toMatch(/end date/i);
  });

  it("accepts a single-day window on a working day", () => {
    // 2026-09-01 is a Tuesday.
    expect(
      validateStep("Meeting", draft({ policy: { type: "fixed", startDate: "2026-09-01", endDate: "2026-09-01" } })),
    ).toEqual([]);
  });

  it("surfaces a policy that excludes every day", () => {
    // Sat + Sun only, with weekdays-only working days.
    const errors = validateStep(
      "Meeting",
      draft({ policy: { type: "fixed", startDate: "2026-09-05", endDate: "2026-09-06" } }),
    );
    expect(errors.join(" ")).toMatch(/working days/i);
  });

  it("does not require participants — the share link is a supported path", () => {
    expect(validateStep("People", draft({ invites: [] }))).toEqual([]);
  });

  it("flags a malformed participant email", () => {
    const errors = validateStep(
      "People",
      draft({ invites: [{ key: "a", name: "Cindy", email: "cindy-at-company", role: "kdm" }] }),
    );
    expect(errors.join(" ")).toMatch(/doesn't look like an email/i);
  });

  it("requires a real URL for a custom meeting link", () => {
    expect(validateStep("Place", draft({ locationKind: "custom_link", locationDetail: "zoom" })).length).toBe(1);
    expect(
      validateStep("Place", draft({ locationKind: "custom_link", locationDetail: "https://zoom.us/j/1" })),
    ).toEqual([]);
  });

  it("rejects a non-http scheme on a custom link", () => {
    const errors = validateStep(
      "Place",
      draft({ locationKind: "custom_link", locationDetail: "javascript:alert(1)" }),
    );
    expect(errors.length).toBe(1);
  });

  it("does not demand a link for the other meeting kinds", () => {
    for (const kind of ["google_meet", "teams", "phone", "in_person", "undecided"] as const) {
      expect(validateStep("Place", draft({ locationKind: kind }))).toEqual([]);
    }
  });
});

describe("window conversion", () => {
  it("resolves the policy into real UTC bounds", () => {
    const bounds = toWindowUtc(
      draft({ policy: { type: "fixed", startDate: "2026-09-01", endDate: "2026-09-03" } }),
    )!;
    expect(bounds).not.toBeNull();
    expect(bounds.windowStartUtc < bounds.windowEndUtc).toBe(true);
    // Tue 1 → Thu 3 are all weekdays, so all three survive.
    expect(bounds.windowStartUtc.slice(0, 10)).toBe("2026-09-01");
  });

  it("returns null when the rules leave nothing", () => {
    // A weekend-only fixed range against weekdays-only working days.
    expect(toWindowUtc(draft({ policy: { type: "fixed", startDate: "2026-09-05", endDate: "2026-09-06" } }))).toBeNull();
  });
});

describe("response deadline", () => {
  it("is null when the organizer sets none", () => {
    expect(toDeadlineUtc(draft({ deadlineChoice: "none" }))).toBeNull();
  });

  it("resolves relative choices to real instants in the future", () => {
    const in24 = toDeadlineUtc(draft({ deadlineChoice: "24h" }))!;
    expect(new Date(in24).getTime()).toBeGreaterThan(Date.now());
  });

  it("uses the chosen date for a custom deadline", () => {
    const iso = toDeadlineUtc(draft({ deadlineChoice: "custom", deadlineDate: "2026-09-05" }))!;
    expect(new Date(iso).getDate()).toBe(5);
  });
});

describe("role counts", () => {
  it("always counts the organizer as required", () => {
    expect(roleCounts(draft({ invites: [] })).required).toBe(1);
  });

  it("counts named invitees by role and ignores blank rows", () => {
    const counts = roleCounts(
      draft({
        invites: [
          { key: "1", name: "Aman", email: "aman@x.com", role: "required" },
          { key: "2", name: "Cindy", email: "cindy@x.com", role: "kdm" },
          { key: "3", name: "Brad", email: "brad@x.com", role: "optional" },
          { key: "4", name: "", email: "   ", role: "required" },
        ],
      }),
    );
    expect(counts).toEqual({ required: 2, decision: 1, optional: 1 });
  });
});
