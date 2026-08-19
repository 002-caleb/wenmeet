// Demo data for the landing page's resolver visualization — illustrative,
// not live user data (see docs/FRONTEND_PRODUCT_SYSTEM.md §17 on synthetic
// demo fixtures). Calibrated to what the real engine actually does: hard
// gating on Required + Decision, earliest-valid-slot resolution, no
// scoring system — see docs/LANDING_PAGE_DESIGN_PRD.md's implementation
// note at §9-11 for why this diverges from the literal spec's numeric
// score mockup.

export type RoleKind = "required" | "decision" | "optional";

export interface ResolverParticipant {
  name: string;
  role: RoleKind;
}

export interface ResolverCandidate {
  id: string;
  label: string;
}

export interface ResolverScenario {
  key: string;
  tabLabel: string;
  title: string;
  duration: string;
  location: string;
  participants: ResolverParticipant[];
  candidates: ResolverCandidate[];
  blockedCandidateId: string;
  blockedByName: string;
  winnerCandidateId: string;
  /** How many optional participants can actually make the winning time — illustrative, never blocks. */
  optionalReady: number;
  explanation: string;
}

export const ROLE_LABEL: Record<RoleKind, string> = {
  required: "Required",
  decision: "Decision",
  optional: "Optional",
};

export const ROLE_SYMBOL: Record<RoleKind, string> = {
  required: "●", // ●
  decision: "◆", // ◆
  optional: "○", // ○
};

export const RESOLVER_SCENARIOS: ResolverScenario[] = [
  {
    key: "board",
    tabLabel: "Board",
    title: "Board Strategy Call",
    duration: "30 min",
    location: "Google Meet",
    participants: [
      { name: "Aman", role: "required" },
      { name: "Cindy", role: "decision" },
      { name: "Brad", role: "required" },
      { name: "Maya", role: "optional" },
      { name: "Daniel", role: "optional" },
    ],
    candidates: [
      { id: "tue-9", label: "Tue · 9:00" },
      { id: "wed-10", label: "Wed · 10:00" },
      { id: "thu-10", label: "Thu · 10:00" },
      { id: "fri-11", label: "Fri · 11:00" },
    ],
    blockedCandidateId: "wed-10",
    blockedByName: "Cindy",
    winnerCandidateId: "thu-10",
    optionalReady: 1,
    explanation:
      "Thursday at 10 is the earliest time where every required attendee and decision maker is free.",
  },
  {
    key: "hiring",
    tabLabel: "Hiring",
    title: "Hiring Panel",
    duration: "45 min",
    location: "Microsoft Teams",
    participants: [
      { name: "Priya", role: "required" },
      { name: "Sam", role: "required" },
      { name: "Jordan", role: "decision" },
      { name: "Alex", role: "optional" },
      { name: "Ravi", role: "optional" },
    ],
    candidates: [
      { id: "mon-1", label: "Mon · 1:00" },
      { id: "tue-230", label: "Tue · 2:30" },
      { id: "wed-9", label: "Wed · 9:00" },
      { id: "thu-3", label: "Thu · 3:00" },
    ],
    blockedCandidateId: "mon-1",
    blockedByName: "Jordan",
    winnerCandidateId: "tue-230",
    optionalReady: 1,
    explanation:
      "Tuesday at 2:30 is the earliest time where both interviewers and the hiring manager are free.",
  },
  {
    key: "client",
    tabLabel: "Client",
    title: "Client Strategy Call",
    duration: "30 min",
    location: "Custom link",
    participants: [
      { name: "Morgan", role: "required" },
      { name: "Chris", role: "decision" },
      { name: "Elena", role: "optional" },
    ],
    candidates: [
      { id: "mon-11", label: "Mon · 11:00" },
      { id: "tue-1", label: "Tue · 1:00" },
      { id: "wed-4", label: "Wed · 4:00" },
      { id: "thu-10", label: "Thu · 10:00" },
    ],
    blockedCandidateId: "tue-1",
    blockedByName: "Morgan",
    winnerCandidateId: "wed-4",
    optionalReady: 1,
    explanation: "Wednesday at 4 is the earliest time where both Morgan and Chris are free.",
  },
];
