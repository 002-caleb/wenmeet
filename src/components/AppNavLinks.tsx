"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app/meetings", label: "Meetings" },
  { href: "/app/calendars", label: "Calendars" },
];

export function AppNavLinks() {
  const pathname = usePathname();
  return (
    <div style={{ display: "flex", gap: "1.25rem" }}>
      {LINKS.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              fontSize: "0.88rem",
              fontWeight: 600,
              color: active ? "var(--text)" : "var(--text-muted)",
              textDecoration: "none",
              borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
              paddingBottom: "0.2rem",
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
