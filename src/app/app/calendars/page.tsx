export default function CalendarsPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 1rem" }}>Calendars</h1>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700 }}>Google Calendar</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Keep WenMeet aware of when you&rsquo;re busy.</div>
          </div>
          <button type="button" className="pill-button pill-button-secondary" disabled style={{ opacity: 0.6, cursor: "not-allowed" }}>
            Connect
          </button>
        </div>
        <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700 }}>Microsoft Outlook</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Use your existing work calendar.</div>
          </div>
          <button type="button" className="pill-button pill-button-secondary" disabled style={{ opacity: 0.6, cursor: "not-allowed" }}>
            Connect
          </button>
        </div>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "1rem" }}>
        Calendar sync isn&rsquo;t wired up yet in this pass — see README.
      </p>
    </div>
  );
}
