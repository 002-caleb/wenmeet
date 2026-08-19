import type { NebulaStore } from "../store/NebulaStore";
import type { Meeting, MeetingStatus, ParticipantRole } from "../types";

/**
 * Dashboard contract (docs/WORKSPACE_V2.md §3-5, §29-30).
 *
 * Two canonical primitives drive the whole authenticated home:
 *   1. lifecycle  — where a meeting is in coordination
 *   2. attention  — whether it needs the host right now
 *
 * Section placement is a pure function of those two (see `placeSummary`),
 * so presentation components never re-derive scheduling semantics.
 */

/**
 * UI-facing lifecycle. Deliberately three states, not the spec's four:
 * the engine has no draft state — `POST /api/meetings` creates a meeting
 * directly into `collecting` — so a Draft step would be teaching a state
 * that cannot occur (§52: unsupported states are not fabricated). Add it
 * here only when the backend can actually produce it.
 */
export type MeetingLifecycle = "collecting" | "ready" | "booked";

/**
 * Only reasons the scheduling engine can actually produce today. The spec
 * also lists DEADLINE_APPROACHING, CALENDAR_CONNECTION_BROKEN and
 * HOST_CONFIRMATION_REQUIRED — none have backing logic yet (no
 * token-health check, no deadline detection), so surfacing them would be
 * inventing state. They belong here once the engine emits them.
 */
export type AttentionReason = "match_ready" | "no_valid_slot" | "needs_rescheduling";

export interface RoleCount {
  ready: number;
  total: number;
}

export interface RoleProgress {
  required: RoleCount;
  decision: RoleCount;
  optional: RoleCount;
}

export interface MeetingSummary {
  id: string;
  title: string;
  lifecycle: MeetingLifecycle;
  attentionRequired: boolean;
  attentionReason: AttentionReason | null;
  roleProgress: RoleProgress;
  /** Non-organizer participants on this meeting. 0 until an invite flow exists. */
  participantCount: number;
  responseCount: number;
  /** Proposed but not yet locked. */
  recommendedTimeUtc: string | null;
  /** Locked — the meeting is booked for this instant. */
  scheduledTimeUtc: string | null;
  windowStartUtc: string;
  windowEndUtc: string;
  href: string;
}

export interface WorkspaceView {
  attention: MeetingSummary[];
  active: MeetingSummary[];
  upcoming: MeetingSummary[];
  totalMeetings: number;
}

const LIFECYCLE_BY_STATUS: Record<MeetingStatus, MeetingLifecycle> = {
  collecting: "collecting",
  // Still gathering — the meeting simply can't resolve in its current
  // window, which is an attention state layered on top of collecting.
  no_valid_slot: "collecting",
  needs_rescheduling: "collecting",
  ready: "ready",
  locked: "booked",
};

const ATTENTION_BY_STATUS: Partial<Record<MeetingStatus, AttentionReason>> = {
  ready: "match_ready",
  no_valid_slot: "no_valid_slot",
  needs_rescheduling: "needs_rescheduling",
};

/**
 * §5: deterministic placement. A meeting appears in exactly one section.
 */
export function placeSummary(summary: MeetingSummary): "attention" | "active" | "upcoming" {
  if (summary.attentionRequired) return "attention";
  if (summary.lifecycle === "booked") return "upcoming";
  return "active";
}

async function computeRoleProgress(
  store: NebulaStore,
  meetingId: string,
): Promise<{ roleProgress: RoleProgress; participantCount: number; responseCount: number }> {
  const [roles, availability, waivers] = await Promise.all([
    store.getRolesForMeeting(meetingId),
    store.getAvailabilityForMeeting(meetingId),
    store.getWaiversForMeeting(meetingId),
  ]);

  const waivedIds = new Set(waivers.map((w) => w.participantId));
  const respondedIds = new Set(availability.map((a) => a.participantId));

  const countFor = (role: ParticipantRole["role"]): RoleCount => {
    const list = roles.filter((r) => r.role === role && !waivedIds.has(r.participantId));
    return { ready: list.filter((r) => respondedIds.has(r.participantId)).length, total: list.length };
  };

  const inviteeIds = new Set(roles.filter((r) => r.role !== "organizer").map((r) => r.participantId));

  return {
    roleProgress: {
      required: countFor("required"),
      decision: countFor("kdm"),
      optional: countFor("optional"),
    },
    participantCount: inviteeIds.size,
    responseCount: [...inviteeIds].filter((id) => respondedIds.has(id)).length,
  };
}

/**
 * The single place a Meeting becomes dashboard-shaped. Both the workspace
 * home and the meeting detail page consume this, so lifecycle and
 * attention can never disagree between the two surfaces (§52).
 *
 * Every field is read from the store — nothing is estimated. With no
 * invite flow built yet, `participantCount` is genuinely 0 on most
 * meetings; the UI is expected to say so rather than show an invented
 * response ratio.
 */
export async function buildMeetingSummary(store: NebulaStore, meeting: Meeting): Promise<MeetingSummary> {
  const { roleProgress, participantCount, responseCount } = await computeRoleProgress(store, meeting.id);
  const lifecycle = LIFECYCLE_BY_STATUS[meeting.status];
  const attentionReason = ATTENTION_BY_STATUS[meeting.status] ?? null;

  return {
    id: meeting.id,
    title: meeting.title,
    lifecycle,
    attentionRequired: attentionReason !== null,
    attentionReason,
    roleProgress,
    participantCount,
    responseCount,
    recommendedTimeUtc: lifecycle === "booked" ? null : meeting.proposedSlot?.startUtc ?? null,
    scheduledTimeUtc: lifecycle === "booked" ? meeting.proposedSlot?.startUtc ?? null : null,
    windowStartUtc: meeting.windowStartUtc,
    windowEndUtc: meeting.windowEndUtc,
    href: `/app/meetings/${meeting.id}`,
  };
}

export async function loadWorkspaceView(store: NebulaStore, organizerId: string): Promise<WorkspaceView> {
  const meetings = await store.getMeetingsByOrganizer(organizerId);
  const nowIso = new Date().toISOString();

  const summaries = await Promise.all(meetings.map((meeting) => buildMeetingSummary(store, meeting)));

  const view: WorkspaceView = { attention: [], active: [], upcoming: [], totalMeetings: meetings.length };

  for (const summary of summaries) {
    // A booked meeting that has already happened is history. There's no
    // past-meetings view yet, so it drops off rather than sitting in
    // Upcoming claiming to be in the future.
    if (summary.lifecycle === "booked" && (!summary.scheduledTimeUtc || summary.scheduledTimeUtc <= nowIso)) {
      continue;
    }
    view[placeSummary(summary)].push(summary);
  }

  view.upcoming.sort((a, b) => (a.scheduledTimeUtc! < b.scheduledTimeUtc! ? -1 : 1));

  return view;
}
