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
        <div style={styles.navInner}>
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <Link href="/app" style={styles.logo}>WenMeet</Link>
            <AppNavLinks />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link href="/app/new" className="pill-button pill-button-primary" style={{ padding: "0.5rem 1.1rem", fontSize: "0.85rem" }}>
              + New WenMeet
            </Link>
            <UserButton />
          </div>
        </div>
      </nav>
      <main id="main" style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    borderBottom: "1px solid var(--border)",
    background: "var(--surface)",
  },
  navInner: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "0.85rem 1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { fontWeight: 800, fontSize: "1rem", color: "var(--text)", textDecoration: "none" },
};
