"use client";

import { useMemo, useState } from "react";
import {
  addDaysToKey,
  formatDateKeyShort,
  resolveWindow,
  todayKeyInZone,
  type BlackoutRange,
  type RollingUnit,
  type SchedulingConstraints,
  type SchedulingPolicy,
} from "@/lib/scheduling/policy";
import { describeWeekdays } from "@/lib/wizard/describePolicy";
import { MonthCalendar } from "./MonthCalendar";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

const NOTICE_OPTIONS = [
  { minutes: 0, label: "None" },
  { minutes: 2 * 60, label: "2 hours" },
  { minutes: 4 * 60, label: "4 hours" },
  { minutes: 12 * 60, label: "12 hours" },
  { minutes: 24 * 60, label: "24 hours" },
  { minutes: 48 * 60, label: "48 hours" },
];

const ROLLING_PRESETS: Array<{ label: string; amount: number; unit: RollingUnit }> = [
  { label: "2 weeks", amount: 2, unit: "weeks" },
  { label: "30 days", amount: 30, unit: "days" },
  { label: "3 months", amount: 3, unit: "months" },
];

interface Props {
  policy: SchedulingPolicy;
  constraints: SchedulingConstraints;
  onPolicyChange: (p: SchedulingPolicy) => void;
  onConstraintsChange: (c: SchedulingConstraints) => void;
}

/**
 * The scheduling window as a policy rather than two dates.
 *
 * Progressive disclosure is the whole point: the mode control plus one input
 * is enough for most meetings, and the rules that only some organizers need
 * stay folded away until asked for.
 */
