import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";
import { getStore } from "@/lib/store";
import { buildMeetingSummary } from "@/lib/dashboard/workspaceView";
import { computeReadinessDetail } from "@/lib/scheduling/readinessDetail";
import { describeAttention, describeLifecycle } from "@/lib/copy/statusCopy";
import { formatDateRangeLabel } from "@/lib/copy/dateLabels";
import { formatInTimezone } from "@/lib/timezone/tzConvert";
import { ShareLinkPanel } from "@/components/dashboard/ShareLinkPanel";
import { ReadinessPanel } from "@/components/dashboard/ReadinessPanel";

/**
 * Organizer meeting detail — where the dashboard's attention and active
 * rows lead, and where the wizard lands after creating. It consumes the same
 * `buildMeetingSummary` contract as the workspace home, so lifecycle and
 * attention can't drift between the two surfaces.
 *
 * Arriving with ?created=1 puts the share link first: a freshly created
 * meeting is useless until it reaches people.
 */
export default async function MeetingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const justCreated = created === "1";
  const organizer = await getOrCreateCurrentParticipant();
  if (!organizer) notFound();

  const store = getStore();
  const meeting = await store.getMeeting(id);
  if (!meeting || meeting.organizerId !== organizer.id) notFound();

  const [summary, readiness] = await Promise.all([
    buildMeetingSummary(store, meeting),
    computeReadinessDetail(store, meeting.id),
  ]);

  const attention = summary.attentionReason ? describeAttention(summary.attentionReason) : null;
  const time = summary.scheduledTimeUtc ?? summary.recommendedTimeUtc;
  const timezone = organizer.timezone;
  const hasGatingParticipants = readiness.gatingTotal + readiness.kdm.length + readiness.required.length > 0;

  return (
    <div className="ws" style={{ maxWidth: 640 }}>
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

      {meeting.status !== "locked" && (
        <ShareLinkPanel shareToken={meeting.shareToken} justCreated={justCreated} />
      )}

      <section aria-labelledby="md-participants" style={{ marginTop: "0.5rem" }}>
        <h2 id="md-participants" className="ws-section-label">
          Participants
        </h2>
        <div className="ws-panel readiness-panel-shell">
          {hasGatingParticipants || readiness.optional.length > 0 ? (
            <ReadinessPanel
              meetingId={meeting.id}
              detail={readiness}
              canRecalculate={meeting.status !== "locked"}
            />
          ) : (
            <p className="ws-muted-line">
              Just you so far &mdash; share the link above and roles will appear here as people respond.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
