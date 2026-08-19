import { describe, expect, it } from "vitest";
import { InMemoryStore } from "../src/lib/store/InMemoryStore";
import { generateShareToken, isValidShareTokenShape } from "../src/lib/shareToken";

describe("share tokens", () => {
  it("generates tokens of the expected shape", () => {
    for (let i = 0; i < 50; i++) {
      expect(isValidShareTokenShape(generateShareToken())).toBe(true);
    }
  });

  it("excludes look-alike characters so a link survives being read aloud", () => {
    const sample = Array.from({ length: 200 }, () => generateShareToken()).join("");
    for (const banned of ["0", "o", "1", "l", "i"]) {
      expect(sample).not.toContain(banned);
    }
  });

  it("does not repeat across many generations", () => {
    const seen = new Set(Array.from({ length: 2000 }, () => generateShareToken()));
    expect(seen.size).toBe(2000);
  });

  it("rejects malformed tokens before they reach the database", () => {
    expect(isValidShareTokenShape("")).toBe(false);
    expect(isValidShareTokenShape("short")).toBe(false);
    expect(isValidShareTokenShape("UPPERCASETOKN")).toBe(false);
    expect(isValidShareTokenShape("contains-dash")).toBe(false);
    // Right length, but uses characters the alphabet deliberately excludes.
    expect(isValidShareTokenShape("0oil1abcdefg")).toBe(false);
  });
});

describe("resolving a meeting by its share link", () => {
  async function seed() {
    const store = new InMemoryStore();
    const organizer = await store.createParticipant({
      name: "Org",
      email: "org@ccb.dev",
      timezone: "UTC",
    });
    const shareToken = generateShareToken();
    const meeting = await store.createMeeting({
      title: "Board Strategy Call",
      organizerId: organizer.id,
      shareToken,
      windowStartUtc: "2026-09-01T00:00:00Z",
      windowEndUtc: "2026-09-10T00:00:00Z",
      decisionDependent: false,
      status: "collecting",
      proposedSlot: null,
      currentSnapshotId: null,
    });
    return { store, organizer, meeting, shareToken };
  }

  it("finds the meeting a token belongs to", async () => {
    const { store, meeting, shareToken } = await seed();
    const found = await store.getMeetingByShareToken(shareToken);
    expect(found?.id).toBe(meeting.id);
  });

  it("returns null for a token that belongs to nothing", async () => {
    const { store } = await seed();
    expect(await store.getMeetingByShareToken(generateShareToken())).toBeNull();
  });

  it("matches a returning participant on email so responses update rather than duplicate", async () => {
    const { store } = await seed();
    const first = await store.createParticipant({
      name: "Cindy",
      email: "cindy@example.com",
      timezone: "UTC",
    });
    // Same person, different casing and padding — must resolve to one record.
    const again = await store.getParticipantByEmail("  Cindy@Example.com  ");
    expect(again?.id).toBe(first.id);
  });
});
