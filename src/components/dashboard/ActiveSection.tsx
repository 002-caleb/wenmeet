import Link from "next/link";
import { describeLifecycle } from "@/lib/copy/statusCopy";
import { formatDateRangeLabel } from "@/lib/copy/dateLabels";
import type { MeetingSummary } from "@/lib/dashboard/workspaceView";
import { RoleProgress, roleProgressSentence } from "./RoleProgress";

/**
 * §16-19. Rows, not cards — Active carries no panel surface of its own, so
 * the eye reads Needs Attention as dominant (§33).
 */
export function ActiveSection({ items, isFirstRun }: { items: MeetingSummary[]; isFirstRun: boolean }) {
  return (
    <section aria-labelledby="ws-active" className="ws-section" data-tour="pipeline" data-help-tip="Collecting → Ready → Booked">
      <h2 id="ws-active" className="ws-section-label">
        Active
      </h2>
      <div className="ws-rows">
        {items.length === 0 ? (
          <div className="ws-empty-line">
            <p className="ws-muted-line">No meetings in motion.</p>
            {isFirstRun && <LifecycleHint />}
          </div>
        ) : (
          items.map((item) => <ActiveRow key={item.id} item={item} />)
        )}
      </div>
    </section>
  );
}

/**
 * §18-19: teaches the mental model once, then disappears. Three states,
 * because those are the three the engine can actually produce — a meeting
 * is created straight into Collecting, so there is no Draft to teach.
 */
function LifecycleHint() {
  return (
    <div className="ws-lifecycle">
      <span className="ws-lifecycle-steps">
        <span>Collecting</span>
        <span aria-hidden className="ws-lifecycle-arrow">
          &rarr;
        </span>
        <span>Ready</span>
        <span aria-hidden className="ws-lifecycle-arrow">
          &rarr;
        </span>
        <span>Booked</span>
      </span>
      <span className="ws-lifecycle-caption">Your WenMeets move through these states here.</span>
    </div>
  );
}

function ActiveRow({ item }: { item: MeetingSummary }) {
  const hasInvitees = item.participantCount > 0;

  return (
    <Link href={item.href} className="ws-row">
      <span className="ws-row-title">{item.title}</span>

      <span className="ws-row-state">
        <span className="ws-state-text">{describeLifecycle(item.lifecycle)}</span>
        {hasInvitees && (
          <>
            <span aria-hidden className="ws-row-dot">
              ·
            </span>
            <span className="ws-meta-text">
              {item.responseCount}/{item.participantCount}
            </span>
          </>
        )}
      </span>

      <span className="ws-row-trail">
        {hasInvitees ? (
          <RoleProgress progress={item.roleProgress} />
        ) : (
          <span className="ws-meta-text">
            {formatDateRangeLabel(new Date(item.windowStartUtc), new Date(item.windowEndUtc))}
          </span>
        )}
        <span aria-hidden className="ws-row-chevron">
          &rarr;
        </span>
      </span>

      <span className="sr-only">
        {describeLifecycle(item.lifecycle)}.{" "}
        {hasInvitees
          ? `${item.responseCount} of ${item.participantCount} participants responded. ${roleProgressSentence(item.roleProgress)}`
          : "No participants invited yet."}
      </span>
    </Link>
  );
}
