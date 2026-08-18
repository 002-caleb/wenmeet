"use client";

import { useState } from "react";
import { TimezoneConverter } from "@/components/TimezoneConverter";

/**
 * docs/AVAILABILITY_CONTEXT_AND_DATE_NAV.md §16: no global timezone
 * converter by default — a compact pill is enough for most participants.
 * The full converter is progressive disclosure, opened on request.
 */
export function TimezoneControl({ label }: { label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="badge badge-locked"
        style={{ border: "none", cursor: "pointer" }}
      >
        {label} &#9662;
      </button>
      {open && (
        <div style={{ marginTop: "0.75rem" }}>
          <TimezoneConverter />
        </div>
      )}
    </>
  );
}
