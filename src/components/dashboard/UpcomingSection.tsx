import Link from "next/link";
import { formatInTimezone } from "@/lib/timezone/tzConvert";
import type { MeetingSummary } from "@/lib/dashboard/workspaceView";

/** §20-22. Lightweight future context — deliberately not a calendar. */
export function UpcomingSection({ items, timezone }: { items: MeetingSummary[]; timezone: string }) {
  return (
    <section aria-labelledby="ws-upcoming" className="ws-section">
      <h2 id="ws-upcoming" className="ws-section-label">
        Upcoming
      </h2>
      <div className="ws-rows">
        {items.length === 0 ? (
          <div className="ws-empty-line">
            <p className="ws-muted-line">No upcoming meetings.</p>
          </div>
        ) : (
          items.slice(0, 5).map((item) => (
            <Link key={item.id} href={item.href} className="ws-row ws-row-upcoming">
              <span className="ws-upcoming-time">{formatInTimezone(item.scheduledTimeUtc!, timezone)}</span>
              <span className="ws-row-title">{item.title}</span>
            </Link>
          ))
        )}
      </div>
      {items.length > 5 && (
        <Link href="/app/meetings" className="ws-quiet-action ws-section-more">
          View all meetings &rarr;
        </Link>
      )}
    </section>
  );
}
