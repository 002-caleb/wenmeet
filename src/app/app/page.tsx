import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";
import { getStore } from "@/lib/store";
import { loadWorkspaceView, type WorkspaceView } from "@/lib/dashboard/workspaceView";
import { humanTimezoneLabel } from "@/lib/timezone/tzConvert";
import { AttentionSection } from "@/components/dashboard/AttentionSection";
import { ActiveSection } from "@/components/dashboard/ActiveSection";
import { UpcomingSection } from "@/components/dashboard/UpcomingSection";
import { CalendarHealthPanel } from "@/components/dashboard/CalendarHealthPanel";
import { FirstRunOnboarding } from "@/components/onboarding/FirstRunOnboarding";

const EMPTY_VIEW: WorkspaceView = { attention: [], active: [], upcoming: [], totalMeetings: 0 };

/**
 * Authenticated home — a thin operational layer over the coordination
 * engine (docs/WORKSPACE_V2.md §1-2).
 *
 * Zero-data and populated accounts render the exact same component tree;
 * each section simply receives an empty array (§27-28). There is no
 * separate onboarding page, and no section invents state the store didn't
 * report.
 */
export default async function AppHomePage() {
  const organizer = await getOrCreateCurrentParticipant();
  const store = getStore();

  const [workspace, google, microsoft] = organizer
    ? await Promise.all([
        loadWorkspaceView(store, organizer.id),
        store.getCalendarConnection(organizer.id, "google"),
        store.getCalendarConnection(organizer.id, "microsoft"),
      ])
    : [EMPTY_VIEW, null, null];

  const timezone = organizer?.timezone ?? "UTC";
  const tzLabel = humanTimezoneLabel(timezone);
  const isFirstRun = workspace.totalMeetings === 0;
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  }).format(new Date());

  const calendarsConnected = [google, microsoft].filter(Boolean).length;

  return (
    <div className="ws">
      <FirstRunOnboarding enabled={isFirstRun} timezoneLabel={tzLabel} hasCalendar={calendarsConnected > 0} />
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Your meetings</h1>
          <p className="ws-counts">
            {workspace.active.length + workspace.attention.length} active &middot; {workspace.upcoming.length} upcoming
          </p>
          <p className="ws-subtitle">Coordinate the people who actually need to be there.</p>
        </div>
        <div className="ws-header-meta">
          <span className="ws-meta-text">
            {todayLabel} &middot; {tzLabel}
          </span>
          <span className={calendarsConnected > 0 ? "ws-meta-text" : "ws-meta-warn"}>
            {calendarsConnected > 0
              ? `${calendarsConnected} calendar${calendarsConnected === 1 ? "" : "s"} connected`
              : "No calendar connected"}
          </span>
        </div>
      </header>

      <div className="ws-grid">
        <div className="ws-primary">
          <AttentionSection items={workspace.attention} timezone={timezone} isFirstRun={isFirstRun} />
          <ActiveSection items={workspace.active} isFirstRun={isFirstRun} />
          <UpcomingSection items={workspace.upcoming} timezone={timezone} />
        </div>

        <aside className="ws-rail">
          <CalendarHealthPanel google={google} microsoft={microsoft} timezoneLabel={tzLabel} />
        </aside>
      </div>
    </div>
  );
}
