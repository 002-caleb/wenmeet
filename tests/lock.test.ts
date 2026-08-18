import { describe, expect, it } from "vitest";
import { isPastLockCutoff, lockCutoffUtc } from "../src/lib/scheduling/lock";

describe("isPastLockCutoff (§7 CEO directive: time-based, not retry-based)", () => {
  const proposedStart = "2026-09-10T18:00:00.000Z";

  it("is not past cutoff more than 24h before the proposed time", () => {
    expect(isPastLockCutoff(proposedStart, "2026-09-09T17:59:00.000Z")).toBe(false);
  });

  it("is past cutoff exactly at T-24h", () => {
    expect(isPastLockCutoff(proposedStart, lockCutoffUtc(proposedStart))).toBe(true);
  });

  it("is past cutoff after T-24h regardless of how close to the meeting itself", () => {
    expect(isPastLockCutoff(proposedStart, "2026-09-10T17:59:00.000Z")).toBe(true);
  });

  it("last-second submissions before T-24h are still valid — lock has no attempt ceiling", () => {
    // This function only answers "are we locked yet"; retry count never enters into it.
    // T-24h cutoff for proposedStart is 2026-09-09T18:00:00.000Z — one second before that is still open.
    expect(isPastLockCutoff(proposedStart, "2026-09-09T17:59:59.000Z")).toBe(false);
  });
});
