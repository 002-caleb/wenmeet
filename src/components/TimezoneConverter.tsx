"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { convertAcrossZones, detectBrowserTimezone } from "@/lib/timezone/tzConvert";

const REFERENCE_ZONES = [
  { timeZone: "America/Los_Angeles", label: "Pacific" },
  { timeZone: "America/New_York", label: "Eastern" },
  { timeZone: "Europe/London", label: "London" },
  { timeZone: "Asia/Kolkata", label: "India" },
  { timeZone: "Asia/Tokyo", label: "Tokyo" },
];

/**
 * §6: "UI includes a simple timezone converter so participants can
 * reason about times across zones without leaving the page."
 */
export function TimezoneConverter({ initialIsoUtc }: { initialIsoUtc?: string }) {
  const [isoUtc, setIsoUtc] = useState(initialIsoUtc ?? new Date().toISOString());
  const browserTz = useMemo(() => detectBrowserTimezone(), []);
  const rows = useMemo(
    () => convertAcrossZones(isoUtc, [{ timeZone: browserTz, label: "Your timezone" }, ...REFERENCE_ZONES]),
    [isoUtc, browserTz],
  );
  const listRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    if (!listRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(
      listRef.current.children,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: "power2.out" },
    );
  }, [isoUtc, browserTz]);

  return (
    <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.6rem" }}>
        Time to convert (your local input)
        <input
          type="datetime-local"
          onChange={(e) => {
            if (e.target.value) setIsoUtc(new Date(e.target.value).toISOString());
          }}
          style={{
            display: "block",
            marginTop: "0.4rem",
            width: "100%",
            padding: "0.55rem 0.8rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: "0.95rem",
          }}
        />
      </label>
      <ul ref={listRef} style={{ listStyle: "none", margin: "0.9rem 0 0", padding: 0, display: "grid", gap: "0.5rem" }}>
        {rows.map((r) => (
          <li
            key={r.timeZone}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.6rem 0.9rem",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-muted)",
              fontSize: "0.9rem",
            }}
          >
            <span>
              <strong>{r.label}</strong>{" "}
              <span style={{ color: "var(--text-muted)" }}>({r.timeZone})</span>
            </span>
            <span style={{ fontWeight: 600 }}>{r.formatted}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
