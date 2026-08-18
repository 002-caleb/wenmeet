"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TileGrid, type TileOption } from "@/components/TileGrid";

const DURATIONS: TileOption<number>[] = [
  { value: 15, label: "15 min", badge: "Quick" },
  { value: 30, label: "30 min", badge: "Popular" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

const WINDOWS: TileOption<number>[] = [
  { value: 5, label: "Next 5 days" },
  { value: 7, label: "Next 7 days" },
  { value: 10, label: "Next 10 days" },
  { value: 14, label: "Next 2 weeks" },
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
    <div style={{ maxWidth: 460 }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 1.5rem" }}>Create a WenMeet</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.4rem" }}>
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

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>How long?</span>
          <TileGrid options={DURATIONS} value={duration} onChange={setDuration} columns={4} />
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>When?</span>
          <TileGrid options={WINDOWS} value={windowDays} onChange={setWindowDays} columns={2} />
        </div>

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
