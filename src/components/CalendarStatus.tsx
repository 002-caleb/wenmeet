"use client";

export function CalendarStatus({ connected, onConnect }: { connected: boolean; onConnect?: () => void }) {
  if (connected) {
    return <span className="badge badge-ready">Calendar connected &#10003;</span>;
  }
  return (
    <button
      type="button"
      onClick={onConnect}
      title="See conflicts automatically"
      className="badge badge-locked"
      style={{ border: "none", cursor: "pointer" }}
    >
      Connect calendar
    </button>
  );
}
