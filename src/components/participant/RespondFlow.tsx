"use client";

import { useEffect, useMemo, useState } from "react";
import { AvailabilityGrid, cellKey, type AvailabilityDay } from "@/components/AvailabilityGrid";
import { ParticipantGrowthPrompt } from "./ParticipantGrowthPrompt";
import { detectBrowserTimezone, humanTimezoneLabel } from "@/lib/timezone/tzConvert";
import { addDays, formatDateKey, formatWeekdayShort, isSameDay, parseHourLabel, startOfDay } from "@/lib/copy/dateLabels";
import type { TimeSlot } from "@/lib/types";

const TIMES = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM"];
const VISIBLE_DAYS = 5;

interface RespondFlowProps {
  token: string;
  title: string;
  organizerName: string;
  windowStartUtc: string;
  windowEndUtc: string;
}

/**
 * The participant side of a shared link. No account, no sign-in — the token
 * in the URL is the only thing needed, which is what makes "share one link"
 * a real capability rather than a marketing claim.
 */
export function RespondFlow({ token, title, organizerName, windowStartUtc, windowEndUtc }: RespondFlowProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tz, setTz] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => setTz(detectBrowserTimezone()), []);

  // The grid never offers a day outside the organizer's window.
  const windowStart = useMemo(() => startOfDay(new Date(windowStartUtc)), [windowStartUtc]);
  const windowEnd = useMemo(() => startOfDay(new Date(windowEndUtc)), [windowEndUtc]);
  const [visibleStart, setVisibleStart] = useState<Date>(windowStart);

  const totalDays = useMemo(
    () => Math.max(1, Math.round((windowEnd.getTime() - windowStart.getTime()) / 86400000) + 1),
    [windowStart, windowEnd],
  );

  const days = useMemo(() => {
    const count = Math.min(VISIBLE_DAYS, totalDays);
    return Array.from({ length: count }, (_, i) => addDays(visibleStart, i)).filter((d) => d <= windowEnd);
  }, [visibleStart, totalDays, windowEnd]);

  const gridDays: AvailabilityDay[] = days.map((date) => ({
    key: formatDateKey(date),
    weekday: formatWeekdayShort(date),
    dateNum: String(date.getDate()),
    isToday: isSameDay(date, new Date()),
  }));

  const disabledPast = useMemo(() => {
    const s = new Set<string>();
    const now = new Date();
    for (const date of days) {
      if (isSameDay(date, now)) {
        for (const t of TIMES) {
          if (parseHourLabel(t) <= now.getHours()) s.add(cellKey(formatDateKey(date), t));
        }
      } else if (date < startOfDay(now)) {
        for (const t of TIMES) s.add(cellKey(formatDateKey(date), t));
      }
    }
    return s;
  }, [days]);

  const canGoBack = visibleStart > windowStart;
  const canGoForward = addDays(visibleStart, VISIBLE_DAYS) <= windowEnd;

  /** Painted cells are local wall-clock; the API only ever stores UTC. */
  function toSlots(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    for (const key of selected) {
      const [dateKey, timeLabel] = key.split("__");
      if (!dateKey || !timeLabel) continue;
      const [y, m, d] = dateKey.split("-").map(Number);
      if (!y || !m || !d) continue;
      const start = new Date(y, m - 1, d, parseHourLabel(timeLabel), 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      slots.push({ startUtc: start.toISOString(), endUtc: end.toISOString() });
    }
    return slots.sort((a, b) => (a.startUtc < b.startUtc ? -1 : 1));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const slots = toSlots();
    if (slots.length === 0) {
      setError("Pick at least one time that works for you.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/m/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, timezone: tz, slots }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't save that. Try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="respond-done">
        <p className="respond-done-mark" aria-hidden>✓</p>
        <h1 className="respond-done-title">Thanks — you&rsquo;re done.</h1>
        <p className="ws-muted-line">
          {organizerName} will see your availability. You&rsquo;ll hear back once a time is settled.
        </p>
        <ParticipantGrowthPrompt />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="respond-form">
      <header className="respond-header">
        <p className="ws-section-label">You&rsquo;re invited</p>
        <h1 className="ws-title">{title}</h1>
        <p className="ws-muted-line">
          {organizerName} wants to find a time that works. Pick everything that suits you — no account needed.
        </p>
      </header>

      <div className="respond-fields">
        <label className="respond-field">
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Alex Chen" />
        </label>
        <label className="respond-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="alex@company.com"
          />
        </label>
      </div>

      <div className="respond-grid-head">
        <div>
          <h2 className="respond-grid-title">When can you meet?</h2>
          {tz && <p className="ws-meta-text">Times shown in {humanTimezoneLabel(tz)}</p>}
        </div>
        {totalDays > VISIBLE_DAYS && (
          <div className="respond-nav">
            <button
              type="button"
              onClick={() => setVisibleStart((p) => addDays(p, -VISIBLE_DAYS))}
              disabled={!canGoBack}
              aria-label="Earlier dates"
            >
              &larr;
            </button>
            <button
              type="button"
              onClick={() => setVisibleStart((p) => addDays(p, VISIBLE_DAYS))}
              disabled={!canGoForward}
              aria-label="Later dates"
            >
              &rarr;
            </button>
          </div>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <AvailabilityGrid
          days={gridDays}
          times={TIMES}
          disabledPast={disabledPast}
          value={selected}
          onChange={setSelected}
        />
      </div>

      {error && <p className="respond-error">{error}</p>}

      <div className="respond-footer">
        <span className="ws-meta-text">
          {selected.size === 0 ? "Nothing selected yet" : `${selected.size} time${selected.size === 1 ? "" : "s"} selected`}
        </span>
        <button
          type="submit"
          className="pill-button pill-button-primary"
          disabled={submitting || selected.size === 0 || !name.trim() || !email.trim()}
        >
          {submitting ? "Sending…" : "Send my availability"}
        </button>
      </div>
    </form>
  );
}
