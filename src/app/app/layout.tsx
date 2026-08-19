import Link from "next/link";
import type { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";
import { AppNavLinks } from "@/components/AppNavLinks";

/**
 * Application shell (docs/AUTHENTICATED_APP_SHELL_ROUTING.md §7, §13).
 * Deliberately separate from the marketing shell in src/app/page.tsx —
 * no Product / How it works / For teams here, and the logo stays inside
 * the app (§8: clicking it must never eject a user into marketing).
 *
 * Runs the Clerk <-> Participant bridge on every /app visit — middleware
 * already guarantees a session exists here, so this is a plain find-or-create.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  await getOrCreateCurrentParticipant();

  return (
    <div style={{ minHeight: "100dvh" }}>
      <nav style={styles.nav}>
        <div className="app-nav-inner">
          <div className="app-nav-left">
            <Link href="/app" style={styles.logo}>WenMeet</Link>
            <AppNavLinks />
          </div>
          <div className="app-nav-right">
            {/* Label shortens on narrow screens so the nav can't overflow. */}
            <Link href="/app/new" className="pill-button pill-button-primary app-nav-cta">
              <span className="app-nav-cta-full">+ New WenMeet</span>
              <span className="app-nav-cta-short">+ New</span>
            </Link>
            <UserButton />
          </div>
        </div>
      </nav>
      <main id="main" style={{ maxWidth: 1040, margin: "0 auto", padding: "2rem 1.5rem" }}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    borderBottom: "1px solid var(--border)",
    background: "var(--surface)",
  },
  logo: { fontWeight: 800, fontSize: "1rem", color: "var(--text)", textDecoration: "none" },
};
