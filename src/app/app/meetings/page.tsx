import Link from "next/link";
import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";
import { getStore } from "@/lib/store";
import { formatDateRangeLabel } from "@/lib/copy/dateLabels";

export default async function MeetingsPage() {
  const organizer = await getOrCreateCurrentParticipant();
  const store = getStore();
  const meetings = organizer ? await store.getMeetingsByOrganizer(organizer.id) : [];

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 1rem" }}>Meetings</h1>

      {meetings.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          No meetings yet.{" "}
          <Link href="/app/new" style={{ fontWeight: 600 }}>Create your first WenMeet &rarr;</Link>
        </p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {meetings.map((m) => (
            <Link
              key={m.id}
              href={`/app/meetings/${m.id}`}
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
      )}
    </div>
  );
}
