export default function NewMeetingPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 0.5rem" }}>Create a WenMeet</h1>
      <p style={{ color: "var(--text-muted)" }}>
        The meeting-creation form isn&rsquo;t wired up yet in this pass — the domain logic exists
        (<code>POST /api/meetings</code>) but nothing yet bridges your signed-in identity to an
        organizer record. That&rsquo;s the next real integration step.
      </p>
    </div>
  );
}
