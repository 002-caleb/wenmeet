"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AvailabilityGrid, cellKey, type AvailabilityDay } from "@/components/AvailabilityGrid";
import { MeetingContextHeader } from "@/components/MeetingContextHeader";
import { DateRangeNavigator } from "@/components/DateRangeNavigator";
import { CalendarStatus } from "@/components/CalendarStatus";
import { TimezoneControl } from "@/components/TimezoneControl";
import { AvailabilityFooter } from "@/components/AvailabilityFooter";
import { detectBrowserTimezone, humanTimezoneLabel } from "@/lib/timezone/tzConvert";
import { addDays, formatDateKey, formatWeekdayShort, isSameDay, parseHourLabel, startOfDay } from "@/lib/copy/dateLabels";
import { buildMeetingContextViewModel } from "@/lib/copy/meetingContext";
import { buildDateRangeNavigationViewModel } from "@/lib/copy/dateRangeNav";

const TIMES = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM"];
const VISIBLE_DAYS = 4;
const WINDOW_LENGTH_DAYS = 12; // the organizer's configured scheduling window

/**
 * Participant availability screen
 * (docs/FRONTEND_PRODUCT_SYSTEM.md + docs/AVAILABILITY_CONTEXT_AND_DATE_NAV.md).
 * Enough context to answer "what meeting, what dates, what timezone, what's
 * already busy" without a paragraph of explanation — see statusCopy.ts for
 * the translation layer once this is wired to real meeting data.
 */
