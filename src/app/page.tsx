"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LandingNav } from "@/components/landing/LandingNav";
import { MeetingResolver } from "@/components/landing/MeetingResolver";
import { SampleShareLink } from "@/components/landing/SampleShareLink";
import { ScenarioExplorer } from "@/components/landing/ScenarioExplorer";
import { RESOLVER_SCENARIOS, ROLE_LABEL, ROLE_SYMBOL, type RoleKind } from "@/lib/landing/resolverScenarios";

const HERO_SCENARIO = RESOLVER_SCENARIOS[0]!;

const WORKFLOW_STEPS = [
  { label: "Choose", detail: "Pick times that work for you." },
  { label: "Share", detail: "Send one link." },
  { label: "Respond", detail: "No account needed." },
  { label: "Resolve", detail: "Earliest time everyone required is free." },
  // Deliberately describes the result WenMeet produces, not a calendar
  // write — booking to Google/Microsoft needs write scopes the app does
  // not request yet, so claiming it would be marketing something unbuilt.
  { label: "Confirm", detail: "Everyone sees the agreed time." },
];

const CALENDAR_PROVIDERS = ["Google Calendar", "Microsoft Outlook / 365"];
const MEETING_TYPES = ["Google Meet", "Microsoft Teams", "Custom link"];

const ROLE_LEGEND: RoleKind[] = ["required", "decision", "optional"];

