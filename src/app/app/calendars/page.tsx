import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";
import { getStore } from "@/lib/store";

const ERROR_COPY: Record<string, string> = {
  google_declined: "You declined the Google Calendar connection.",
  microsoft_declined: "You declined the Microsoft Outlook connection.",
  invalid_state: "That connection attempt expired or looked tampered with — try again.",
  exchange_failed: "That calendar didn't confirm the connection — try again.",
};

const CONNECTED_COPY: Record<string, string> = {
  google: "Google Calendar connected.",
  microsoft: "Microsoft Outlook connected.",
};

export default async function CalendarsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const participant = await getOrCreateCurrentParticipant();
  const store = getStore();
  const googleConnection = participant ? await store.getCalendarConnection(participant.id, "google") : null;
  const microsoftConnection = participant ? await store.getCalendarConnection(participant.id, "microsoft") : null;

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 1rem" }}>Calendars</h1>

      {params.connected && CONNECTED_COPY[params.connected] && (
        <div className="card" style={{ padding: "0.85rem 1.1rem", marginBottom: "1rem", background: "var(--ready-bg)", borderColor: "var(--ready-fg)" }}>
          <span style={{ color: "var(--ready-fg)", fontWeight: 600, fontSize: "0.9rem" }}>
            {CONNECTED_COPY[params.connected]}
          </span>
        </div>
      )}
      {params.error && (
        <div className="card" style={{ padding: "0.85rem 1.1rem", marginBottom: "1rem", background: "var(--blocked-bg)", borderColor: "var(--blocked-fg)" }}>
          <span style={{ color: "var(--blocked-fg)", fontWeight: 600, fontSize: "0.9rem" }}>
            {ERROR_COPY[params.error] ?? "Something went wrong connecting your calendar."}
          </span>
        </div>
      )}

      <div style={{ display: "grid", gap: "0.75rem" }}>
        <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700 }}>Google Calendar</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Keep WenMeet aware of when you&rsquo;re busy.</div>
          </div>
          {googleConnection ? (
            <span className="badge badge-ready">Connected &#10003;</span>
          ) : (
            <a href="/api/auth/google/authorize" className="pill-button pill-button-secondary" style={{ padding: "0.5rem 1.1rem", fontSize: "0.85rem" }}>
              Connect
            </a>
          )}
        </div>
        <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700 }}>Microsoft Outlook</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Use your existing work calendar.</div>
          </div>
          {microsoftConnection ? (
            <span className="badge badge-ready">Connected &#10003;</span>
          ) : (
            <a href="/api/auth/microsoft/authorize" className="pill-button pill-button-secondary" style={{ padding: "0.5rem 1.1rem", fontSize: "0.85rem" }}>
              Connect
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
