"use client";

import { useEffect, useState } from "react";
import {
  ROLE_LABEL,
  ROLE_SYMBOL,
  type ResolverScenario,
} from "@/lib/landing/resolverScenarios";

type Phase = "initial" | "blocking" | "resolved";

/**
 * The hero's animated miniature of WenMeet's scheduling process
 * (docs/LANDING_PAGE_DESIGN_PRD.md §9-12). Deliberately state-driven
 * (INITIAL -> BLOCKING -> RESOLVED) rather than a decorative animation
 * layer, so reduced-motion can just render the end state directly and
 * screen readers get one clear description of what happened.
 */
export function MeetingResolver({ scenario }: { scenario: ResolverScenario }) {
  const [phase, setPhase] = useState<Phase>("resolved");
  const [explained, setExplained] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
  }, []);

  useEffect(() => {
    setExplained(false);
    if (reducedMotion) {
      setPhase("resolved");
      return;
    }

    setPhase("initial");
    const toBlocking = setTimeout(() => setPhase("blocking"), 700);
    const toResolved = setTimeout(() => setPhase("resolved"), 1900);
    let loop: ReturnType<typeof setInterval> | undefined;
    const armLoop = setTimeout(() => {
      loop = setInterval(() => {
        setPhase("initial");
        setTimeout(() => setPhase("blocking"), 700);
        setTimeout(() => setPhase("resolved"), 1900);
      }, 5200);
    }, 1900);

    return () => {
      clearTimeout(toBlocking);
      clearTimeout(toResolved);
      clearTimeout(armLoop);
      if (loop) clearInterval(loop);
    };
  }, [scenario.key, reducedMotion]);

  const requiredCount = scenario.participants.filter((p) => p.role === "required" || p.role === "decision").length;
  const requiredReady = phase === "resolved" ? requiredCount : 0;
  const optionalTotal = scenario.participants.filter((p) => p.role === "optional").length;
  const optionalReady = phase === "resolved" ? scenario.optionalReady : 0;

  const winner = scenario.candidates.find((c) => c.id === scenario.winnerCandidateId);
  const accessibleSummary =
    phase === "resolved" && winner
      ? `${winner.label}. Best match. Every required attendee and decision maker is available.`
      : "Finding the best time…";

  return (
    <div className="mock-window">
      <div className="mock-chrome">
        <span className="mock-dot" />
        <span className="mock-dot" />
        <span className="mock-dot" />
      </div>

      <div className="mock-body">
        <div className="mock-pane">
          <div style={{ fontWeight: 700 }}>{scenario.title}</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.9rem" }}>
            {scenario.duration} &middot; {scenario.location}
          </div>

          <div className="resolver-label">Candidate times</div>
          <div className="resolver-candidates">
            {scenario.candidates.map((c) => {
              const isBlocked = phase !== "initial" && c.id === scenario.blockedCandidateId;
              const isWinner = phase === "resolved" && c.id === scenario.winnerCandidateId;
              return (
                <div
                  key={c.id}
                  className={`resolver-candidate${isBlocked ? " resolver-candidate-blocked" : ""}${isWinner ? " resolver-candidate-winner" : ""}`}
                >
                  {c.label}
                  {isBlocked && <span className="resolver-candidate-tag">blocked</span>}
                </div>
              );
            })}
          </div>

          <div className="resolver-label" style={{ marginTop: "1rem" }}>Participants</div>
          <ul className="resolver-participants">
            {scenario.participants.map((p) => (
              <li key={p.name}>
                <span className={`resolver-role resolver-role-${p.role}`} aria-hidden>
                  {ROLE_SYMBOL[p.role]}
                </span>
                <span>{p.name}</span>
                <span className="resolver-role-label">{ROLE_LABEL[p.role]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mock-pane">
          <div className="resolver-best-label">Best match</div>
          <div className="resolver-best-time" aria-live="polite">
            {phase === "resolved" && winner ? winner.label : " "}
          </div>
          {phase === "resolved" && (
            <div className="resolver-location">
              <IconLocationPin />
              {scenario.location}
            </div>
          )}
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 0.75rem" }}>
            {phase === "resolved" ? "Everyone required is available." : "Checking availability…"}
          </p>

          <div className="resolver-state-line">
            <span>Required <strong>{requiredReady}/{requiredCount}</strong> {requiredReady === requiredCount && phase === "resolved" ? "✓" : ""}</span>
            <span>Optional <strong>{optionalReady}/{optionalTotal}</strong></span>
          </div>

          <button
            type="button"
            className="resolver-why"
            onClick={() => setExplained((v) => !v)}
            aria-expanded={explained}
          >
            Why this time? {explained ? "▴" : "▾"}
          </button>
          {explained && <p className="resolver-explanation">{scenario.explanation}</p>}
        </div>
      </div>

      <span className="sr-only" role="status">
        {accessibleSummary}
      </span>
    </div>
  );
}

function IconLocationPin() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
