"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const DEMO_HREF = "/meetings/demo/availability";
const DEMO_LINK = "wenmeet.com/m/strategy-7KQ4";

const AVAIL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const AVAIL_ROWS: { time: string; cells: ("Available" | "Busy" | "Preferred")[] }[] = [
  { time: "9:00", cells: ["Available", "Busy", "Available", "Available", "Available"] },
  { time: "10:00", cells: ["Available", "Available", "Available", "Available", "Busy"] },
  { time: "11:00", cells: ["Busy", "Available", "Preferred", "Available", "Available"] },
];
const AVAIL_CLASS: Record<string, string> = {
  Available: "avail-available",
  Busy: "avail-busy",
  Preferred: "avail-preferred",
};

const READY_PEOPLE = ["Aman", "Caleb", "Elias"];

const STEPS = [
  { title: "Show when you’re free", body: "Connect Google or Microsoft, then adjust the times you actually want to offer." },
  { title: "Share your WenMeet", body: "Send one link to one person or twenty." },
  { title: "Everyone responds", body: "Participants connect their calendar or enter availability manually. WenMeet handles different timezones automatically." },
  { title: "WenMeet finds the overlap", body: "Required attendees and decision makers must be available. Optional attendees improve the result without blocking it." },
  { title: "Book it", body: "Create the calendar invitation and add Google Meet, Microsoft Teams, or your own meeting link." },
];

const ROLES = [
  { tag: "Required", body: "Must be available." },
  { tag: "Decision maker", body: "Must be available." },
  { tag: "Optional", body: "Improves the result but never blocks the meeting." },
];

const CALENDAR_PROVIDERS = ["Google Calendar", "Microsoft Outlook / Microsoft 365"];
const MEETING_TYPES = ["Google Meet", "Microsoft Teams", "Custom meeting links", "Phone / in person"];

const TIMEZONE_BULLETS = ["No spreadsheets.", "No time zone math.", "No “wait, is that 10 your time or mine?”"];

const FINAL_STEPS = ["Create your availability.", "Share one link.", "Let WenMeet find the time."];

