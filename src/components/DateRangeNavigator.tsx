"use client";

import type { DateRangeNavigationViewModel } from "@/lib/copy/dateRangeNav";

export function DateRangeNavigator({
  vm,
  onPrevious,
  onNext,
}: {
  vm: DateRangeNavigationViewModel;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", margin: "0.75rem 0" }}>
      <button
        type="button"
        onClick={onPrevious}
        disabled={!vm.canGoPrevious}
        aria-label="Earlier dates"
        style={navButtonStyle(vm.canGoPrevious)}
      >
        &lsaquo;
      </button>
      <span style={{ fontWeight: 600, fontSize: "0.9rem", minWidth: 110, textAlign: "center" }}>{vm.label}</span>
      <button
        type="button"
        onClick={onNext}
        disabled={!vm.canGoNext}
        aria-label="Later dates"
        style={navButtonStyle(vm.canGoNext)}
      >
        &rsaquo;
      </button>
    </div>
  );
}

function navButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: enabled ? "var(--text)" : "var(--text-muted)",
    fontSize: "1.1rem",
    lineHeight: 1,
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.4,
  };
}
