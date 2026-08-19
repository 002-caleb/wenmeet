"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const NAV_LINKS = [
  { href: "#coordination", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#scenarios", label: "For teams" },
];

/**
 * Marketing header.
 *
 * Below 820px the section links collapse behind a menu toggle — at mobile
 * widths five horizontal items overflowed the viewport and collided with
 * the wordmark. This is a disclosure pattern (button + aria-expanded +
 * aria-controls), not a modal dialog, so it needs no focus trap; Escape
 * and a click on the backdrop both close it.
 */
export function LandingNav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes and returns focus to the toggle; page scroll is locked
  // while the panel covers the page.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Growing past the breakpoint restores the horizontal nav, so an open
  // panel would otherwise be left hanging with no toggle to close it.
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 820px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Move focus into the panel so the links are the next thing reached.
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [open]);

  return (
    <nav data-hero-nav className={`site-nav${open ? " site-nav-open" : ""}`}>
      <div className="container site-nav-inner">
        <span className="site-nav-logo">WenMeet</span>

        {/* Desktop: full horizontal nav. */}
        <div className="site-nav-desktop">
          <div className="site-nav-links">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="site-nav-link">
                {link.label}
              </a>
            ))}
          </div>
          <SignedOut>
            <SignInButton mode="modal">
              <button type="button" className="site-nav-signin">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button type="button" className="cta-button cta-primary site-nav-cta">
                Create a WenMeet
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/app/new" className="cta-button cta-primary site-nav-cta">
              Create a WenMeet
            </Link>
            <UserButton />
          </SignedIn>
        </div>

        {/* Mobile: identity left, one action + toggle right. */}
        <div className="site-nav-mobile">
          <SignedOut>
            <SignInButton mode="modal">
              <button type="button" className="site-nav-signin site-nav-signin-compact">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>

          <button
            ref={toggleRef}
            type="button"
            className="site-nav-toggle"
            aria-expanded={open}
            aria-controls="site-nav-panel"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <IconMenu open={open} />
          </button>
        </div>
      </div>

      {open && <div className="site-nav-backdrop" onClick={() => setOpen(false)} aria-hidden />}

      <div
        id="site-nav-panel"
        ref={panelRef}
        className={`site-nav-panel${open ? " site-nav-panel-open" : ""}`}
        hidden={!open}
      >
        <div className="container site-nav-panel-inner">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="site-nav-panel-link" onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}

          <SignedOut>
            <SignUpButton mode="modal">
              <button type="button" className="cta-button cta-primary site-nav-panel-cta">
                Create a WenMeet
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/app/new" className="cta-button cta-primary site-nav-panel-cta" onClick={() => setOpen(false)}>
              Create a WenMeet
            </Link>
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}

function IconMenu({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      {open ? (
        <>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </>
      ) : (
        <>
          <path d="M3 7h18" />
          <path d="M3 12h18" />
          <path d="M3 17h18" />
        </>
      )}
    </svg>
  );
}
