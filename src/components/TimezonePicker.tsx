"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { describeZone, listZones, searchZones } from "@/lib/timezone/zones";

interface TimezonePickerProps {
  value: string;
  onChange: (timeZone: string) => void;
  /** True when `value` came from the browser rather than a saved preference. */
  detected?: boolean;
}

/**
 * Timezone is a first-class scheduling input, not hidden metadata — every
 * candidate time is expressed in it. So it is always shown, always labelled
 * with where it came from, and always changeable.
 */
export function TimezonePicker({ value, onChange, detected }: TimezonePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Built once per mount: enumerating every IANA zone and formatting each is
  // too costly to redo on every keystroke.
  const zones = useMemo(() => listZones(), []);
  const results = useMemo(() => searchZones(zones, query), [zones, query]);
  const current = useMemo(() => describeZone(value), [value]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="tz-picker" ref={panelRef}>
      <div className="tz-current">
        <div>
          <div className="tz-city">{current.city}</div>
          <div className="tz-meta">
            {[current.label, current.offsetLabel].filter(Boolean).join(" · ")}
          </div>
          {detected && <div className="tz-detected">Detected from this device</div>}
        </div>
        <button
          type="button"
          className="ws-btn ws-btn-sm tz-change"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Change
        </button>
      </div>

      {open && (
        <div className="tz-panel">
          <input
            ref={inputRef}
            type="text"
            className="tz-search"
            placeholder="City, timezone, or UTC offset"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search timezones"
          />
          <ul className="tz-results" role="listbox">
            {results.length === 0 && <li className="tz-empty">No timezone matches that.</li>}
            {results.map((z) => (
              <li key={z.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={z.id === value}
                  className={`tz-option${z.id === value ? " tz-option-active" : ""}`}
                  onClick={() => pick(z.id)}
                >
                  <span className="tz-option-city">{z.city}</span>
                  <span className="tz-option-meta">{z.offsetLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
