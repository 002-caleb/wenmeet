"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { describeFreshness, describeGatingState } from "@/lib/copy/statusCopy";
import { humanTimezoneLabel } from "@/lib/timezone/tzConvert";
import type { GatingParticipantDetail, OptionalParticipantDetail } from "@/lib/scheduling/readinessDetail";

interface ReadinessRosterProps {
  meetingId: string;
  kdm: GatingParticipantDetail[];
  required: GatingParticipantDetail[];
  optional: OptionalParticipantDetail[];
}

/**
 * PRD §29, §35: the roster the readiness ring opens into, grouped by
 * scheduling importance. Waiving is real here, not decorative — it POSTs
 * to /api/meetings/:id/waive (now organizer-authenticated; see route) and
 * requires a reason, per §35's explicit-confirmation requirement.
 */
export function ReadinessRoster({ meetingId, kdm, required, optional }: ReadinessRosterProps) {
  return (
    <div className="roster">
      {kdm.length > 0 && <RosterGroup meetingId={meetingId} title="Key decision makers" people={kdm} />}
      {required.length > 0 && <RosterGroup meetingId={meetingId} title="Required attendees" people={required} />}
      {optional.length > 0 && (
        <div className="roster-group">
          <div className="roster-group-title">Optional attendees</div>
          {optional.map((p) => (
            <div className="roster-row" key={p.participantId}>
              <span className="roster-row-icon" aria-hidden>
                {p.responded ? "✓" : "—"}
              </span>
              <span className="roster-row-name">{p.name}</span>
              <span className="roster-row-state">{p.responded ? "Responded" : "No response"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RosterGroup({
  meetingId,
  title,
  people,
}: {
  meetingId: string;
  title: string;
  people: GatingParticipantDetail[];
}) {
  return (
    <div className="roster-group">
      <div className="roster-group-title">{title}</div>
      {people.map((p) => (
        <RosterRow key={p.participantId} meetingId={meetingId} person={p} />
      ))}
    </div>
  );
}

function RosterRow({ meetingId, person }: { meetingId: string; person: GatingParticipantDetail }) {
  const router = useRouter();
  const [waiving, setWaiving] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmWaive() {
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/waive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: person.participantId, waivedReason: reason.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't waive that participant.");
      }
      setWaiving(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const stateCopy = describeGatingState(person.state);

  return (
    <div className="roster-row">
      <span className={`roster-row-icon roster-row-icon-${person.state}`} aria-hidden>
        {stateCopy.icon}
      </span>
      <div className="roster-row-main">
        <span className="roster-row-name">
          {person.name}
          {person.waived && <span className="roster-waived-tag"> · Waived for this meeting</span>}
        </span>
        <span className="roster-row-meta">
          {person.waived ? "Continuing without this attendee" : stateCopy.label}
          {person.slotCount > 0 && ` · ${person.slotCount} time${person.slotCount === 1 ? "" : "s"} offered`}
          {person.updatedAt && ` · ${describeFreshness(person.updatedAt)}`}
          {person.submittedTimezone && ` · ${humanTimezoneLabel(person.submittedTimezone)}`}
        </span>
      </div>

      {!person.waived && person.state !== "confirmed" && (
        <button type="button" className="roster-waive-btn" onClick={() => setWaiving(true)}>
          Continue without {person.name.split(" ")[0]}
        </button>
      )}

      {waiving && (
        <div className="roster-waive-panel" role="dialog" aria-label={`Waive ${person.name}`}>
          <p className="ws-muted-line">
            {person.name} is a {person.roles.includes("kdm") ? "key decision maker" : "required attendee"}.
            Continuing without them means their attendance will no longer block this WenMeet.
          </p>
          <label className="wiz-field" style={{ marginBottom: "0.6rem" }}>
            <span className="wiz-label">Reason</span>
            <input
              className="wiz-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Out of office through next week"
              autoFocus
            />
          </label>
          {error && <p className="respond-error" style={{ marginBottom: "0.6rem" }}>{error}</p>}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="ws-btn ws-btn-primary ws-btn-sm" onClick={confirmWaive} disabled={submitting}>
              {submitting ? "Waiving…" : `Continue without ${person.name.split(" ")[0]}`}
            </button>
            <button
              type="button"
              className="ws-btn ws-btn-sm roster-waive-cancel"
              onClick={() => {
                setWaiving(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
