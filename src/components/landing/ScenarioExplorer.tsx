"use client";

import { useState } from "react";
import { RESOLVER_SCENARIOS } from "@/lib/landing/resolverScenarios";
import { MeetingResolver } from "./MeetingResolver";

/**
 * Use-case system (docs/LANDING_PAGE_DESIGN_PRD.md §19) — switching
 * scenarios re-uses the same resolver component rather than a new
 * component per use case, demonstrating breadth without adding page
 * length or a static use-case pill cloud.
 */
export function ScenarioExplorer() {
  const [activeKey, setActiveKey] = useState(RESOLVER_SCENARIOS[1]?.key ?? RESOLVER_SCENARIOS[0]!.key);
  const active = RESOLVER_SCENARIOS.find((s) => s.key === activeKey) ?? RESOLVER_SCENARIOS[0]!;

  return (
    <div>
      <div className="scenario-tabs" role="tablist" aria-label="Meeting type">
        {RESOLVER_SCENARIOS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={s.key === activeKey}
            className={`scenario-tab${s.key === activeKey ? " scenario-tab-active" : ""}`}
            onClick={() => setActiveKey(s.key)}
          >
            {s.tabLabel}
          </button>
        ))}
      </div>
      <div style={{ marginTop: "1.1rem" }}>
        <MeetingResolver scenario={active} />
      </div>
    </div>
  );
}
