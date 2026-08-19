"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const TOUR_STEPS = [
  { selector: "[data-tour='new']", title: "Start scheduling here", body: "Propose meeting windows and define who really needs to attend." },
  { selector: "[data-tour='pipeline']", title: "Track meeting progress", body: "Meetings flow from Collecting to Ready to Booked as availability arrives." },
  { selector: "[data-tour='attention']", title: "Your action inbox", body: "Ties, confirmations, and ready-to-book moments surface here." },
  { selector: "[data-tour='calendar']", title: "Manage connected accounts", body: "Add calendars or update your booking setup whenever you need." },
];

export function HelpCenter({ hasCalendar = false }: { hasCalendar?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tips, setTips] = useState(true);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("wenmeet:help-tips");
    const next = stored !== "off";
    setTips(next);
    document.documentElement.classList.toggle("help-tips-on", next);
  }, []);

  useEffect(() => {
    if (pathname === "/app" && new URLSearchParams(window.location.search).get("tour") === "1") {
      setTourStep(0);
      window.history.replaceState({}, "", "/app");
    }
  }, [pathname]);

  useEffect(() => {
    if (tourStep === null) return;
    const currentStep = TOUR_STEPS[tourStep];
    if (!currentStep) { setTourStep(null); return; }
    const target = document.querySelector(currentStep.selector);
    if (!target) { setTourStep(null); return; }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const update = () => setTargetRect(target.getBoundingClientRect());
    const timer = window.setTimeout(update, 280);
    update();
    window.addEventListener("resize", update);
    return () => { window.clearTimeout(timer); window.removeEventListener("resize", update); };
  }, [tourStep]);

  const contextTip = useMemo(() => {
    if (pathname?.includes("calendars")) return "Connect every calendar that can make you unavailable; choose one destination for new bookings.";
    if (pathname?.includes("new")) return "Start broad. WenMeet narrows the window once participant availability comes in.";
    if (pathname?.includes("meetings")) return "Use Needs attention as your inbox—everything else keeps moving without you.";
    return "A meeting becomes Ready when WenMeet has enough availability to recommend a time.";
  }, [pathname]);

  function toggleTips() {
    const next = !tips;
    setTips(next);
    localStorage.setItem("wenmeet:help-tips", next ? "on" : "off");
    document.documentElement.classList.toggle("help-tips-on", next);
  }

  function startTour() {
    setOpen(false);
    if (pathname !== "/app") window.location.href = "/app?tour=1";
    else setTourStep(0);
  }

  const checklist = [
    { done: hasCalendar, label: "Connect your primary calendar" },
    { done: false, label: "Create your first WenMeet" },
    { done: false, label: "Share an invite link" },
  ];
  const completedCount = checklist.filter((item) => item.done).length;

  return (
    <>
      <button type="button" className="help-fab" onClick={() => setOpen(true)} aria-expanded={open}>
        <span aria-hidden>?</span><span>Help & tips</span>
      </button>

      {open && <button type="button" className="help-scrim" aria-label="Close help" onClick={() => setOpen(false)} />}
      <aside className={`help-drawer${open ? " is-open" : ""}`} aria-hidden={!open} aria-label="WenMeet help and guides">
        <header className="help-drawer-head"><div><span className="help-eyebrow">WenMeet guide</span><h2>Help & resources</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close help">×</button></header>
        <div className="help-drawer-body">
          <label className="help-search"><span aria-hidden>⌕</span><input placeholder="Search help topics…" /></label>
          <section className="help-block"><div className="help-block-title"><span>Quick start</span><span>{completedCount} of 3</span></div><div className="help-progress"><span style={{ width: `${(completedCount / 3) * 100}%` }} /></div>{checklist.map((item) => <div className="help-check" key={item.label}><span className={item.done ? "is-done" : ""}>{item.done ? "✓" : ""}</span>{item.label}</div>)}</section>
          <section className="help-block"><div className="help-block-title"><span>Interactive tours</span></div><button type="button" className="help-link" onClick={startTour}>Replay dashboard walkthrough <span>→</span></button></section>
          <section className="help-context"><span>Tip for this page</span><p>{contextTip}</p></section>
          <label className="help-tip-toggle"><span><strong>Inline help tips</strong><small>Show gentle guidance in context</small></span><input type="checkbox" checked={tips} onChange={toggleTips} /><span className="onboarding-switch" aria-hidden /></label>
        </div>
        <footer className="help-drawer-foot"><Link href="/app">Read quick guide</Link></footer>
      </aside>

      {tourStep !== null && targetRect && (
        <div className="tour-layer" role="dialog" aria-modal="true" aria-label="Dashboard walkthrough">
          <div className="tour-highlight" style={{ left: targetRect.left - 8, top: targetRect.top - 8, width: targetRect.width + 16, height: targetRect.height + 16 }} />
          <div className="tour-popover">
            <span className="tour-count">{tourStep + 1} / {TOUR_STEPS.length}</span>
            <h3>{TOUR_STEPS[tourStep]?.title}</h3><p>{TOUR_STEPS[tourStep]?.body}</p>
            <div><button type="button" className="onboarding-text-button" onClick={() => setTourStep(null)}>Exit</button><button type="button" className="ws-btn ws-btn-primary ws-btn-sm" onClick={() => tourStep === TOUR_STEPS.length - 1 ? setTourStep(null) : setTourStep(tourStep + 1)}>{tourStep === TOUR_STEPS.length - 1 ? "Finish tour" : "Next"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
