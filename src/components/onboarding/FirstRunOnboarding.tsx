"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "wenmeet:onboarding:v1";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function FirstRunOnboarding({
  enabled,
  timezoneLabel,
  hasCalendar,
}: {
  enabled: boolean;
  timezoneLabel: string;
  hasCalendar: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [workingDays, setWorkingDays] = useState(() => new Set(DAYS.slice(0, 5)));
  const [buffer, setBuffer] = useState(true);

  useEffect(() => {
    setOpen(enabled && localStorage.getItem(STORAGE_KEY) !== "complete");
  }, [enabled]);

  function close() {
    localStorage.setItem(STORAGE_KEY, "complete");
    setOpen(false);
  }

  function savePreferences() {
    localStorage.setItem("wenmeet:working-days", JSON.stringify(Array.from(workingDays)));
    localStorage.setItem("wenmeet:meeting-buffer", buffer ? "15" : "0");
    setStep(2);
  }

  if (!open) return null;

  return (
    <div className="onboarding-backdrop" role="presentation">
      <section className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-topline">
          <span className="onboarding-kicker">A quick setup</span>
          <button type="button" className="onboarding-close" onClick={close} aria-label="Close setup">×</button>
        </div>

        <div className="onboarding-progress" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((index) => <span key={index} className={index <= step ? "is-active" : ""} />)}
        </div>

        {step === 0 && (
          <div className="onboarding-body">
            <span className="onboarding-icon" aria-hidden>◷</span>
            <h2 id="onboarding-title">Never double-book again</h2>
            <p>Confirm where you are, then let WenMeet quietly work around what is already on your calendar.</p>
            <button type="button" className="onboarding-timezone">
              <span>Timezone</span><strong>{timezoneLabel}</strong><span aria-hidden>⌄</span>
            </button>
            <div className="onboarding-provider-grid">
              <a href="/api/auth/google/authorize" className="onboarding-provider"><span className="provider-g">G</span> Google Calendar</a>
              <a href="/api/auth/microsoft/authorize" className="onboarding-provider"><span className="provider-ms">⊞</span> Microsoft 365</a>
            </div>
            {hasCalendar && <p className="onboarding-connected">✓ Your primary calendar is connected</p>}
            <div className="onboarding-actions">
              <button type="button" className="ws-btn ws-btn-primary" onClick={() => setStep(1)}>{hasCalendar ? "Continue" : "Connect & continue"}</button>
              <button type="button" className="onboarding-text-button" onClick={() => setStep(1)}>Skip for now</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-body">
            <span className="onboarding-icon onboarding-icon-lilac" aria-hidden>☼</span>
            <h2 id="onboarding-title">Define your standard window</h2>
            <p>Start with your usual rhythm. You can always make a WenMeet more flexible later.</p>
            <div className="onboarding-day-grid">
              {DAYS.map((day) => (
                <button
                  type="button"
                  key={day}
                  aria-pressed={workingDays.has(day)}
                  onClick={() => setWorkingDays((current) => {
                    const next = new Set(current);
                    if (next.has(day)) next.delete(day); else next.add(day);
                    return next;
                  })}
                >{day}</button>
              ))}
            </div>
            <div className="onboarding-hours"><span>Working hours</span><strong>9:00 AM</strong><span aria-hidden>→</span><strong>5:00 PM</strong></div>
            <label className="onboarding-toggle-row">
              <span><strong>Breathing room</strong><small>15 minutes between meetings</small></span>
              <input type="checkbox" checked={buffer} onChange={(event) => setBuffer(event.target.checked)} />
              <span className="onboarding-switch" aria-hidden />
            </label>
            <div className="onboarding-actions">
              <button type="button" className="ws-btn ws-btn-primary" onClick={savePreferences}>Save preferences</button>
              <button type="button" className="onboarding-text-button" onClick={() => setStep(0)}>Back</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-body">
            <span className="onboarding-icon onboarding-icon-green" aria-hidden>↗</span>
            <h2 id="onboarding-title">Meetings, without the chase</h2>
            <p>WenMeet keeps the process moving and brings you back in only when a decision is ready.</p>
            <ol className="onboarding-lifecycle">
              <li><span>1</span><div><strong>Collecting</strong><small>Propose a window and invite the right people.</small></div></li>
              <li><span>2</span><div><strong>Ready</strong><small>Consensus appears automatically as replies arrive.</small></div></li>
              <li><span>3</span><div><strong>Booked</strong><small>Confirm once and everyone gets the final time.</small></div></li>
            </ol>
            <div className="onboarding-actions">
              <Link href="/app/new" className="ws-btn ws-btn-primary" onClick={close}>Create your first WenMeet</Link>
              <button type="button" className="onboarding-text-button" onClick={close}>Explore dashboard</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
