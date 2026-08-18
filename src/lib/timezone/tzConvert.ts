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

export interface TzConversionRow {
  timeZone: string;
  label: string;
}

/** Renders one instant across a small fixed set of reference zones, for the "reason across zones" widget. */
export function convertAcrossZones(isoUtc: string, zones: TzConversionRow[]) {
  return zones.map((z) => ({ ...z, formatted: formatInTimezone(isoUtc, z.timeZone) }));
}
