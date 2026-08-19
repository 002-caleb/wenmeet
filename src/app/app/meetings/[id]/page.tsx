import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";
import { getStore } from "@/lib/store";
import { buildMeetingSummary } from "@/lib/dashboard/workspaceView";
import { describeAttention, describeLifecycle } from "@/lib/copy/statusCopy";
import { formatDateRangeLabel } from "@/lib/copy/dateLabels";
import { formatInTimezone } from "@/lib/timezone/tzConvert";
import { RoleProgress } from "@/components/dashboard/RoleProgress";
import { ShareLinkPanel } from "@/components/dashboard/ShareLinkPanel";

/**
 * Organizer meeting detail — where the dashboard's attention and active
 * rows lead. It consumes the same `buildMeetingSummary` contract as the
 * workspace home, so lifecycle and attention can't drift between the two
 * surfaces (§52).
 *
 * Read-only: with no invite flow yet, most meetings have only the
 * organizer, and this page says so plainly rather than implying a roster.
 */
export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organizer = await getOrCreateCurrentParticipant();
  if (!organizer) notFound();

  const store = getStore();
  const meeting = await store.getMeeting(id);
  if (!meeting || meeting.organizerId !== organizer.id) notFound();

  const summary = await buildMeetingSummary(store, meeting);

  // Who has actually replied — resolved from availability rows, so a name
  // only appears once that person genuinely submitted times.
  const availability = await store.getAvailabilityForMeeting(meeting.id);
  const respondents = (
    await Promise.all(
      availability
        .filter((a) => a.participantId !== meeting.organizerId)
        .map((a) => store.getParticipant(a.participantId)),
    )
  ).filter((p): p is NonNullable<typeof p> => p !== null);
  const attention = summary.attentionReason ? describeAttention(summary.attentionReason) : null;
  const time = summary.scheduledTimeUtc ?? summary.recommendedTimeUtc;
  const timezone = organizer.timezone;

  return (
    <div className="ws" style={{ maxWidth: 620 }}>
      <Link href="/app/meetings" className="ws-meta-text" style={{ textDecoration: "none" }}>
        &larr; Meetings
      </Link>

      <header className="ws-header" style={{ marginTop: "0.9rem" }}>
        <div>
          <h1 className="ws-title">{meeting.title}</h1>
          <p className="ws-counts">
            {describeLifecycle(summary.lifecycle)} &middot;{" "}
            {formatDateRangeLabel(new Date(meeting.windowStartUtc), new Date(meeting.windowEndUtc))}
          </p>
        </div>
        {attention && <span className={`ws-chip ws-chip-${attention.tone}`}>{attention.label}</span>}
      </header>

      {attention && (
        <div className="ws-panel ws-attention-card" style={{ marginBottom: "1.5rem" }}>
          <p className="ws-muted-line">{attention.detail}</p>
          {time && (
            <div className="ws-attention-foot">
              <span className="ws-time-strong">{formatInTimezone(time, timezone)}</span>
              <span className="ws-meta-text">
                {summary.lifecycle === "booked" ? "Booked" : "Proposed"}
              </span>
            </div>
          )}
        </div>
      )}

      {!attention && time && (
        <div className="ws-panel ws-calendar-panel" style={{ marginBottom: "1.5rem" }}>
          <p className="ws-meta-text" style={{ marginBottom: "0.3rem" }}>Booked for</p>
          <p className="ws-time-strong" style={{ margin: 0 }}>{formatInTimezone(time, timezone)}</p>
        </div>
      )}

      {meeting.status !== "locked" && <ShareLinkPanel shareToken={meeting.shareToken} />}

      <section aria-labelledby="md-participants">
        <h2 id="md-participants" className="ws-section-label">
          Participants
        </h2>
        <div className="ws-panel ws-calendar-panel">
          {summary.participantCount > 0 ? (
            <>
              <RoleProgress progress={summary.roleProgress} />
              <p className="ws-muted-line" style={{ marginTop: "0.7rem" }}>
                {summary.responseCount} of {summary.participantCount} responded.
              </p>
              <ul className="respondent-list">
                {respondents.map((r) => (
                  <li key={r.id}>
                    <span aria-hidden className="respondent-check">&#10003;</span>
                    {r.name}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="ws-muted-line">
              No responses yet. Share the link above and they&rsquo;ll show up here as people reply.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
