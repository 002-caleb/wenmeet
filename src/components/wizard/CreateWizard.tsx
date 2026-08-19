"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TimezonePicker } from "@/components/TimezonePicker";
import { SchedulingWindowStep } from "./SchedulingWindowStep";
import { ROLE_SYMBOL, ROLE_SYMBOL_LABEL } from "@/lib/copy/statusCopy";
import { detectBrowserTimezone } from "@/lib/timezone/tzConvert";
import { describeZone } from "@/lib/timezone/zones";
import {
  DURATION_OPTIONS,
  WIZARD_STEPS,
  emptyDraft,
  roleCounts,
  toDeadlineUtc,
  toWindowUtc,
  validateStep,
  type DraftInvite,
  type WizardDraft,
  type WizardStep,
} from "@/lib/wizard/draft";
import type { AssignableRole, MeetingLocationKind } from "@/lib/types";
import { describePolicy } from "@/lib/wizard/describePolicy";

const LOCATION_OPTIONS: Array<{ kind: MeetingLocationKind; label: string; hint?: string }> = [
  { kind: "google_meet", label: "Google Meet" },
  { kind: "teams", label: "Microsoft Teams" },
  { kind: "custom_link", label: "Custom link" },
  { kind: "phone", label: "Phone" },
  { kind: "in_person", label: "In person" },
  { kind: "undecided", label: "Decide later" },
];

const ROLE_OPTIONS: Array<{ role: AssignableRole; blurb: string }> = [
  { role: "required", blurb: "The meeting can't happen without them." },
  { role: "kdm", blurb: "Needed to make or approve the decision." },
  { role: "optional", blurb: "Helpful, but never blocks the meeting." },
];

interface CreateWizardProps {
  /** Saved organizer timezone. Empty means fall back to the browser's. */
  initialTimezone: string;
  connectedProviders: Array<"google" | "microsoft">;
}

