/**
 * Timezone options for the picker.
 *
 * Built from the platform's own IANA list where available
 * (`Intl.supportedValuesOf`), so it stays current with the runtime rather
 * than rotting in a hardcoded array. The fallback list covers the zones a
 * distributed team is most likely to need on older runtimes.
 */

const FALLBACK_ZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Mexico_City",
  "America/Bogota",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Zurich",
  "Europe/Stockholm",
  "Europe/Warsaw",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Asia/Jerusalem",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Asia/Tokyo",
  "Australia/Perth",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "UTC",
];

export interface ZoneOption {
  /** IANA id, e.g. "America/Los_Angeles". */
  id: string;
  /** "Los Angeles" */
  city: string;
  /** "Pacific Time" where the runtime knows it, else the region. */
  label: string;
  /** "UTC−07:00" */
  offsetLabel: string;
  /** Minutes from UTC; used for sorting, not display. */
  offsetMinutes: number;
  /** Lowercased haystack for search. */
  search: string;
}

function offsetMinutesFor(timeZone: string, now: Date): number {
  // Compare the same instant rendered in UTC and in the zone. Doing the
  // arithmetic on formatted parts avoids depending on any particular
  // offset-string format, which varies by runtime and locale.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(now).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - Math.floor(now.getTime() / 1000) * 1000) / 60000);
}

function formatOffset(minutes: number): string {
  if (minutes === 0) return "UTC±00:00";
  const sign = minutes > 0 ? "+" : "−"; // U+2212, reads better than a hyphen
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

function longName(timeZone: string, now: Date): string | null {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "long" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value;
    // Runtimes that don't know a friendly name echo the offset back.
    return part && !/^GMT|^UTC/.test(part) ? part : null;
  } catch {
    return null;
  }
}

/**
 * Curated fallback for zones whose common abbreviation Node's ICU build
 * doesn't expose via Intl. European zones are the main gap: they resolve to
 * "GMT+1"/"GMT+2" rather than "CET"/"CEST" on Node, even though US zones
 * reliably get "PST"/"PDT". Filled in only where Intl comes back empty.
 */
const ABBREVIATION_FALLBACK: Record<string, string[]> = {
  "Europe/London": ["GMT", "BST"],
  "Europe/Dublin": ["GMT", "IST"],
  "Europe/Lisbon": ["WET", "WEST"],
  "Europe/Paris": ["CET", "CEST"],
  "Europe/Berlin": ["CET", "CEST"],
  "Europe/Madrid": ["CET", "CEST"],
  "Europe/Amsterdam": ["CET", "CEST"],
  "Europe/Zurich": ["CET", "CEST"],
  "Europe/Stockholm": ["CET", "CEST"],
  "Europe/Warsaw": ["CET", "CEST"],
  "Europe/Athens": ["EET", "EEST"],
  "Europe/Helsinki": ["EET", "EEST"],
  "Europe/Moscow": ["MSK"],
};

/**
 * Abbreviations people actually search for ("PST", "CET"). Sampled at a
 * January and a July instant so both DST states are covered — someone types
 * "PST" in summer even though the zone is currently PDT. Offset-style
 * pseudo-abbreviations (GMT+8) are dropped; the offset is searchable already.
 */
function shortNames(timeZone: string): string[] {
  const out: string[] = [];
  for (const iso of ["2026-01-15T12:00:00Z", "2026-07-15T12:00:00Z"]) {
    try {
      const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
        .formatToParts(new Date(iso))
        .find((p) => p.type === "timeZoneName")?.value;
      if (part && !/^GMT|^UTC/.test(part) && !out.includes(part)) out.push(part);
    } catch {
      // Zone unknown to this runtime — nothing to add.
    }
  }
  if (out.length === 0 && ABBREVIATION_FALLBACK[timeZone]) out.push(...ABBREVIATION_FALLBACK[timeZone]!);
  return out;
}

/**
 * The IANA database renamed a number of zones, but runtimes still report the
 * legacy id. People search for the current name, so both must match.
 */
const ALSO_KNOWN_AS: Record<string, string> = {
  "Asia/Calcutta": "Kolkata",
  "Asia/Saigon": "Ho Chi Minh City",
  "Asia/Rangoon": "Yangon",
  "Europe/Kiev": "Kyiv",
  "America/Godthab": "Nuuk",
  "Asia/Katmandu": "Kathmandu",
  "Pacific/Ponape": "Pohnpei",
};

export function listZones(now = new Date()): ZoneOption[] {
  const platform: string[] =
    typeof (Intl as any).supportedValuesOf === "function"
      ? (Intl as any).supportedValuesOf("timeZone")
      : FALLBACK_ZONES;

  // "UTC" is absent from the platform list on most runtimes, but it is the
  // default timezone for a newly created participant, so it must always be
  // selectable — otherwise a user cannot see or keep their current setting.
  const ids = platform.includes("UTC") ? platform : ["UTC", ...platform];

  const options: ZoneOption[] = [];
  for (const id of ids) {
    let offsetMinutes: number;
    try {
      offsetMinutes = offsetMinutesFor(id, now);
    } catch {
      continue; // Runtime doesn't recognise this zone — skip rather than crash the picker.
    }
    const alias = ALSO_KNOWN_AS[id];
    // Show the modern name where one exists — "Kolkata", not "Calcutta".
    const city = alias ?? id.split("/").pop()?.replace(/_/g, " ") ?? id;
    const region = id.split("/")[0] ?? "";
    const label = longName(id, now) ?? region.replace(/_/g, " ");
    const offsetLabel = formatOffset(offsetMinutes);
    options.push({
      id,
      city,
      label,
      offsetLabel,
      offsetMinutes,
      // Include the plain "+1"/"-7" forms so "UTC+1" and "utc-7" both match,
      // the abbreviations in both DST states so "PST" works in July, and the
      // legacy id for anyone who knows it.
      search: [
        id,
        city,
        label,
        offsetLabel,
        ...shortNames(id),
        `utc${offsetMinutes >= 0 ? "+" : "-"}${Math.abs(offsetMinutes) / 60}`,
      ]
        .join(" ")
        .toLowerCase(),
    });
  }

  return options.sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.city.localeCompare(b.city));
}

export function searchZones(zones: ZoneOption[], query: string, limit = 40): ZoneOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return zones.slice(0, limit);
  // Normalise the minus sign users can't type and the abbreviation case.
  const normalised = q.replace(/−/g, "-").replace(/\s+/g, " ");
  return zones.filter((z) => z.search.includes(normalised)).slice(0, limit);
}

export function describeZone(timeZone: string, now = new Date()): { city: string; label: string; offsetLabel: string } {
  const city = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
  let offsetLabel = "";
  try {
    offsetLabel = formatOffset(offsetMinutesFor(timeZone, now));
  } catch {
    offsetLabel = "";
  }
  return { city, label: longName(timeZone, now) ?? "", offsetLabel };
}