export default function AvailabilityPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"choose" | "done">("choose");
  const [tz, setTz] = useState("");
  const [tzChanged, setTzChanged] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(true);
  const originalTzRef = useRef<string | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const meetingStart = today;
  const meetingEnd = useMemo(() => addDays(meetingStart, WINDOW_LENGTH_DAYS - 1), [meetingStart]);
  const [visibleStart, setVisibleStart] = useState<Date>(meetingStart);

  useEffect(() => {
    const detected = detectBrowserTimezone();
    setTz(detected);
    originalTzRef.current = detected;
  }, []);

  useEffect(() => {
    function checkTzDrift() {
      if (document.visibilityState !== "visible") return;
      const now = detectBrowserTimezone();
      if (step === "done" && originalTzRef.current && now !== originalTzRef.current) {
        setTz(now);
        setTzChanged(true);
      }
    }
    document.addEventListener("visibilitychange", checkTzDrift);
    return () => document.removeEventListener("visibilitychange", checkTzDrift);
  }, [step]);

  const windowDates = useMemo(
    () => Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(visibleStart, i)),
    [visibleStart],
  );

  const gridDays: AvailabilityDay[] = windowDates.map((date) => ({
    key: formatDateKey(date),
    weekday: formatWeekdayShort(date),
    dateNum: String(date.getDate()),
    isToday: isSameDay(date, today),
  }));

  // Fixed to real calendar dates near the start of the organizer's window,
  // so the mock conflicts stay put regardless of which page is visible.
  const busy = useMemo(() => {
    const s = new Set<string>();
    s.add(cellKey(formatDateKey(addDays(meetingStart, 1)), "11 AM"));
    s.add(cellKey(formatDateKey(addDays(meetingStart, 3)), "1 PM"));
    return s;
  }, [meetingStart]);

  const disabledPast = useMemo(() => {
    const s = new Set<string>();
    const now = new Date();
    for (const date of windowDates) {
      if (isSameDay(date, now)) {
        for (const t of TIMES) {
          if (parseHourLabel(t) < now.getHours()) s.add(cellKey(formatDateKey(date), t));
        }
      }
    }
    return s;
  }, [windowDates]);

  const dateNavVm = useMemo(
    () => buildDateRangeNavigationViewModel(visibleStart, VISIBLE_DAYS, meetingStart, meetingEnd),
    [visibleStart, meetingStart, meetingEnd],
  );

  const meetingVm = useMemo(
    () =>
      buildMeetingContextViewModel({
        title: "Strategy Call",
        durationMinutes: 30,
        rangeStart: dateNavVm.visibleStart,
        rangeEnd: dateNavVm.visibleEnd,
        location: "Google Meet",
        // Real data only — no organizer loaded in this demo, so this
        // resolves to the safe generic fallback, never a fixture name.
        organizerName: undefined,
        participantCount: 4,
      }),
    [dateNavVm],
  );

  const tzLabel = tz ? humanTimezoneLabel(tz) : "";

  function goPrevious() {
    setVisibleStart((prev) => {
      const next = addDays(prev, -VISIBLE_DAYS);
      return next < meetingStart ? meetingStart : next;
    });
  }

  function goNext() {
    setVisibleStart((prev) => {
      const next = addDays(prev, VISIBLE_DAYS);
      const maxStart = addDays(meetingEnd, -(VISIBLE_DAYS - 1));
      return next > maxStart ? maxStart : next;
    });
  }

  function selectAllFree() {
    const next = new Set(selected);
    for (const date of windowDates) {
      for (const t of TIMES) {
        const key = cellKey(formatDateKey(date), t);
        if (!busy.has(key) && !disabledPast.has(key)) next.add(key);
      }
    }
    setSelected(next);
  }

  function clearSelection() {
    setSelected(new Set());
  }

  if (step === "done") {
    return (
      <main id="main" style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ marginTop: "3rem" }}>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "0 0 0.6rem" }}>You&rsquo;re all set.</h1>
          <p style={{ color: "var(--text-muted)" }}>Your availability is saved.</p>
          <button
            type="button"
            className="pill-button pill-button-secondary"
            disabled
            title="Not available yet"
            style={{ marginTop: "1.75rem", opacity: 0.5, cursor: "not-allowed" }}
          >
            Add WenMeet to your calendar
          </button>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/" className="pill-button pill-button-primary">Done</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="availability-page">
      <Link href="/" style={{ fontSize: "0.85rem", color: "var(--text-muted)", textDecoration: "none" }}>
        &larr; WenMeet
      </Link>

      <MeetingContextHeader
        vm={meetingVm}
        expandedContent={
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 0.35rem" }}>Quick sync on Q3 go-to-market timing.</p>
            <p style={{ margin: 0 }}>Your attendance is required.</p>
          </div>
        }
      />

      <DateRangeNavigator vm={dateNavVm} onPrevious={goPrevious} onNext={goNext} />

      {tzChanged && (
        <div className="card" style={{ padding: "1rem 1.2rem", margin: "1.25rem 0", background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
          <p style={{ fontWeight: 700, margin: "0 0 0.25rem" }}>Still good?</p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: "0 0 0.75rem" }}>
            It looks like your timezone changed. We&rsquo;ve updated your times.
          </p>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button type="button" className="pill-button pill-button-primary" onClick={() => setTzChanged(false)}>
              Looks good
            </button>
            <button type="button" className="pill-button pill-button-secondary" onClick={() => setTzChanged(false)}>
              Change my times
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginTop: "1.75rem" }}>
        <div>
          <h2 style={{ fontSize: "1.7rem", fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 0.25rem" }}>
            When can you meet?
          </h2>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Select every time that works.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.82rem", fontWeight: 600 }}>
          <button type="button" onClick={selectAllFree} style={linkButtonStyle}>Select all free</button>
          <span style={{ color: "var(--border)" }}>&middot;</span>
          <button type="button" onClick={clearSelection} style={linkButtonStyle}>Clear</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", margin: "1rem 0" }}>
        <TimezoneControl label={tzLabel} />
        <CalendarStatus connected={calendarConnected} onConnect={() => setCalendarConnected(true)} />
      </div>

      <p className="availability-gesture-hint"><span aria-hidden="true">↗</span> Drag across the grid to paint your times</p>

      <div className="availability-grid-scroll">
        <AvailabilityGrid days={gridDays} times={TIMES} busy={busy} disabledPast={disabledPast} value={selected} onChange={setSelected} />
      </div>

      {selected.size > 0 && selected.size < 3 && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.75rem" }}>
          More options make it easier to find a match.
        </p>
      )}

      <AvailabilityFooter selectedCount={selected.size} onContinue={() => setStep("done")} />
    </main>
  );
}

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--accent)",
  cursor: "pointer",
};
