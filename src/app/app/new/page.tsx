"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DURATIONS = [15, 30, 45, 60];
const WINDOWS = [
  { label: "Next 5 days", days: 5 },
  { label: "Next 7 days", days: 7 },
  { label: "Next 10 days", days: 10 },
  { label: "Next 2 weeks", days: 14 },
];

export default function NewMeetingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [windowDays, setWindowDays] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);

    const windowStartUtc = new Date().toISOString();
    const windowEndUtc = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000).toISOString();

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), windowStartUtc, windowEndUtc, decisionDependent: false }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't create that meeting.");
      }
      router.push("/app/meetings");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 440 }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 1.5rem" }}>Create a WenMeet</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.1rem" }}>
        <label style={{ display: "grid", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>
          What are we meeting about?
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Strategy call"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>
          How long?
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={inputStyle}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>
          When?
          <select value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} style={inputStyle}>
            {WINDOWS.map((w) => (
              <option key={w.days} value={w.days}>{w.label}</option>
            ))}
          </select>
        </label>

        {error && <p style={{ color: "var(--blocked-fg)", fontSize: "0.85rem", margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="pill-button pill-button-primary"
          style={{ justifySelf: "start", opacity: submitting || !title.trim() ? 0.6 : 1 }}
        >
          {submitting ? "Creating…" : "Create WenMeet"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.6rem 0.8rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "0.95rem",
  fontWeight: 400,
};
