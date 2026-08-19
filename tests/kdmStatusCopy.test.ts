import { describe, expect, it } from "vitest";
import { describeFreshness, describeKdmReadiness } from "../src/lib/copy/statusCopy";

describe("describeFreshness (§37)", () => {
  const now = new Date("2026-08-19T18:00:00Z");

  it("says 'today' for the same calendar day", () => {
    expect(describeFreshness("2026-08-19T09:00:00Z", now)).toBe("Updated today");
  });

  it("says 'yesterday' for exactly one day back", () => {
    expect(describeFreshness("2026-08-18T09:00:00Z", now)).toBe("Updated yesterday");
  });

  it("counts days for anything under a week", () => {
    expect(describeFreshness("2026-08-16T09:00:00Z", now)).toBe("Updated 3 days ago");
  });

  it("falls back to a calendar date beyond a week", () => {
    expect(describeFreshness("2026-08-01T09:00:00Z", now)).toBe("Updated Aug 1");
  });
});

describe("describeKdmReadiness (§40 — precise language, never vague)", () => {
  it("says all KDMs can attend when everyone is ready", () => {
    expect(describeKdmReadiness({ kdmReady: 2, kdmTotal: 2, requiredReady: 1, requiredTotal: 1 })).toBe(
      "All key decision makers can attend",
    );
  });

  it("uses singular phrasing for exactly one KDM", () => {
    expect(describeKdmReadiness({ kdmReady: 1, kdmTotal: 1, requiredReady: 1, requiredTotal: 1 })).toBe(
      "The key decision maker can attend",
    );
  });

  it("names the KDM count still waiting, not a vague 'almost ready'", () => {
    const msg = describeKdmReadiness({ kdmReady: 1, kdmTotal: 2, requiredReady: 3, requiredTotal: 3 });
    expect(msg).toBe("Waiting on 1 KDM");
    expect(msg).not.toMatch(/almost|mostly/i);
  });

  it("reports required attendees once every KDM is ready", () => {
    expect(describeKdmReadiness({ kdmReady: 2, kdmTotal: 2, requiredReady: 1, requiredTotal: 3 })).toBe(
      "All KDMs responded",
    );
  });

  it("falls back to required-only language when there are no KDMs", () => {
    expect(describeKdmReadiness({ kdmReady: 0, kdmTotal: 0, requiredReady: 2, requiredTotal: 2 })).toBe(
      "All required attendees can attend",
    );
    expect(describeKdmReadiness({ kdmReady: 0, kdmTotal: 0, requiredReady: 1, requiredTotal: 3 })).toBe(
      "Waiting on 2 required",
    );
  });
});
