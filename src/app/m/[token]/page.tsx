import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { isValidShareTokenShape } from "@/lib/shareToken";
import { RespondFlow } from "@/components/participant/RespondFlow";
import { ParticipantGrowthPrompt } from "@/components/participant/ParticipantGrowthPrompt";

export const metadata = {
  title: "Share your availability · WenMeet",
  // A share link is private to whoever received it.
  robots: { index: false, follow: false },
};

/**
 * Public participant page. Reached only by share link — no account, no
 * sign-in (middleware protects /app, not this route).
 *
 * Only the fields a participant needs are passed down. The organizer's
 * email, the meeting id, the roster, and everyone else's responses stay
 * server-side: the token grants the ability to respond, not to inspect
 * the meeting.
 */
export default async function ShareLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidShareTokenShape(token)) notFound();

  const store = getStore();
  const meeting = await store.getMeetingByShareToken(token);
  if (!meeting) notFound();

  const organizer = await store.getParticipant(meeting.organizerId);

  if (meeting.status === "locked") {
    return (
      <main id="main" className="respond-shell">
        <div className="respond-done">
          <h1 className="respond-done-title">This one&rsquo;s already booked.</h1>
          <p className="ws-muted-line">
            {meeting.title} has a confirmed time, so it&rsquo;s no longer collecting availability.
          </p>
          <ParticipantGrowthPrompt />
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="respond-shell">
      <RespondFlow
        token={token}
        title={meeting.title}
        organizerName={organizer?.name ?? "The organizer"}
        windowStartUtc={meeting.windowStartUtc}
        windowEndUtc={meeting.windowEndUtc}
      />
    </main>
  );
}
