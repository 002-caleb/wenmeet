import { describe, expect, it } from "vitest";
import { describeZone, listZones, searchZones } from "../src/lib/timezone/zones";

// Fixed instant so offsets are deterministic (northern-hemisphere summer,
// which is when US/EU daylight saving is active).
const NOW = new Date("2026-07-15T12:00:00Z");

describe("timezone options", () => {
  const zones = listZones(NOW);

  it("produces a usable list", () => {
    expect(zones.length).toBeGreaterThan(30);
  });

  it("computes real offsets, including daylight saving", () => {
    const la = zones.find((z) => z.id === "America/Los_Angeles");
    // PDT in July.
    expect(la?.offsetMinutes).toBe(-420);
    expect(la?.offsetLabel).toBe("UTC−07:00");
  });

  it("handles half-hour offsets", () => {
    // Runtimes still report the legacy id Asia/Calcutta.
    const india = zones.find((z) => z.id === "Asia/Calcutta" || z.id === "Asia/Kolkata");
    expect(india?.offsetMinutes).toBe(330);
    expect(india?.offsetLabel).toBe("UTC+05:30");
    // ...but it must present under the modern name.
    expect(india?.city).toBe("Kolkata");
  });

  it("labels UTC without a sign", () => {
    const utc = zones.find((z) => z.id === "UTC");
    expect(utc?.offsetLabel).toBe("UTC±00:00");
  });

  it("sorts west to east", () => {
    const offsets = zones.map((z) => z.offsetMinutes);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
  });
});

describe("timezone search", () => {
  const zones = listZones(NOW);

  it("finds by city", () => {
    const hits = searchZones(zones, "London");
    expect(hits.some((z) => z.id === "Europe/London")).toBe(true);
  });

  it("finds by canonical id", () => {
    const hits = searchZones(zones, "America/Los_Angeles");
    expect(hits[0]?.id).toBe("America/Los_Angeles");
  });

  it("finds by abbreviation, in either DST state", () => {
    // NOW is July — LA is currently PDT, but people type PST year-round.
    expect(searchZones(zones, "PST").some((z) => z.id === "America/Los_Angeles")).toBe(true);
    expect(searchZones(zones, "pdt").some((z) => z.id === "America/Los_Angeles")).toBe(true);
    expect(searchZones(zones, "CET").some((z) => z.id === "Europe/Paris")).toBe(true);
  });

  it("finds by UTC offset the way a person types it", () => {
    expect(searchZones(zones, "UTC+1").length).toBeGreaterThan(0);
    // The display uses a real minus sign, but nobody types U+2212.
    expect(searchZones(zones, "utc-7").length).toBeGreaterThan(0);
  });

  it("finds renamed zones by their modern name", () => {
    // The runtime id is Asia/Calcutta; nobody searches for that any more.
    expect(searchZones(zones, "Kolkata").length).toBeGreaterThan(0);
    expect(searchZones(zones, "Kyiv").length).toBeGreaterThan(0);
  });

  it("is case-insensitive", () => {
    expect(searchZones(zones, "tokyo").some((z) => z.id === "Asia/Tokyo")).toBe(true);
  });

  it("returns nothing for gibberish rather than everything", () => {
    expect(searchZones(zones, "zzzznotazone")).toHaveLength(0);
  });
});

describe("describeZone", () => {
  it("splits a zone into city and offset for display", () => {
    const d = describeZone("America/Los_Angeles", NOW);
    expect(d.city).toBe("Los Angeles");
    expect(d.offsetLabel).toBe("UTC−07:00");
  });

  it("does not throw on an unknown zone", () => {
    expect(() => describeZone("Not/AZone", NOW)).not.toThrow();
  });
});
