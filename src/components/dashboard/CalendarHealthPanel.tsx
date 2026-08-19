import Link from "next/link";
import type { CalendarConnection } from "@/lib/types";

interface CalendarHealthPanelProps {
  google: CalendarConnection | null;
  microsoft: CalendarConnection | null;
  timezoneLabel: string;
}

/**
 * §23-26. The panel's meaning changes with state: setup when nothing is
 * connected, status once something is. It never claims a health state the
 * app can't verify — there's no token-health check yet, so a stored
 * connection reads simply as "connected", not "syncing" or "healthy".
 */
export function CalendarHealthPanel({ google, microsoft, timezoneLabel }: CalendarHealthPanelProps) {
  const connectedCount = [google, microsoft].filter(Boolean).length;
  const isSetup = connectedCount === 0;

  return (
    <section aria-labelledby="ws-calendar">
      <h2 id="ws-calendar" className="ws-section-label">
        {isSetup ? "Calendar setup" : "Calendar status"}
      </h2>

      <div className="ws-panel ws-calendar-panel">
        <p className={`ws-calendar-state ${isSetup ? "ws-calendar-state-idle" : "ws-calendar-state-ok"}`}>
          {isSetup ? "No calendar connected" : `${connectedCount} connected`}
        </p>

        <div className="ws-calendar-rows">
          <CalendarRow label="Google Calendar" connection={google} />
          <CalendarRow label="Microsoft 365" connection={microsoft} />
        </div>

        <div className="ws-calendar-tz">
          <span className="ws-meta-text">Timezone</span>
          <span className="ws-calendar-tz-value">{timezoneLabel}</span>
        </div>

        <Link href="/app/calendars" className="ws-quiet-action">
          Manage calendars &rarr;
        </Link>
      </div>
    </section>
  );
}

function CalendarRow({ label, connection }: { label: string; connection: CalendarConnection | null }) {
  return (
    <div className="ws-calendar-row">
      <span className="ws-calendar-row-label">{label}</span>
      {connection ? (
        <span className="ws-calendar-connected">
          <span aria-hidden>&#10003;</span> Connected
        </span>
      ) : (
        <Link href="/app/calendars" className="ws-calendar-connect">
          Connect
        </Link>
      )}
    </div>
  );
}
