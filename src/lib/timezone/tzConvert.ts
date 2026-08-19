/**
 * Minimal timezone converter used by the availability page (PRD §6:
 * "UI includes a simple timezone converter so participants can reason
 * about times across zones without leaving the page"). Relies on the
 * platform Intl API rather than a date library, since the scaffold's
 * needs are limited to display formatting.
 */
export function formatInTimezone(isoUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(isoUtc));
}

export function detectBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** "Los Angeles · PT" style label — falls back to the bare zone name for UTC or an unusual IANA id. */
export function humanTimezoneLabel(timeZone: string): string {
  if (timeZone === "UTC") return "UTC";
  const city = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
  const abbrev = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value;
  return abbrev ? `${city} · ${abbrev}` : city;
}

export interface TzConversionRow {
  timeZone: string;
  label: string;
}

/** Renders one instant across a small fixed set of reference zones, for the "reason across zones" widget. */
export function convertAcrossZones(isoUtc: string, zones: TzConversionRow[]) {
  return zones.map((z) => ({ ...z, formatted: formatInTimezone(isoUtc, z.timeZone) }));
}
