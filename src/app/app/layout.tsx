import Link from "next/link";
import type { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";

/**
 * Application shell (docs/AUTHENTICATED_APP_SHELL_ROUTING.md §7, §13).
 * Deliberately separate from the marketing shell in src/app/page.tsx —
 * no Product / How it works / For teams here, and the logo stays inside
 * the app (§8: clicking it must never eject a user into marketing).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <Link href="/app" style={styles.logo}>WenMeet</Link>
            <div style={{ display: "flex", gap: "1.25rem" }}>
              <Link href="/app/meetings" style={styles.navLink}>Meetings</Link>
              <Link href="/app/calendars" style={styles.navLink}>Calendars</Link>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link href="/app/new" className="pill-button pill-button-primary" style={{ padding: "0.5rem 1.1rem", fontSize: "0.85rem" }}>
              + New WenMeet
            </Link>
            <UserButton />
          </div>
        </div>
      </nav>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>{children}</main>
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
  navLink: { fontSize: "0.88rem", fontWeight: 600, color: "var(--text-muted)", textDecoration: "none" },
};
