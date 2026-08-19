"use client";

import { useMemo } from "react";
import { addMonthsToKey, weekdayOfKey } from "@/lib/scheduling/policy";

const WEEKDAY_HEADER = ["M", "T", "W", "T", "F", "S", "S"]; // Monday-first
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DayState {
  date: string;
  dayOfMonth: number;
  selected: boolean;
  offDay: boolean;
}

function buildMonthGrid(year: number, month: number): Array<string | null> {
  // Monday-first: JS getDay() is 0=Sun, so shift to 0=Mon.
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: Array<string | null> = Array(leadingBlanks).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(key);
  }
  return cells;
}

interface MonthCalendarProps {
  /** First month to show, as YYYY-MM-01. */
  anchorDate: string;
  /** How many consecutive months to render. */
  monthCount: number;
  selected: Set<string>;
  activeWeekdays: number[];
  onToggle: (date: string) => void;
}

/**
 * A real calendar, not a compressed date matrix — a 14-column grid reads as
 * a spreadsheet and forces the reader to decode which month a number
 * belongs to. Rendering actual month blocks with a visible boundary and
 * Monday-first weeks removes that decoding step entirely.
 */
export function MonthCalendar({ anchorDate, monthCount, selected, activeWeekdays, onToggle }: MonthCalendarProps) {
  const months = useMemo(() => {
    const out: Array<{ year: number; month: number; label: string; cells: Array<string | null> }> = [];
    for (let i = 0; i < monthCount; i++) {
      const key = i === 0 ? anchorDate : addMonthsToKey(anchorDate, i);
      const [y, m] = key.split("-").map(Number);
      out.push({
        year: y!,
        month: m! - 1,
        label: `${MONTH_NAMES[m! - 1]} ${y}`,
        cells: buildMonthGrid(y!, m! - 1),
      });
    }
    return out;
  }, [anchorDate, monthCount]);

  return (
    <div className="mcal-group">
      {months.map((m) => (
        <div className="mcal" key={m.label}>
          <div className="mcal-month-label">{m.label}</div>
          <div className="mcal-weekdays" aria-hidden>
            {WEEKDAY_HEADER.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className="mcal-grid">
            {m.cells.map((date, i) => {
              if (!date) return <span key={`b${i}`} className="mcal-blank" aria-hidden />;
              const dayOfMonth = Number(date.slice(8, 10));
              const isSelected = selected.has(date);
              // weekdayOfKey uses 0=Sunday..6=Saturday, matching activeWeekdays.
              const offDay = !activeWeekdays.includes(weekdayOfKey(date));
              return (
                <button
                  key={date}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={date}
                  title={offDay ? `${date} — not a working day` : date}
                  className={`mcal-day${isSelected ? " mcal-day-selected" : ""}${offDay ? " mcal-day-off" : ""}`}
                  onClick={() => onToggle(date)}
                >
                  {dayOfMonth}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export type { DayState };
