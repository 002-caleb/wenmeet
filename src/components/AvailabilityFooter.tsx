"use client";

export function AvailabilityFooter({
  selectedCount,
  onContinue,
}: {
  selectedCount: number;
  onContinue: () => void;
}) {
  return (
    <div style={styles.bar}>
      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
        {selectedCount === 0 ? "Select your times" : `${selectedCount} time${selectedCount === 1 ? "" : "s"} selected`}
      </span>
      <button
        type="button"
        className="pill-button pill-button-primary"
        disabled={selectedCount === 0}
        style={selectedCount === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        onClick={onContinue}
      >
        Continue &rarr;
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: "sticky",
    bottom: "1rem",
    marginTop: "1.5rem",
    padding: "1rem 1.25rem",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
};
