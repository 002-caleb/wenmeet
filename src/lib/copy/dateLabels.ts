// docs/AVAILABILITY_CONTEXT_AND_DATE_NAV.md §6-7: real date numbers and a
// date range navigator, never bare weekday names.

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatDateRangeLabel(start: Date, end: Date): string {
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
  const startMonth = monthFmt.format(start);
  const endMonth = monthFmt.format(end);
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}–${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
}

export function formatWeekdayShort(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date).toUpperCase();
}

/** Local (not UTC) date key — avoids the day-shift bug of `toISOString().slice(0, 10)`. */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses "9 AM" / "1 PM" style labels into a 24-hour hour number. */
export function parseHourLabel(label: string): number {
  const [numPart, ampm] = label.split(" ");
  let hour = parseInt(numPart ?? "0", 10);
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour;
}
