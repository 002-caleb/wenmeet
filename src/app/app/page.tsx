import Link from "next/link";
import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";
import { getStore } from "@/lib/store";
import { formatDateRangeLabel } from "@/lib/copy/dateLabels";

/**
 * Authenticated home (docs/AUTHENTICATED_APP_SHELL_ROUTING.md §5-6). Once
 * the Clerk <-> Participant bridge exists, this page has real data to show
 * — but only for meetings *this organizer created*. A populated "Needs you
 * / Waiting / Upcoming" inbox (§15-16) also needs per-participant response
 * tracking across meetings you're *invited to*, which isn't wired yet —
 * that's the next real step, not a UI-only one.
 */
export default async function AppHomePage() {
  const organizer = await getOrCreateCurrentParticipant();
  const meetings = organizer ? await getStore().getMeetingsByOrganizer(organizer.id) : [];

  if (meetings.length === 0) {
    return (
      <div style={{ textAlign: "center", paddingTop: "3rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 0.6rem" }}>
          Schedule something.
        </h1>
        <p style={{ color: "var(--text-muted)", maxWidth: 420, margin: "0 auto 1.75rem", lineHeight: 1.6 }}>
          Choose your times, share one link, and let WenMeet find the overlap.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/app/new" className="pill-button pill-button-primary">
            Create your first WenMeet &rarr;
          </Link>
          <Link href="/app/calendars" className="pill-button pill-button-secondary">
            Connect a calendar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 1.25rem" }}>Your WenMeets</h1>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {meetings.map((m) => (
          <Link
            key={m.id}
            href={`/meetings/${m.id}/availability`}
            className="card"
            style={{ padding: "1rem 1.25rem", display: "block", textDecoration: "none", color: "var(--text)" }}
          >
            <div style={{ fontWeight: 700 }}>{m.title}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {formatDateRangeLabel(new Date(m.windowStartUtc), new Date(m.windowEndUtc))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