export function CreateWizard({ initialTimezone, connectedProviders }: CreateWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<WizardDraft>(() => emptyDraft(initialTimezone || "UTC"));
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const step = WIZARD_STEPS[stepIndex]!;

  // Only guess when there is no saved preference — otherwise the organizer's
  // stored choice would be silently overwritten by whatever device they open.
  useEffect(() => {
    if (initialTimezone) return;
    const detected = detectBrowserTimezone();
    setDraft((d) =>
      d.timezoneDetected
        ? { ...d, timezone: detected, constraints: { ...d.constraints, timezone: detected } }
        : d,
    );
  }, [initialTimezone]);

  // Suggest the provider matching a connected calendar. A suggestion, not a
  // lock — the organizer can pick anything.
  useEffect(() => {
    setDraft((d) => {
      if (d.locationKind !== "undecided") return d;
      if (connectedProviders.includes("google")) return { ...d, locationKind: "google_meet" };
      if (connectedProviders.includes("microsoft")) return { ...d, locationKind: "teams" };
      return d;
    });
  }, [connectedProviders]);

  const patch = (next: Partial<WizardDraft>) => setDraft((d) => ({ ...d, ...next }));
  const counts = useMemo(() => roleCounts(draft), [draft]);
  const zone = useMemo(() => describeZone(draft.timezone), [draft.timezone]);
  const windowSummary = useMemo(() => describePolicy(draft.policy, draft.constraints), [draft.policy, draft.constraints]);

  function goTo(index: number) {
    // Moving backward never validates — the user is fixing something.
    if (index < stepIndex) {
      setErrors([]);
      setStepIndex(index);
      return;
    }
    const problems = validateStep(step, draft);
    setErrors(problems);
    if (problems.length === 0) setStepIndex(index);
  }

  function addInvite() {
    const key = `i${Date.now()}${draft.invites.length}`;
    patch({ invites: [...draft.invites, { key, name: "", email: "", role: "required" }] });
  }

  function updateInvite(key: string, next: Partial<DraftInvite>) {
    patch({ invites: draft.invites.map((i) => (i.key === key ? { ...i, ...next } : i)) });
  }

  function removeInvite(key: string) {
    patch({ invites: draft.invites.filter((i) => i.key !== key) });
  }

  /** Accepts a pasted block of addresses and turns each into a row. */
  function bulkAdd(raw: string) {
    const found = raw.match(/[^\s,;<>()"']+@[^\s,;<>()"']+\.[^\s,;<>()"']+/g);
    if (!found) return;
    const existing = new Set(draft.invites.map((i) => i.email.trim().toLowerCase()));
    const additions: DraftInvite[] = [];
    found.forEach((email, n) => {
      const clean = email.trim().toLowerCase();
      if (existing.has(clean)) return;
      existing.add(clean);
      additions.push({ key: `p${Date.now()}${n}`, name: "", email: clean, role: "required" });
    });
    if (additions.length > 0) patch({ invites: [...draft.invites, ...additions] });
  }

  async function submit() {
    const problems = validateStep("Place", draft);
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }

    setSubmitting(true);
    setErrors([]);
    try {
      const bounds = toWindowUtc(draft);
      if (!bounds) throw new Error("No scheduling days remain in that window.");
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          durationMinutes: draft.durationMinutes,
          schedulingPolicy: draft.policy,
          schedulingConstraints: draft.constraints,
          timezone: draft.timezone,
          location: { kind: draft.locationKind, detail: draft.locationDetail.trim() || null },
          responseDeadlineUtc: toDeadlineUtc(draft),
          invites: draft.invites
            .filter((i) => i.email.trim())
            .map((i) => ({ name: i.name.trim(), email: i.email.trim(), role: i.role })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't create that meeting.");
      router.push(`/app/meetings/${body.id}?created=1`);
      router.refresh();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Something went wrong."]);
      setSubmitting(false);
    }
  }

  return (
    <div className="wiz">
      <Stepper stepIndex={stepIndex} onGoTo={goTo} />

      <div className="wiz-body">
        <div className="wiz-main">
          {step === "Meeting" && (
            <section className="wiz-step" aria-labelledby="wiz-h">
              <h1 id="wiz-h" className="wiz-title">What are we meeting about?</h1>

              <label className="wiz-field">
                <span className="wiz-label">Meeting name</span>
                <input
                  className="wiz-input"
                  value={draft.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="Board strategy call"
                  autoFocus
                />
              </label>

              <fieldset className="wiz-field">
                <legend className="wiz-label">How long?</legend>
                <div className="seg-group" role="radiogroup" aria-label="Meeting length">
                  {DURATION_OPTIONS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      role="radio"
                      aria-checked={draft.durationMinutes === mins}
                      className={`seg${draft.durationMinutes === mins ? " seg-active" : ""}`}
                      onClick={() => patch({ durationMinutes: mins })}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="wiz-field">
                <span className="wiz-label">When can this meeting happen?</span>
                <SchedulingWindowStep
                  policy={draft.policy}
                  constraints={draft.constraints}
                  onPolicyChange={(policy) => patch({ policy })}
                  onConstraintsChange={(constraints) => patch({ constraints })}
                />
              </div>

              <div className="wiz-field">
                <span className="wiz-label">Timezone</span>
                <p className="wiz-help">Candidate times are worked out in this timezone.</p>
                <TimezonePicker
                  value={draft.timezone}
                  detected={draft.timezoneDetected}
                  onChange={(tz) =>
                    patch({
                      timezone: tz,
                      timezoneDetected: false,
                      constraints: { ...draft.constraints, timezone: tz },
                    })
                  }
                />
              </div>
            </section>
          )}

          {step === "People" && (
            <section className="wiz-step" aria-labelledby="wiz-h">
              <h1 id="wiz-h" className="wiz-title">Who actually needs to be there?</h1>
              <p className="wiz-help">
                WenMeet only waits on the people who matter. Optional attendees never block a time.
              </p>

              <div className="role-legend">
                {ROLE_OPTIONS.map(({ role, blurb }) => (
                  <div key={role} className="role-legend-item">
                    <span className={`role-symbol role-symbol-${role}`} aria-hidden>
                      {ROLE_SYMBOL[role]}
                    </span>
                    <div>
                      <strong>{ROLE_SYMBOL_LABEL[role]}</strong>
                      <span className="wiz-help">{blurb}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="invite-row invite-row-organizer">
                <div className="invite-main">
                  <strong>You</strong>
                  <span className="wiz-help">Organizer</span>
                </div>
                <span className="role-chip">
                  <span aria-hidden className="role-symbol role-symbol-required">{ROLE_SYMBOL.required}</span>
                  Required
                </span>
              </div>

              {draft.invites.map((invite) => (
                <div key={invite.key} className="invite-row">
                  <div className="invite-fields">
                    <input
                      className="wiz-input"
                      placeholder="Name (optional)"
                      value={invite.name}
                      onChange={(e) => updateInvite(invite.key, { name: e.target.value })}
                    />
                    <input
                      className="wiz-input"
                      type="email"
                      placeholder="name@company.com"
                      value={invite.email}
                      onChange={(e) => updateInvite(invite.key, { email: e.target.value })}
                    />
                  </div>
                  {/* Every role carries its word, not just a glyph: a bare
                      dot is unreadable without hunting for a legend. */}
                  <div className="invite-actions">
                    <div className="seg-group" role="radiogroup" aria-label={`Role for ${invite.email || "this person"}`}>
                      {ROLE_OPTIONS.map(({ role }) => (
                        <button
                          key={role}
                          type="button"
                          role="radio"
                          aria-checked={invite.role === role}
                          className={`seg seg-role${invite.role === role ? " seg-active" : ""}`}
                          onClick={() => updateInvite(invite.key, { role })}
                        >
                          <span aria-hidden className={`role-symbol role-symbol-${role}`}>
                            {ROLE_SYMBOL[role]}
                          </span>
                          {ROLE_SYMBOL_LABEL[role]}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="invite-remove"
                      onClick={() => removeInvite(invite.key)}
                      aria-label={`Remove ${invite.email || "participant"}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              <div className="invite-add">
                <button type="button" className="ws-btn ws-btn-sm invite-add-btn" onClick={addInvite}>
                  + Add someone
                </button>
                <input
                  className="wiz-input invite-paste"
                  placeholder="…or paste a list of emails"
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (/@/.test(text)) {
                      e.preventDefault();
                      bulkAdd(text);
                    }
                  }}
                  onChange={(e) => {
                    if (/@/.test(e.target.value) && /[\s,;]/.test(e.target.value)) {
                      bulkAdd(e.target.value);
                      e.target.value = "";
                    }
                  }}
                />
              </div>

              <p className="wiz-help wiz-note">
                Adding someone here reserves their role. WenMeet doesn&rsquo;t send email yet &mdash; you share
                the link yourself once the meeting exists.
              </p>
            </section>
          )}

          {step === "Availability" && (
            <section className="wiz-step" aria-labelledby="wiz-h">
              <h1 id="wiz-h" className="wiz-title">Where should WenMeet look?</h1>

              <div className="wiz-panel">
                <div className="wiz-panel-head">Your calendar</div>
                {connectedProviders.length === 0 ? (
                  <>
                    <p className="wiz-help">
                      Connect a calendar and WenMeet reads your free/busy automatically. You can also skip
                      this and enter availability by hand.
                    </p>
                    <div className="wiz-actions-row">
                      <a href="/api/auth/google/authorize" className="ws-btn ws-btn-sm wiz-connect">
                        Connect Google Calendar
                      </a>
                      <a href="/api/auth/microsoft/authorize" className="ws-btn ws-btn-sm wiz-connect">
                        Connect Microsoft 365
                      </a>
                    </div>
                  </>
                ) : (
                  <ul className="wiz-connected">
                    {connectedProviders.map((p) => (
                      <li key={p}>
                        <span className="wiz-connected-tick" aria-hidden>✓</span>
                        {p === "google" ? "Google Calendar" : "Microsoft 365"} connected
                        <span className="wiz-help"> — reading free/busy only</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="wiz-panel">
                <div className="wiz-panel-head">Dates</div>
                <p className="wiz-summary-line">{windowSummary.range}</p>
                <p className="wiz-help">{windowSummary.rules}</p>
                <p className="wiz-help">
                  {zone.city} · {zone.offsetLabel}. Everyone else sees these times in their own timezone.
                </p>
                <button type="button" className="wiz-inline-link" onClick={() => setStepIndex(0)}>
                  Change dates or timezone
                </button>
              </div>
            </section>
          )}

          {step === "Place" && (
            <section className="wiz-step" aria-labelledby="wiz-h">
              <h1 id="wiz-h" className="wiz-title">How will this meeting happen?</h1>

              <div className="place-grid" role="radiogroup" aria-label="Meeting type">
                {LOCATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.kind}
                    type="button"
                    role="radio"
                    aria-checked={draft.locationKind === opt.kind}
                    className={`place-option${draft.locationKind === opt.kind ? " place-option-active" : ""}`}
                    onClick={() => patch({ locationKind: opt.kind })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {draft.locationKind === "custom_link" && (
                <label className="wiz-field">
                  <span className="wiz-label">Meeting link</span>
                  <input
                    className="wiz-input"
                    value={draft.locationDetail}
                    onChange={(e) => patch({ locationDetail: e.target.value })}
                    placeholder="https://…"
                  />
                </label>
              )}

              {draft.locationKind === "in_person" && (
                <label className="wiz-field">
                  <span className="wiz-label">Where</span>
                  <input
                    className="wiz-input"
                    value={draft.locationDetail}
                    onChange={(e) => patch({ locationDetail: e.target.value })}
                    placeholder="Room, address, or venue"
                  />
                </label>
              )}

              {draft.locationKind === "phone" && (
                <label className="wiz-field">
                  <span className="wiz-label">Number (optional)</span>
                  <input
                    className="wiz-input"
                    value={draft.locationDetail}
                    onChange={(e) => patch({ locationDetail: e.target.value })}
                    placeholder="+1 555 0100"
                  />
                </label>
              )}

              {(draft.locationKind === "google_meet" || draft.locationKind === "teams") && (
                <p className="wiz-help wiz-note">
                  WenMeet records this as the meeting type. It doesn&rsquo;t create the link yet &mdash;
                  you&rsquo;ll still add it when you book.
                </p>
              )}

              <fieldset className="wiz-field">
                <legend className="wiz-label">When should people respond by?</legend>
                <div className="seg-group" role="radiogroup" aria-label="Response deadline">
                  {[
                    { key: "none", label: "No deadline" },
                    { key: "24h", label: "24 hours" },
                    { key: "48h", label: "48 hours" },
                    { key: "custom", label: "Pick a date" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      role="radio"
                      aria-checked={draft.deadlineChoice === opt.key}
                      className={`seg${draft.deadlineChoice === opt.key ? " seg-active" : ""}`}
                      onClick={() => patch({ deadlineChoice: opt.key })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {draft.deadlineChoice === "custom" && (
                  <input
                    type="date"
                    className="wiz-input"
                    style={{ marginTop: "0.6rem", maxWidth: 220 }}
                    value={draft.deadlineDate}
                    onChange={(e) => patch({ deadlineDate: e.target.value })}
                  />
                )}
              </fieldset>
            </section>
          )}

          {step === "Review" && (
            <section className="wiz-step" aria-labelledby="wiz-h">
              <h1 id="wiz-h" className="wiz-title">Ready to share it?</h1>

              <ReviewBlock label="Meeting" onEdit={() => setStepIndex(0)}>
                <strong>{draft.title || "Untitled"}</strong>
                <span>{draft.durationMinutes} min</span>
                <span>{windowSummary.range}</span>
                <span className="wiz-help">{windowSummary.rules}</span>
                <span>
                  {zone.city} · {zone.offsetLabel}
                </span>
              </ReviewBlock>

              <ReviewBlock label="People" onEdit={() => setStepIndex(1)}>
                <span>
                  <span aria-hidden className="role-symbol role-symbol-required">{ROLE_SYMBOL.required}</span>{" "}
                  {counts.required} required
                </span>
                {counts.decision > 0 && (
                  <span>
                    <span aria-hidden className="role-symbol role-symbol-kdm">{ROLE_SYMBOL.kdm}</span>{" "}
                    {counts.decision} decision
                  </span>
                )}
                {counts.optional > 0 && (
                  <span>
                    <span aria-hidden className="role-symbol role-symbol-optional">{ROLE_SYMBOL.optional}</span>{" "}
                    {counts.optional} optional
                  </span>
                )}
                {draft.invites.filter((i) => i.email.trim()).length === 0 && (
                  <span className="wiz-help">Just you — share the link to add people.</span>
                )}
              </ReviewBlock>

              <ReviewBlock label="Availability" onEdit={() => setStepIndex(2)}>
                <span>
                  {connectedProviders.length > 0
                    ? `${connectedProviders.length} calendar connected`
                    : "No calendar connected"}
                </span>
              </ReviewBlock>

              <ReviewBlock label="Meeting type" onEdit={() => setStepIndex(3)}>
                <span>{LOCATION_OPTIONS.find((o) => o.kind === draft.locationKind)?.label}</span>
                {draft.locationDetail.trim() && <span className="wiz-help">{draft.locationDetail.trim()}</span>}
                <span className="wiz-help">
                  {draft.deadlineChoice === "none" ? "No response deadline" : "Response deadline set"}
                </span>
              </ReviewBlock>
            </section>
          )}

          {errors.length > 0 && (
            <div className="wiz-errors" role="alert">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}

          <div className="wiz-nav">
            {stepIndex > 0 ? (
              <button type="button" className="ws-btn ws-btn-sm wiz-back" onClick={() => goTo(stepIndex - 1)}>
                Back
              </button>
            ) : (
              <Link href="/app" className="ws-btn ws-btn-sm wiz-back">
                Cancel
              </Link>
            )}

            {stepIndex < WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                className="ws-btn ws-btn-primary ws-btn-sm"
                onClick={() => goTo(stepIndex + 1)}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="ws-btn ws-btn-primary ws-btn-sm"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? "Creating…" : "Create WenMeet"}
              </button>
            )}
          </div>
        </div>

        <aside className="wiz-rail" aria-label="Meeting summary">
          <div className="wiz-rail-inner">
            <div className="ws-section-label">Your WenMeet</div>
            <p className="wiz-rail-title">{draft.title.trim() || "Untitled meeting"}</p>
            <p className="wiz-rail-line">{draft.durationMinutes} min</p>
            <p className="wiz-rail-line">{windowSummary.range}</p>
            <p className="wiz-rail-line">{windowSummary.rules}</p>
            <p className="wiz-rail-line">
              {zone.city} · {zone.offsetLabel}
            </p>
            <div className="wiz-rail-roles">
              <span>
                <span aria-hidden className="role-symbol role-symbol-required">{ROLE_SYMBOL.required}</span>{" "}
                {counts.required}
              </span>
              <span>
                <span aria-hidden className="role-symbol role-symbol-kdm">{ROLE_SYMBOL.kdm}</span>{" "}
                {counts.decision}
              </span>
              <span>
                <span aria-hidden className="role-symbol role-symbol-optional">{ROLE_SYMBOL.optional}</span>{" "}
                {counts.optional}
              </span>
            </div>
            <p className="wiz-rail-line">
              {LOCATION_OPTIONS.find((o) => o.kind === draft.locationKind)?.label}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stepper({ stepIndex, onGoTo }: { stepIndex: number; onGoTo: (i: number) => void }) {
  return (
    <>
      <ol className="stepper" aria-label="Progress">
        {WIZARD_STEPS.map((label, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
          return (
            <li key={label} className={`stepper-item stepper-${state}`}>
              <button
                type="button"
                className="stepper-btn"
                aria-current={state === "current" ? "step" : undefined}
                onClick={() => i < stepIndex && onGoTo(i)}
                disabled={i > stepIndex}
              >
                <span className="stepper-num" aria-hidden>
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span className="stepper-label">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="stepper-mobile" aria-hidden>
        Step {stepIndex + 1} of {WIZARD_STEPS.length} · <strong>{WIZARD_STEPS[stepIndex]}</strong>
      </p>
    </>
  );
}

function ReviewBlock({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="review-block">
      <div className="review-head">
        <span className="ws-section-label">{label}</span>
        <button type="button" className="wiz-inline-link" onClick={onEdit}>
          Edit
        </button>
      </div>
      <div className="review-body">{children}</div>
    </div>
  );
}
