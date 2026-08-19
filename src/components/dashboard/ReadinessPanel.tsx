"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReadinessRing } from "./ReadinessRing";
import { ReadinessRoster } from "./ReadinessRoster";
import { describeKdmReadiness } from "@/lib/copy/statusCopy";
import type { ReadinessDetail } from "@/lib/scheduling/readinessDetail";

interface ReadinessPanelProps {
  meetingId: string;
  detail: ReadinessDetail;
  /** Only offered pre-lock — a booked meeting doesn't need re-evaluating. */
  canRecalculate: boolean;
}

/**
 * PRD §28-29: the ring plus the breakdown line plus the click-to-expand
 * roster, as one unit. §32 stage 5-6: also the organizer's only way to
 * actually trigger a scheduling run today — POST /api/meetings/:id/run
 * exists and is fully real, but nothing in the UI ever called it before
 * this. Without this button, a meeting could sit at "everyone responded"
 * forever without the engine ever being asked to evaluate overlap.
 */
export function ReadinessPanel({ meetingId, detail, canRecalculate }: ReadinessPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcNote, setRecalcNote] = useState<string | null>(null);

  const { kdmReady, kdmTotal, requiredReady, requiredTotal } = {
    kdmReady: detail.kdmReadyCount,
    kdmTotal: detail.kdmTotal,
    requiredReady: detail.requiredReadyCount,
    requiredTotal: detail.requiredTotal,
  };

  const waitingCount = detail.gatingTotal - detail.readyCount;
  const breakdown = [
    kdmTotal > 0 && `${kdmTotal} KDM${kdmTotal === 1 ? "" : "s"}`,
    requiredTotal > 0 && `${requiredTotal} required`,
    waitingCount > 0 && `${waitingCount} waiting`,
  ]
    .filter(Boolean)
    .join(" · ");

  async function recalculate() {
    setRecalculating(true);
    setRecalcNote(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/run`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't check availability.");
      setRecalcNote(
        body.meeting?.status === "ready"
          ? "Found a time — the recommendation below is up to date."
          : body.meeting?.status === "no_valid_slot"
            ? "Still no time works for everyone required."
            : "Checked — still waiting on responses.",
      );
      router.refresh();
    } catch (err) {
      setRecalcNote(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <div className="readiness-panel">
      <div className="readiness-panel-top">
        <ReadinessRing
          kdmReady={kdmReady}
          kdmTotal={kdmTotal}
          requiredReady={requiredReady}
          requiredTotal={requiredTotal}
          onActivate={() => setOpen((v) => !v)}
          expanded={open}
        />
        <div className="readiness-panel-text">
          <p className="readiness-panel-label">Required responses</p>
          <p className="readiness-panel-status">
            {describeKdmReadiness({ kdmReady, kdmTotal, requiredReady, requiredTotal })}
          </p>
          {breakdown && <p className="ws-meta-text">{breakdown}</p>}
        </div>
        {canRecalculate && (
          <button type="button" className="ws-btn ws-btn-sm readiness-recalc-btn" onClick={recalculate} disabled={recalculating}>
            {recalculating ? "Checking…" : "Check availability"}
          </button>
        )}
      </div>

      {recalcNote && <p className="ws-muted-line readiness-recalc-note">{recalcNote}</p>}

      {open && (
        <ReadinessRoster meetingId={meetingId} kdm={detail.kdm} required={detail.required} optional={detail.optional} />
      )}
    </div>
  );
}
