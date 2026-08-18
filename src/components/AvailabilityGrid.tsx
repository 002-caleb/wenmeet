"use client";

import { useEffect, useMemo, useRef } from "react";

export interface AvailabilityDay {
  /** Stable key, e.g. an ISO date string — used to build cell keys. */
  key: string;
  weekday: string;
  dateNum: string;
  isToday?: boolean;
}

export interface AvailabilityGridProps {
  days: AvailabilityDay[];
  times: string[];
  /** Cells pre-marked busy from a connected calendar — disabled, can't be selected. */
  busy?: Set<string>;
  /** Cells that are already in the past — disabled, distinct from "busy". */
  disabledPast?: Set<string>;
  value: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function cellKey(dayKey: string, time: string) {
  return `${dayKey}__${time}`;
}

/**
 * Click-or-drag multi-select grid (docs/FRONTEND_PRODUCT_SYSTEM.md §22).
 * Uses window-level pointermove + elementFromPoint hit-testing rather than
 * per-cell pointerenter, so a single drag gesture works the same for mouse
 * and touch.
 */
export function AvailabilityGrid({ days, times, busy, disabledPast, value, onChange }: AvailabilityGridProps) {
  const draggingRef = useRef(false);
  const modeRef = useRef<"add" | "remove">("add");
  const valueRef = useRef(value);
  valueRef.current = value;

  const isLocked = useMemo(() => {
    return (key: string) => Boolean(busy?.has(key) || disabledPast?.has(key));
  }, [busy, disabledPast]);

  useEffect(() => {
    function applyMode(key: string) {
      const current = valueRef.current;
      const alreadyDesired = modeRef.current === "add" ? current.has(key) : !current.has(key);
      if (alreadyDesired) return;
      const next = new Set(current);
      if (modeRef.current === "add") next.add(key);
      else next.delete(key);
      onChange(next);
    }

    function handleMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const key = el?.closest<HTMLElement>("[data-cell-key]")?.dataset.cellKey;
      if (!key || isLocked(key)) return;
      applyMode(key);
    }
    function handleUp() {
      draggingRef.current = false;
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isLocked, onChange]);

  function toggle(key: string) {
    const next = new Set(valueRef.current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  function handlePointerDown(key: string) {
    if (isLocked(key)) return;
    modeRef.current = value.has(key) ? "remove" : "add";
    draggingRef.current = true;
    toggle(key);
  }

  const columns = `64px repeat(${days.length}, 1fr)`;

  return (
    <div className="avail-grid">
      <div className="avail-grid-row avail-grid-head" style={{ gridTemplateColumns: columns }}>
        <div />
        {days.map((d) => {
          const selectedCount = Array.from(value).filter((k) => k.startsWith(`${d.key}__`)).length;
          return (
            <div key={d.key} className="avail-grid-day">
              <div>{d.weekday} {d.dateNum}</div>
              {d.isToday && <div className="avail-day-today">Today</div>}
              {selectedCount > 0 && <div className="avail-day-count">{selectedCount} selected</div>}
            </div>
          );
        })}
      </div>
      {times.map((t) => (
        <div key={t} className="avail-grid-row" style={{ gridTemplateColumns: columns }}>
          <div className="avail-grid-time">{t}</div>
          {days.map((d) => {
            const key = cellKey(d.key, t);
            const isBusy = busy?.has(key);
            const isPast = disabledPast?.has(key);
            const selected = value.has(key);
            const locked = isBusy || isPast;
            return (
              <button
                key={key}
                type="button"
                data-cell-key={key}
                disabled={locked}
                onPointerDown={() => handlePointerDown(key)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !locked) {
                    e.preventDefault();
                    toggle(key);
                  }
                }}
                className={`avail-cell${selected ? " avail-cell-selected" : ""}${isBusy ? " avail-cell-busy" : ""}${isPast ? " avail-cell-disabled" : ""}`}
                aria-pressed={selected}
                aria-label={`${d.weekday} ${d.dateNum}, ${t}${isBusy ? ", busy on your calendar" : isPast ? ", already past" : selected ? ", selected" : ", available"}`}
              >
                {isBusy ? "busy" : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