const USE_CASES = [
  "Investor introductions",
  "Hiring panels",
  "Client strategy calls",
  "Board meetings",
  "Partnership discussions",
  "Advisor calls",
  "Distributed team meetings",
];

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from("[data-hero-nav]", { y: -16, opacity: 0, duration: 0.5 })
        .from("[data-hero-eyebrow]", { y: 12, opacity: 0, duration: 0.5 }, "-=0.25")
        .from("[data-hero-title]", { y: 24, opacity: 0, duration: 0.6 }, "-=0.3")
        .from("[data-hero-sub]", { y: 16, opacity: 0, duration: 0.5 }, "-=0.35")
        .from("[data-hero-cta] > *", { y: 12, opacity: 0, duration: 0.45, stagger: 0.08 }, "-=0.3")
        .from("[data-hero-micro]", { opacity: 0, duration: 0.4 }, "-=0.2")
        .from("[data-hero-providers]", { opacity: 0, duration: 0.5 }, "-=0.15")
        .from("[data-hero-mock]", { y: 40, opacity: 0, duration: 0.7, ease: "power2.out" }, "-=0.1");

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 28,
          opacity: 0,
          duration: 0.55,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal-stagger]").forEach((group) => {
        gsap.from(group.children, {
          y: 24,
          opacity: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: { trigger: group, start: "top 85%", once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-glow]").forEach((el, i) => {
        gsap.to(el, {
          x: i % 2 === 0 ? 30 : -24,
          y: i % 2 === 0 ? -24 : 26,
          duration: 7 + i,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${DEMO_LINK}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — no-op, button label simply won't confirm
    }
  };

  return (
    <div ref={rootRef}>
      <nav data-hero-nav style={styles.nav}>
        <div className="container" style={styles.navInner}>
          <span style={styles.logo}>WenMeet</span>
          <div style={{ display: "flex", alignItems: "center", gap: "1.75rem" }}>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <a href="#for-teams" style={styles.navLink}>Product</a>
              <a href="#how-it-works" style={styles.navLink}>How it works</a>
              <a href="#for-teams" style={styles.navLink}>For teams</a>
            </div>
            <button type="button" title="Coming soon" style={styles.signInLink}>
              Sign in
            </button>
            <Link href={DEMO_HREF} className="pill-button pill-button-primary" style={{ padding: "0.5rem 1.2rem", fontSize: "0.85rem" }}>
              Create a WenMeet &rarr;
            </Link>
          </div>
        </div>
      </nav>

      <header className="hero-shell" style={styles.hero}>
        <div className="hero-grid" aria-hidden />
        <div className="hero-glow hero-glow-a" data-glow aria-hidden />
        <div className="hero-glow hero-glow-b" data-glow aria-hidden />
        <div className="hero-glow hero-glow-c" data-glow aria-hidden />

        <div className="container" style={{ textAlign: "center" }}>
          <p data-hero-eyebrow style={styles.eyebrow}>Stop asking</p>
          <h1 data-hero-title style={styles.h1}>
            <span className="gradient-text">&ldquo;What time works for everyone?&rdquo;</span>
          </h1>
          <p data-hero-sub style={styles.heroSub}>
            WenMeet finds the best time across people, calendars, roles, and timezones &mdash;
            then gets the meeting booked.
          </p>
          <div data-hero-cta style={{ display: "flex", justifyContent: "center", gap: "0.85rem", flexWrap: "wrap" }}>
            <Link href={DEMO_HREF} className="pill-button pill-button-primary">
              Create a WenMeet
            </Link>
            <a href="#how-it-works" className="pill-button pill-button-secondary">
              See how it works
            </a>
          </div>
          <p data-hero-micro style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "1.1rem" }}>
            No account required for participants.
          </p>

          <div data-hero-providers style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.6rem", marginTop: "1.75rem" }}>
            {["Google Calendar", "Outlook", "Google Meet", "Microsoft Teams"].map((p) => (
              <span key={p} className="marquee-chip">{p}</span>
            ))}
          </div>
        </div>

        <div className="container" data-hero-mock style={{ marginTop: "3.5rem", maxWidth: 760 }}>
          <div className="mock-window">
            <div className="mock-chrome">
              <span className="mock-dot" />
              <span className="mock-dot" />
              <span className="mock-dot" />
            </div>
            <div className="mock-body">
              <div className="mock-pane">
                <div style={{ fontWeight: 700 }}>Board Strategy Call</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                  30 min &middot; Next 5 business days
                </div>

                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginTop: "0.75rem" }}>
                  Your availability
                </div>
                <table className="avail-table">
                  <thead>
                    <tr>
                      <th />
                      {AVAIL_DAYS.map((d) => (
                        <th key={d}>{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {AVAIL_ROWS.map((row) => (
                      <tr key={row.time}>
                        <th style={{ textAlign: "right", paddingRight: "0.4rem", color: "var(--text-muted)", fontWeight: 500 }}>{row.time}</th>
                        {row.cells.map((c, i) => (
                          <td key={i} className={AVAIL_CLASS[c]}>{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ fontSize: "0.8rem", fontWeight: 700, marginTop: "0.9rem" }}>3 people ready</div>
                <ul className="ready-list">
                  {READY_PEOPLE.map((p) => (
                    <li key={p}>
                      <span className="check"><IconCheck /></span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mock-pane">
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent)" }}>Best match</div>
                <div className="best-match-time">Thursday &middot; 10:00 AM PT</div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
                  Everyone required is available.
                </p>
                <button type="button" className="pill-button pill-button-primary" style={{ width: "100%" }}>
                  Book this time
                </button>
              </div>
            </div>
          </div>

          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "1.1rem" }}>
            New York &middot; London &middot; Singapore
            <br />
            WenMeet handles the timezone math automatically.
          </p>
        </div>
      </header>

      <section className="container" style={{ marginTop: "5.5rem" }}>
        <div data-reveal style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 1.75rem" }}>
          <p style={styles.eyebrowSmall}>Share One Link</p>
          <h2 style={styles.h2}>Scheduling starts with you.</h2>
          <p style={{ ...styles.sectionSub, marginBottom: "0.25rem" }}>Choose when you can meet.</p>
        </div>
        <div data-reveal style={{ textAlign: "center" }}>
          <p style={styles.sectionSub}>WenMeet gives you one link you can drop anywhere:</p>
          <div style={{ display: "flex", justifyContent: "center", margin: "1rem 0" }}>
            <div className="link-copy">
              <code>{DEMO_LINK}</code>
              <button type="button" onClick={copyLink} className="pill-button pill-button-primary" style={{ padding: "0.45rem 1.1rem", fontSize: "0.85rem" }}>
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>
          <p style={styles.sectionSub}>
            Text it. Email it. Drop it into Slack, WhatsApp, Teams, LinkedIn, or a group chat.
          </p>
          <p style={{ ...styles.sectionSub, marginTop: "0.4rem" }}>
            Nobody needs to create an account just to tell you when they&rsquo;re free.
          </p>
        </div>
      </section>

      <section id="how-it-works" className="container" style={{ marginTop: "5.5rem" }}>
        <div data-reveal style={{ marginBottom: "1.75rem", textAlign: "center" }}>
          <h2 style={styles.h2}>How It Works</h2>
        </div>
        <div data-reveal-stagger style={{ display: "grid", gap: "1.4rem", maxWidth: 640, margin: "0 auto" }}>
          {STEPS.map((s, i) => (
            <div key={s.title} className="step-row">
              <span className="step-number">{i + 1}</span>
              <div>
                <h3 style={{ ...styles.cardTitle, marginBottom: "0.25rem" }}>{s.title}</h3>
                <p style={styles.cardBody}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container" style={{ marginTop: "5.5rem" }}>
        <div data-reveal style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 1.75rem" }}>
          <p style={styles.sectionSub}>Calendars know when you&rsquo;re busy.</p>
          <h2 style={styles.h2}>WenMeet knows who actually needs to be there.</h2>
        </div>
        <div data-reveal className="compare-grid" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="compare-panel compare-panel-muted">
            <p style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem" }}>
              A normal scheduler asks
            </p>
            <p style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Are these calendars free?</p>
          </div>
          <div className="compare-panel compare-panel-accent">
            <p style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem", opacity: 0.85 }}>
              WenMeet asks
            </p>
            <p style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
              Can the people required to make this meeting useful actually attend?
            </p>
          </div>
        </div>
        <div data-reveal-stagger style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem", maxWidth: 720, margin: "1.75rem auto 0" }}>
          {ROLES.map((r) => (
            <div key={r.tag} className="card" style={{ padding: "1.1rem 1.25rem" }}>
              <span className="badge badge-locked" style={{ marginBottom: "0.5rem" }}>{r.tag}</span>
              <p style={{ ...styles.cardBody, margin: 0 }}>{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="for-teams" className="container" style={{ marginTop: "5.5rem" }}>
        <div data-reveal style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 1.75rem" }}>
          <h2 style={styles.h2}>Google people meet Microsoft people.</h2>
          <p style={styles.sectionSub}>Your network doesn&rsquo;t live inside one calendar ecosystem.</p>
        </div>

        <div data-reveal style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <p style={{ ...styles.sectionSub, marginBottom: "0.75rem" }}>WenMeet supports:</p>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.6rem" }}>
            {CALENDAR_PROVIDERS.map((p) => (
              <span key={p} className="provider-chip"><IconCalendar />{p}</span>
            ))}
          </div>
        </div>

        <div data-reveal style={{ textAlign: "center" }}>
          <p style={{ ...styles.sectionSub, marginBottom: "0.75rem" }}>And meetings can happen through:</p>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.6rem" }}>
            {MEETING_TYPES.map((m) => (
              <span key={m} className="provider-chip"><IconVideo />{m}</span>
            ))}
          </div>
        </div>

      </section>

      <section className="container" style={{ marginTop: "5.5rem" }}>
        <div data-reveal style={{ textAlign: "center", maxWidth: 620, margin: "0 auto" }}>
          <h2 style={styles.h2}>Everyone sees the right time.</h2>
          <p style={styles.sectionSub}>
            WenMeet handles timezones automatically, so every participant sees availability in
            their own local time.
          </p>
          <p style={{ ...styles.sectionSub, marginTop: "0.75rem" }}>
            Toronto &middot; Berlin &middot; San Francisco
          </p>
          <p style={{ ...styles.sectionSub, marginTop: "1.25rem" }}>
            {TIMEZONE_BULLETS.join("  ·  ")}
          </p>
        </div>
      </section>

      <section className="container" style={{ marginTop: "5.5rem" }}>
        <div data-reveal style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2 style={styles.h2}>Built for meetings that involve more than two calendars.</h2>
        </div>
        <div data-reveal-stagger style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.6rem" }}>
          {USE_CASES.map((u) => (
            <span key={u} className="provider-chip">{u}</span>
          ))}
        </div>
      </section>

      <section className="container" style={{ marginTop: "5.5rem" }}>
        <div data-reveal className="card" style={{ padding: "2.25rem", textAlign: "center", maxWidth: 620, margin: "0 auto" }}>
          <h2 style={styles.h2}>Your calendar isn&rsquo;t our business.</h2>
          <p style={{ ...styles.sectionSub, marginTop: "0.75rem" }}>
            WenMeet needs to know when you&rsquo;re busy. It doesn&rsquo;t need to know why.
          </p>
        </div>
      </section>

      <section className="container" style={{ marginTop: "5.5rem", marginBottom: "5rem" }}>
        <div data-reveal style={{ textAlign: "center", maxWidth: 620, margin: "0 auto" }}>
          <h2 style={styles.h2}>Your next meeting shouldn&rsquo;t take 17 messages to schedule.</h2>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem 1.5rem", flexWrap: "wrap", margin: "1.25rem 0 1.75rem", color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600 }}>
            {FINAL_STEPS.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <Link href={DEMO_HREF} className="pill-button pill-button-primary">
            Create a WenMeet &rarr;
          </Link>
          <p style={{ ...styles.sectionSub, marginTop: "1.1rem", fontSize: "0.85rem" }}>
            Google Calendar &middot; Outlook &middot; Meet &middot; Teams
          </p>
          <p style={{ ...styles.sectionSub, fontSize: "0.82rem" }}>No participant account required.</p>
        </div>
      </section>

      <footer style={styles.footer}>
        <div className="container" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
            WenMeet &middot; Conscious Capital Brands
          </p>
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "color-mix(in srgb, var(--bg) 88%, transparent)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid var(--border)",
  },
  navInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: "1rem",
    paddingBottom: "1rem",
  },
  navLink: {
    fontSize: "0.88rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    textDecoration: "none",
  },
  signInLink: {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: "0.88rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    cursor: "pointer",
  },
  logo: { fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.01em" },
  hero: { padding: "4.5rem 0 3.5rem" },
  eyebrow: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    marginBottom: "0.5rem",
  },
  eyebrowSmall: {
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--accent)",
    marginBottom: "0.4rem",
  },
  h1: {
    fontSize: "clamp(1.9rem, 4.8vw, 3.1rem)",
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
    fontWeight: 800,
    margin: "0 0 1.1rem",
  },
  heroSub: {
    color: "var(--text-muted)",
    fontSize: "1.08rem",
    lineHeight: 1.65,
    maxWidth: 560,
    margin: "0 auto 2rem",
  },
  h2: { fontSize: "1.55rem", fontWeight: 750, letterSpacing: "-0.01em", margin: "0 0 0.35rem" },
  sectionSub: { color: "var(--text-muted)", fontSize: "0.98rem", margin: 0, lineHeight: 1.6 },
  cardTitle: { fontSize: "1.02rem", fontWeight: 700, margin: 0 },
  cardBody: { color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: 1.55, margin: 0 },
  footer: { padding: "0 0 4rem" },
};

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconVideo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}
