"use client";

export interface TileOption<T extends string | number> {
  value: T;
  label: string;
  badge?: string;
}

/**
 * Interactive selection tiles instead of a native <select> — no hidden
 * dropdown list, just a grid of tactile, glanceable cards with an active
 * state and a spring-like press response.
 */
export function TileGrid<T extends string | number>({
  options,
  value,
  onChange,
  columns = 4,
}: {
  options: TileOption<T>[];
  value: T;
  onChange: (next: T) => void;
  columns?: number;
}) {
  return (
    <div className="tile-grid" style={{ ["--tile-cols" as string]: columns }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`tile${active ? " tile-active" : ""}`}
          >
            {opt.badge && <span className="tile-badge">{opt.badge}</span>}
            <span className="tile-label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