const FINAL_STEPS = ["Create your availability.", "Share one link.", "Let WenMeet find the time."];

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);

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
        .from("[data-hero-resolver]", { x: 30, opacity: 0, duration: 0.7, ease: "power2.out" }, "-=0.3");

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

      gsap.utils.toArray<HTMLElement>("[data-glow]").forEach((el) => {
        gsap.to(el, { x: 24, y: -18, duration: 8, ease: "sine.inOut", yoyo: true, repeat: -1 });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} id="main">
      <LandingNav />

      <header className="hero-shell" style={styles.hero}>
        <div className="hero-glow hero-glow-a" data-glow aria-hidden />

        <div className="container hero-split">
          <div>
            <p data-hero-eyebrow style={styles.eyebrow}>Role-aware scheduling</p>
            <h1 data-hero-title style={styles.h1}>
              WenMeet knows who <span className="gradient-text">actually needs to be there.</span>
            </h1>
            <p data-hero-sub style={styles.heroSub}>
              Calendars can tell you who&rsquo;s busy. WenMeet finds the best meeting based on
              who&rsquo;s required, who decides, who&rsquo;s optional, preferences, calendars, and
              timezones.
            </p>
            <div data-hero-cta style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap" }}>
              <Link href="/app/new" className="cta-button cta-primary">
                Create a WenMeet
              </Link>
              <a href="#coordination" className="cta-button cta-secondary">
                Try a live example &rarr;
              </a>
            </div>
            <p data-hero-micro style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "1.1rem" }}>
              Participants don&rsquo;t need an account.
            </p>
          </div>

          <div data-hero-resolver>
            <MeetingResolver scenario={HERO_SCENARIO} />
            <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", marginTop: "0.9rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {ROLE_LEGEND.map((role) => (
                <span key={role}>
                  <span aria-hidden style={{ marginRight: "0.3rem" }}>{ROLE_SYMBOL[role]}</span>
                  {ROLE_LABEL[role]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="container" style={{ marginTop: "2.5rem" }}>
        <div data-reveal style={{ textAlign: "center" }}>
          <p style={styles.proofLine}>
            6 people &middot; 3 timezones &middot; 2 calendar systems &middot; 1 meeting that actually works.
          </p>
          <p style={styles.sectionSub}>
            Google Calendar &middot; Microsoft 365 &nbsp;|&nbsp; Los Angeles &rarr; London &rarr; Singapore
          </p>
        </div>
      </section>

      <section id="coordination" className="container" style={{ marginTop: "4.5rem" }}>
        <div data-reveal style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 1.5rem" }}>
          <p style={styles.sectionSub}>Calendars know when you&rsquo;re busy.</p>
          <h2 style={styles.h2}>Availability isn&rsquo;t the same as viability.</h2>
        </div>
        <div data-reveal className="compare-grid" style={{ maxWidth: 700, margin: "0 auto" }}>
          <div className="compare-panel compare-panel-muted">
            <p style={styles.compareEyebrow}>A normal scheduler asks</p>
            <p style={styles.compareStatement}>Are these calendars free?</p>
          </div>
          <div className="compare-panel compare-panel-accent">
            <p style={{ ...styles.compareEyebrow, color: "rgba(255,255,255,0.85)" }}>WenMeet asks</p>
            <p style={styles.compareStatement}>
              Can the people required to make this meeting useful actually attend?
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="container" style={{ marginTop: "4.5rem" }}>
        <div data-reveal style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <h2 style={styles.h2}>How it works</h2>
        </div>
        <div data-reveal className="workflow-flow">
          {WORKFLOW_STEPS.map((s, i) => (
            <div key={s.label} style={{ display: "contents" }}>
              <div className="workflow-step">
                <span className="workflow-step-label">{s.label}</span>
                <span className="workflow-step-detail">{s.detail}</span>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && <span className="workflow-arrow" aria-hidden>&rarr;</span>}
            </div>
          ))}
        </div>
        <div data-reveal style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
          <SampleShareLink />
        </div>
      </section>

      <section className="container" style={{ marginTop: "4.5rem" }}>
        <div data-reveal style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 2rem" }}>
          <h2 style={styles.h2}>Google people meet Microsoft people.</h2>
          <p style={styles.sectionSub}>Your network doesn&rsquo;t live inside one calendar ecosystem. Neither should your scheduler.</p>
        </div>
        <div data-reveal className="interop-diagram">
          <div className="interop-column">
            {CALENDAR_PROVIDERS.map((p) => (
              <span key={p} className="interop-node"><IconCalendar />{p}</span>
            ))}
          </div>
          <div className="interop-hub">WENMEET</div>
          <div className="interop-column">
            {MEETING_TYPES.map((m) => (
              <span key={m} className="interop-node"><IconVideo />{m}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="scenarios" className="container" style={{ marginTop: "4.5rem" }}>
        <div data-reveal style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 1.5rem" }}>
          <h2 style={styles.h2}>Built for meetings that involve more than two calendars.</h2>
        </div>
        <div data-reveal style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <ScenarioExplorer />
        </div>
      </section>

      <section className="container" style={{ marginTop: "4.5rem" }}>
        <div data-reveal className="privacy-section" style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ ...styles.h2, color: "#fff" }}>Your calendar isn&rsquo;t our business.</h2>
          <p style={{ marginTop: "0.75rem" }}>
            WenMeet needs to know when you&rsquo;re unavailable. It doesn&rsquo;t need to know what
            you&rsquo;re doing.
          </p>
        </div>
      </section>

      <section className="container" style={{ marginTop: "4.5rem", marginBottom: "5rem" }}>
        <div data-reveal style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
          <h2 style={styles.h2}>Find the meeting that actually works.</h2>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem 1.5rem", flexWrap: "wrap", margin: "1.25rem 0 1.75rem", color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600 }}>
            {FINAL_STEPS.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <Link href="/app/new" className="cta-button cta-primary">
            Create a WenMeet
          </Link>
          <p style={{ ...styles.sectionSub, marginTop: "1.1rem", fontSize: "0.85rem" }}>
            Participants don&rsquo;t need an account.
          </p>
        </div>
      </section>

      <footer style={styles.footer}>
        <div className="container" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
            WenMeet &middot;{" "}
            <a
              href="https://conscience.fund"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-brand-link"
            >
              Conscious Capital Brands
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: { padding: "3.5rem 0" },
  eyebrow: {
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--accent)",
    marginBottom: "0.75rem",
  },
  h1: {
    fontSize: "clamp(2rem, 4.2vw, 3.2rem)",
    lineHeight: 1.12,
    letterSpacing: "-0.03em",
    fontWeight: 700,
    margin: "0 0 1.1rem",
  },
  heroSub: {
    color: "var(--text-muted)",
    fontSize: "1.05rem",
    lineHeight: 1.6,
    maxWidth: 460,
    margin: "0 0 1.75rem",
  },
  proofLine: {
    fontSize: "1.15rem",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    margin: "0 0 0.35rem",
  },
  h2: { fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 0.35rem" },
  sectionSub: { color: "var(--text-muted)", fontSize: "0.95rem", margin: 0, lineHeight: 1.6 },
  compareEyebrow: { fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem" },
  compareStatement: { fontSize: "1.05rem", fontWeight: 700, margin: 0 },
  footer: { padding: "0 0 4rem" },
};

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
