"use client";

interface ReadinessRingProps {
  kdmReady: number;
  kdmTotal: number;
  requiredReady: number;
  requiredTotal: number;
  /** Compact renders small enough for a dashboard row; default fits the detail page. */
  size?: "default" | "compact";
  onActivate?: () => void;
  expanded?: boolean;
}

/**
 * PRD §28-30: segmented by role, not a flat percentage. KDM (violet) and
 * required (WenMeet blue) confirmed arcs are drawn separately so a reader
 * can see *which* kind of gap remains, not just how big it is. Waived
 * participants are excluded upstream (readinessDetail.ts) — they never
 * appear as a "remaining" wedge here, per §28's "removed from the ring
 * rather than displayed as complete".
 */
export function ReadinessRing({
  kdmReady,
  kdmTotal,
  requiredReady,
  requiredTotal,
  size = "default",
  onActivate,
  expanded,
}: ReadinessRingProps) {
  const total = kdmTotal + requiredTotal;
  const readyCount = kdmReady + requiredReady;
  const isCompact = size === "compact";
  const dim = isCompact ? 34 : 72;
  const stroke = isCompact ? 4 : 7;
  const radius = dim / 2 - stroke;
  const circumference = 2 * Math.PI * radius;

  // Degenerate case: nobody gates this meeting. An empty ring reads as
  // "0 of 0", which is meaningless — show a plain dash instead.
  if (total === 0) {
    return (
      <span className="readiness-ring-empty" aria-hidden>
        &mdash;
      </span>
    );
  }

  const kdmFraction = kdmTotal > 0 ? kdmReady / total : 0;
  const requiredFraction = requiredTotal > 0 ? requiredReady / total : 0;
  const kdmLength = circumference * kdmFraction;
  const requiredLength = circumference * requiredFraction;

  const label = [
    kdmTotal > 0 ? `${kdmReady} of ${kdmTotal} key decision makers ready` : null,
    requiredTotal > 0 ? `${requiredReady} of ${requiredTotal} required attendees ready` : null,
  ]
    .filter(Boolean)
    .join(". ");

  const parts = [
    kdmTotal > 0 ? `${kdmReady}/${kdmTotal} KDM` : null,
    requiredTotal > 0 ? `${requiredReady}/${requiredTotal} required` : null,
  ].filter(Boolean);

  // Dashboard rows (Active/Attention) sometimes sit entirely inside a
  // <Link> — nesting a <button> there is invalid HTML regardless of the
  // disabled attribute (button is "interactive content" structurally, not
  // conditionally) and can cause hydration mismatches. Render a plain,
  // non-interactive <span> whenever there's nothing to activate; only the
  // detail page (which passes onActivate) gets the real button.
  const Tag = onActivate ? "button" : "span";
  const interactiveProps = onActivate
    ? { type: "button" as const, onClick: onActivate, "aria-expanded": Boolean(expanded) }
    : { role: "img" as const };

  return (
    <Tag
      className={`readiness-ring${isCompact ? " readiness-ring-compact" : ""}`}
      aria-label={`Readiness: ${readyCount} of ${total}. ${label}.`}
      {...interactiveProps}
    >
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} aria-hidden>
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth={stroke}
        />
        {kdmTotal > 0 && (
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="var(--kdm-accent)"
            strokeWidth={stroke}
            strokeDasharray={`${kdmLength} ${circumference - kdmLength}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          />
        )}
        {requiredTotal > 0 && (
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={stroke}
            strokeDasharray={`${requiredLength} ${circumference - requiredLength}`}
            strokeDashoffset={-kdmLength}
            strokeLinecap="round"
            transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          />
        )}
      </svg>
      {!isCompact && (
        <span className="readiness-ring-center">
          <strong>
            {readyCount}/{total}
          </strong>
        </span>
      )}
      {!isCompact && <span className="sr-only">{parts.join(" · ")}</span>}
    </Tag>
  );
}
