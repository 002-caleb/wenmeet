"use client";

import { useState, type ReactNode } from "react";
import type { MeetingContextViewModel } from "@/lib/copy/meetingContext";

export function MeetingContextHeader({
  vm,
  expandedContent,
}: {
  vm: MeetingContextViewModel;
  expandedContent?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: "1rem" }}>
      <h1 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>{vm.title}</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
        {vm.durationLabel}
        {vm.meetingLocationLabel ? ` · ${vm.meetingLocationLabel}` : ""}
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.2rem 0 0" }}>{vm.dateRangeLabel}</p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.2rem 0 0" }}>{vm.organizerLabel}</p>
      {vm.participantCountLabel && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.2rem 0 0" }}>{vm.participantCountLabel}</p>
      )}

      {expandedContent && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{ background: "none", border: "none", padding: 0, marginTop: "0.5rem", color: "var(--accent)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
          >
            Meeting details {open ? "▴" : "▾"}
          </button>
          {open && <div style={{ marginTop: "0.5rem" }}>{expandedContent}</div>}
        </>
      )}
    </div>
  );
}