export function SchedulingWindowStep({ policy, constraints, onPolicyChange, onConstraintsChange }: Props) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [blackoutStart, setBlackoutStart] = useState("");
  const [blackoutEnd, setBlackoutEnd] = useState("");

  const today = useMemo(() => todayKeyInZone(constraints.timezone), [constraints.timezone]);
  const resolved = useMemo(() => resolveWindow(policy, constraints), [policy, constraints]);

  const exclusionsByDate = useMemo(
    () => new Map(resolved.excluded.map((e) => [e.date, e.reason])),
    [resolved],
  );

  const rulesSummary = useMemo(() => {
    const parts = [describeWeekdays(constraints.activeWeekdays)];
    if (constraints.minimumNoticeMinutes > 0) {
      const h = constraints.minimumNoticeMinutes / 60;
      parts.push(`${h % 24 === 0 && h >= 24 ? h / 24 + "d" : h + "h"} notice`);
    }
    if (constraints.blackoutRanges.length > 0) {
      parts.push(`${constraints.blackoutRanges.length} blackout${constraints.blackoutRanges.length === 1 ? "" : "s"}`);
    }
    return parts.join(" · ");
  }, [constraints]);

  function setMode(type: SchedulingPolicy["type"]) {
    if (type === policy.type) return;
    // Carry the current shape across rather than resetting to defaults —
    // switching mode to compare options shouldn't discard the user's dates.
    if (type === "rolling") onPolicyChange({ type: "rolling", amount: 14, unit: "days" });
    else if (type === "fixed") {
      onPolicyChange({
        type: "fixed",
        startDate: resolved.horizonStart || today,
        endDate: resolved.horizonEnd || addDaysToKey(today, 13),
      });
    } else {
      onPolicyChange({ type: "specific", dates: resolved.dates.slice(0, 5) });
    }
  }

  function toggleWeekday(day: number) {
    const next = constraints.activeWeekdays.includes(day)
      ? constraints.activeWeekdays.filter((d) => d !== day)
      : [...constraints.activeWeekdays, day].sort();
    onConstraintsChange({ ...constraints, activeWeekdays: next });
  }

  function addBlackout() {
    if (!blackoutStart) return;
    const range: BlackoutRange = { startDate: blackoutStart, endDate: blackoutEnd || blackoutStart };
    onConstraintsChange({ ...constraints, blackoutRanges: [...constraints.blackoutRanges, range] });
    setBlackoutStart("");
    setBlackoutEnd("");
  }

  function removeBlackout(index: number) {
    onConstraintsChange({
      ...constraints,
      blackoutRanges: constraints.blackoutRanges.filter((_, i) => i !== index),
    });
  }

  function toggleSpecificDate(date: string) {
    if (policy.type !== "specific") return;
    const has = policy.dates.includes(date);
    onPolicyChange({
      type: "specific",
      dates: has ? policy.dates.filter((d) => d !== date) : [...policy.dates, date].sort(),
    });
  }

  return (
    <div className="swin">
      <div className="seg-group swin-modes" role="radiogroup" aria-label="Scheduling mode">
        {(
          [
            { type: "rolling", label: "Rolling window" },
            { type: "fixed", label: "Fixed range" },
            { type: "specific", label: "Specific dates" },
          ] as const
        ).map((m) => (
          <button
            key={m.type}
            type="button"
            role="radio"
            aria-checked={policy.type === m.type}
            className={`seg${policy.type === m.type ? " seg-active" : ""}`}
            onClick={() => setMode(m.type)}
          >
            {m.label}
            {m.type === "specific" && policy.type === "specific" && policy.dates.length > 0 && (
              <span className="seg-badge">{policy.dates.length}</span>
            )}
          </button>
        ))}
      </div>

      {policy.type === "rolling" && (
        <div className="swin-mode-body">
          <div className="rolling-row">
            <span className="wiz-sublabel">Next</span>
            <input
              type="number"
              min={1}
              max={200}
              className="wiz-input rolling-amount"
              value={policy.amount}
              onChange={(e) => onPolicyChange({ ...policy, amount: Number(e.target.value) })}
              aria-label="How far ahead to look"
            />
            <select
              className="wiz-input rolling-unit"
              value={policy.unit}
              onChange={(e) => onPolicyChange({ ...policy, unit: e.target.value as RollingUnit })}
              aria-label="Unit"
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </div>
          <div className="preset-row">
            {ROLLING_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="preset"
                onClick={() => onPolicyChange({ type: "rolling", amount: p.amount, unit: p.unit })}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {policy.type === "fixed" && (
        <div className="swin-mode-body date-row">
          <label>
            <span className="wiz-sublabel">From</span>
            <input
              type="date"
              className="wiz-input"
              value={policy.startDate}
              onChange={(e) => onPolicyChange({ ...policy, startDate: e.target.value })}
            />
          </label>
          <label>
            <span className="wiz-sublabel">To</span>
            <input
              type="date"
              className="wiz-input"
              min={policy.startDate}
              value={policy.endDate}
              onChange={(e) => onPolicyChange({ ...policy, endDate: e.target.value })}
            />
          </label>
        </div>
      )}

      {policy.type === "specific" && (
        <div className="swin-mode-body">
          <div className="specific-head">
            <span className="wiz-label" style={{ margin: 0 }}>Specific dates</span>
            <span className="specific-count">
              {policy.dates.length} selected
            </span>
          </div>
          <p className="wiz-help">Tap the dates you want to offer. They don&rsquo;t have to be consecutive.</p>
          <MonthCalendar
            anchorDate={`${today.slice(0, 7)}-01`}
            monthCount={2}
            selected={new Set(policy.dates)}
            activeWeekdays={constraints.activeWeekdays}
            onToggle={toggleSpecificDate}
          />
          <SpecificDatesConsequence policy={policy} resolved={resolved} />
        </div>
      )}

      {/* Named for what it controls. Calendar free/busy, working hours and
          participant availability are separate concerns that will live
          elsewhere — calling this "availability rules" would collide. */}
      <button
        type="button"
        className="swin-disclosure"
        aria-expanded={rulesOpen}
        onClick={() => setRulesOpen((v) => !v)}
      >
        <span>
          Scheduling rules &amp; blackouts
          {!rulesOpen && <span className="swin-disclosure-summary"> · {rulesSummary}</span>}
        </span>
        <span aria-hidden>{rulesOpen ? "▴" : "▾"}</span>
      </button>

      {rulesOpen && (
        <div className="swin-rules">
          <fieldset className="wiz-field">
            <legend className="wiz-label">Working days</legend>
            <div className="weekday-row">
              {WEEKDAY_LABELS.map((label, day) => {
                const on = constraints.activeWeekdays.includes(day);
                return (
                  <button
                    key={label + day}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={label}
                    className={`weekday${on ? " weekday-on" : ""}`}
                    onClick={() => toggleWeekday(day)}
                  >
                    <span aria-hidden className="weekday-initial">{WEEKDAY_INITIALS[day]}</span>
                    {/* Never color alone: the state is spelled out for AT and
                        reinforced with a mark for everyone else. */}
                    <span aria-hidden className="weekday-mark">{on ? "✓" : "—"}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="wiz-field">
            <legend className="wiz-label">Blackout dates</legend>
            {constraints.blackoutRanges.length > 0 && (
              <ul className="blackout-list">
                {constraints.blackoutRanges.map((r, i) => (
                  <li key={`${r.startDate}-${r.endDate}-${i}`} className="blackout-token">
                    {r.startDate === r.endDate ? r.startDate : `${r.startDate} → ${r.endDate}`}
                    <button
                      type="button"
                      onClick={() => removeBlackout(i)}
                      aria-label={`Remove blackout ${r.startDate}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="blackout-add">
              <input
                type="date"
                className="wiz-input"
                value={blackoutStart}
                onChange={(e) => setBlackoutStart(e.target.value)}
                aria-label="Blackout start date"
              />
              <span className="wiz-sublabel blackout-to">to</span>
              <input
                type="date"
                className="wiz-input"
                value={blackoutEnd}
                min={blackoutStart}
                onChange={(e) => setBlackoutEnd(e.target.value)}
                aria-label="Blackout end date (optional)"
              />
              <button type="button" className="ws-btn ws-btn-sm blackout-add-btn" onClick={addBlackout}>
                Add
              </button>
            </div>
            <p className="wiz-help">Leave the second date empty to block a single day.</p>
          </fieldset>

          <fieldset className="wiz-field">
            <legend className="wiz-label">Minimum notice</legend>
            <div className="seg-group" role="radiogroup" aria-label="Minimum notice">
              {NOTICE_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  type="button"
                  role="radio"
                  aria-checked={constraints.minimumNoticeMinutes === opt.minutes}
                  className={`seg${constraints.minimumNoticeMinutes === opt.minutes ? " seg-active" : ""}`}
                  onClick={() => onConstraintsChange({ ...constraints, minimumNoticeMinutes: opt.minutes })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="wiz-help">Dates that fall inside this window stop being offered.</p>
          </fieldset>
        </div>
      )}

      {/* The specific-dates calendar already shows exactly which days are
          picked, so the categorical heatmap would just repeat it — the
          consequence sentence above does that job instead for this mode. */}
      {policy.type !== "specific" && (
        <WindowPreview resolved={resolved} exclusionsByDate={exclusionsByDate} policy={policy} today={today} />
      )}
    </div>
  );
}

/**
 * "WenMeet will search across 5 selected dates." / when rules remove some:
 * "4 of 5 selected dates are eligible. Aug 24 is excluded by your scheduling
 * rules." Makes the SchedulingPolicy abstraction visible through its effect,
 * not its mechanism.
 */
function SpecificDatesConsequence({
  policy,
  resolved,
}: {
  policy: Extract<SchedulingPolicy, { type: "specific" }>;
  resolved: ReturnType<typeof resolveWindow>;
}) {
  const total = policy.dates.length;
  if (total === 0) {
    return <p className="wiz-help swin-consequence">Pick at least one date to search.</p>;
  }

  const eligibleCount = resolved.dates.length;
  if (eligibleCount === total) {
    return (
      <p className="swin-consequence">
        WenMeet will search across {total} selected date{total === 1 ? "" : "s"}.
      </p>
    );
  }

  const excludedDates = resolved.excluded.filter((e) => policy.dates.includes(e.date));
  const firstExcluded = excludedDates[0];

  return (
    <p className="swin-consequence swin-consequence-warn">
      {eligibleCount} of {total} selected dates are eligible.
      {firstExcluded && (
        <>
          {" "}
          {formatDateKeyShort(firstExcluded.date)} is excluded by your scheduling rules
          {excludedDates.length > 1 ? ` (and ${excludedDates.length - 1} more)` : ""}.
        </>
      )}
    </p>
  );
}

/**
 * Calendar-state visualization — deliberately not a heatmap, because these
 * states are categorical (eligible / weekday-off / blocked), not magnitudes.
 */
function WindowPreview({
  resolved,
  exclusionsByDate,
  policy,
  today,
}: {
  resolved: ReturnType<typeof resolveWindow>;
  exclusionsByDate: Map<string, string>;
  policy: SchedulingPolicy;
  today: string;
}) {
  const all = useMemo(() => {
    const set = new Set([...resolved.dates, ...resolved.excluded.map((e) => e.date)]);
    return [...set].sort().slice(0, 90);
  }, [resolved]);

  if (all.length === 0) {
    return (
      <div className="preview-empty" role="status">
        No scheduling days remain. Loosen your working days, blackouts, or notice period.
      </div>
    );
  }

  const eligible = new Set(resolved.dates);

  return (
    <div className="preview">
      <div className="preview-head">
        <span className="ws-section-label">
          {eligible.size} day{eligible.size === 1 ? "" : "s"} WenMeet will search
        </span>
      </div>
      <div className="preview-grid">
        {all.map((date) => {
          const reason = exclusionsByDate.get(date);
          const cls = eligible.has(date) ? "on" : reason ? `off-${reason}` : "off";
          return (
            <span
              key={date}
              className={`preview-cell preview-${cls}${date === today ? " preview-today" : ""}`}
              title={
                eligible.has(date)
                  ? `${date} — available`
                  : `${date} — ${reason === "weekday" ? "not a working day" : reason === "blackout" ? "blacked out" : "inside minimum notice"}`
              }
            />
          );
        })}
      </div>
      <div className="preview-legend">
        <span><i className="preview-cell preview-on" /> Searchable</span>
        <span><i className="preview-cell preview-off-weekday" /> Non-working day</span>
        <span><i className="preview-cell preview-off-blackout" /> Blacked out</span>
        <span><i className="preview-cell preview-off-notice" /> Too soon</span>
      </div>
    </div>
  );
}
