import Link from "next/link";

/**
 * The viral growth loop: a participant who just experienced "pick times,
 * no account needed" is the best-qualified lead WenMeet ever gets — they
 * felt the product work from the other side of it. Shown only at the two
 * natural dead ends of the public respond flow (submitted, or arrived
 * after the meeting locked), never mid-task.
 *
 * Deliberately secondary in weight to whatever confirmation sits above it
 * — this is an invitation, not a wall. Responding never required an
 * account and this doesn't change that; it only offers the next step for
 * whoever wants one.
 */
export function ParticipantGrowthPrompt() {
  return (
    <div className="growth-prompt">
      <p className="growth-prompt-title">Need to schedule your own meeting?</p>
      <p className="growth-prompt-body">
        WenMeet finds a time that works for everyone required &mdash; no more back-and-forth.
      </p>
      <Link href="/sign-up?next=/app/new" className="ws-btn ws-btn-primary ws-btn-sm">
        Create a free WenMeet &rarr;
      </Link>
    </div>
  );
}
