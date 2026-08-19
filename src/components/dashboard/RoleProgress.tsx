import { ROLE_SYMBOL, ROLE_SYMBOL_LABEL } from "@/lib/copy/statusCopy";
import type { RoleProgress as RoleProgressData } from "@/lib/dashboard/workspaceView";

/**
 * Compact ● / ◆ / ○ readout (§31). Only renders roles actually in play on
 * this meeting, and never invents a role the backend didn't report.
 */
export function RoleProgress({ progress }: { progress: RoleProgressData }) {
  const rows = [
    { key: "required" as const, ...progress.required },
    { key: "kdm" as const, ...progress.decision },
    { key: "optional" as const, ...progress.optional },
  ].filter((r) => r.total > 0);

  if (rows.length === 0) return null;

  return (
    <span className="role-progress">
      {rows.map((r) => (
        <span key={r.key} className="role-progress-item">
          <span aria-hidden className={`role-symbol role-symbol-${r.key}`}>
            {ROLE_SYMBOL[r.key]}
          </span>
          <span className="sr-only">{ROLE_SYMBOL_LABEL[r.key]} </span>
          <span className="role-progress-count">
            {r.ready}/{r.total}
          </span>
        </span>
      ))}
    </span>
  );
}

/** §46: one plain-language sentence per meeting for assistive tech. */
export function roleProgressSentence(progress: RoleProgressData): string {
  const parts: string[] = [];
  if (progress.required.total > 0) {
    parts.push(`${progress.required.ready} of ${progress.required.total} required ready`);
  }
  if (progress.decision.total > 0) {
    parts.push(`${progress.decision.ready} of ${progress.decision.total} decision makers ready`);
  }
  if (progress.optional.total > 0) {
    parts.push(`${progress.optional.ready} of ${progress.optional.total} optional ready`);
  }
  return parts.join(". ");
}
