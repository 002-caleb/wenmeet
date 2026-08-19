import Link from "next/link";
import { describeAttention } from "@/lib/copy/statusCopy";
import { formatInTimezone } from "@/lib/timezone/tzConvert";
import type { MeetingSummary } from "@/lib/dashboard/workspaceView";
import { RoleProgress, roleProgressSentence } from "./RoleProgress";
import { ReadinessRing } from "./ReadinessRing";

interface AttentionSectionProps {
  items: MeetingSummary[];
  timezone: string;
  /** Only true before the host has created anything — drives the one low-emphasis first-run action (§10). */
  isFirstRun: boolean;
}

/**
 * §11-15. Highest-priority region, and the only part of the workspace that
 * is a true panel in the zero state (§33). Empty is a dataset, not a
 * different page (§28).
 */
export function AttentionSection({ items, timezone, isFirstRun }: AttentionSectionProps) {
  return (
    <section aria-labelledby="ws-attention" data-tour="attention" data-help-tip="Decisions that need you appear here">
      <h2 id="ws-attention" className="ws-section-label">
        Needs attention
      </h2>

      {items.length === 0 ? (
        <div className="ws-panel ws-attention-empty">
          <p className="ws-attention-empty-title">
            <span aria-hidden className="ws-allclear-mark">
              ✓
            </span>
            All clear
          </p>
          <p className="ws-muted-line">
            {isFirstRun
              ? "When a WenMeet needs a decision, it will appear here."
              : "Nothing needs your attention right now."}
          </p>
          {isFirstRun && (
            <Link href="/app/new" className="ws-quiet-action">
              Create your first WenMeet &rarr;
            </Link>
          )}
        </div>
      ) : (
        <div className="ws-attention-list">
          {items.map((item) => (
            <AttentionCard key={item.id} item={item} timezone={timezone} />
          ))}
        </div>
      )}
    </section>
  );
}

function AttentionCard({ item, timezone }: { item: MeetingSummary; timezone: string }) {
  // attentionReason is non-null whenever a summary is routed here.
  const copy = describeAttention(item.attentionReason!);
  const time = item.recommendedTimeUtc ?? item.scheduledTimeUtc;

  return (
    <div className="ws-panel ws-attention-card">
      <div className="ws-attention-card-head">
        <Link href={item.href} className="ws-attention-title">
          {item.title}
        </Link>
        <span className={`ws-chip ws-chip-${copy.tone}`}>{copy.label}</span>
      </div>

      <p className="ws-muted-line">{copy.detail}</p>

      <div className="ws-attention-meta">
        {item.roleProgress.decision.total > 0 && (
          <ReadinessRing
            size="compact"
            kdmReady={item.roleProgress.decision.ready}
            kdmTotal={item.roleProgress.decision.total}
            requiredReady={item.roleProgress.required.ready}
            requiredTotal={item.roleProgress.required.total}
          />
        )}
        <RoleProgress progress={item.roleProgress} />
        {item.participantCount > 0 && (
          <span className="ws-meta-text">
            {item.responseCount}/{item.participantCount} responded
          </span>
        )}
      </div>

      <div className="ws-attention-foot">
        {time && <span className="ws-time-strong">{formatInTimezone(time, timezone)}</span>}
        <Link href={item.href} className="ws-btn ws-btn-primary ws-btn-sm">
          {copy.action}
        </Link>
      </div>

      <span className="sr-only">
        {item.title}. {copy.label}. {copy.detail} {roleProgressSentence(item.roleProgress)}
      </span>
    </div>
  );
}
