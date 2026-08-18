import Link from "next/link";

/**
 * Authenticated home (docs/AUTHENTICATED_APP_SHELL_ROUTING.md §6). This is
 * the empty state: WenMeet doesn't yet link a Clerk user to real meeting
 * data, so a populated "Needs you / Waiting / Upcoming" inbox (§15-16)
 * would be fabricated content presented as real — that's the next real
 * integration step, not a UI-only one. This screen is the honest state
 * for every signed-in user today.
 */
export default function AppHomePage() {
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
