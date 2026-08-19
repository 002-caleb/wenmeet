"use client";

import { useRef, type PointerEvent } from "react";
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
  const pointerStart = useRef<number | null>(null);

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(distance) < 42) return;
    if (distance < 0 && vm.canGoNext) onNext();
    if (distance > 0 && vm.canGoPrevious) onPrevious();
  }

  return (
    <div
      className="date-range-navigator"
      onPointerDown={(event) => { pointerStart.current = event.clientX; }}
      onPointerUp={finishSwipe}
      onPointerCancel={() => { pointerStart.current = null; }}
    >
      <button
        type="button"
        onClick={onPrevious}
        disabled={!vm.canGoPrevious}
        aria-label="Earlier dates"
        className="date-range-button"
      >
        &lsaquo;
      </button>
      <span className="date-range-label" aria-live="polite">{vm.label}</span>
      <button
        type="button"
        onClick={onNext}
        disabled={!vm.canGoNext}
        aria-label="Later dates"
        className="date-range-button"
      >
        &rsaquo;
      </button>
    </div>
  );
}
