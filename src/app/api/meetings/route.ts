import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";
import { generateShareToken } from "@/lib/shareToken";
import type { MeetingLocation, MeetingLocationKind, Role } from "@/lib/types";
import {
  DEFAULT_ACTIVE_WEEKDAYS,
  resolveWindow,
  validatePolicy,
  windowBoundsUtc,
  type SchedulingConstraints,
  type SchedulingPolicy,
} from "@/lib/scheduling/policy";

const LOCATION_KINDS: MeetingLocationKind[] = [
  "google_meet",
  "teams",
  "custom_link",
  "phone",
  "in_person",
  "undecided",
];

/** Roles the organizer may hand out. "organizer" is assigned by us, never chosen. */
const ASSIGNABLE_ROLES: Role[] = ["required", "kdm", "optional"];

interface InvitePayload {
  name?: string;
  email?: string;
  role?: Role;
}

export async function POST(req: Request) {
  // organizerId is derived from the signed-in Clerk session, never trusted
  // from the request body — a client-supplied organizerId would let anyone
  // create a meeting as anyone else.
  const organizer = await getOrCreateCurrentParticipant();
  if (!organizer) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Couldn't read that request." }, { status: 400 });

  const {
    title,
    durationMinutes,
    schedulingPolicy,
    schedulingConstraints,
    timezone,
    location,
    responseDeadlineUtc,
    invites,
    decisionDependent,
  } = body as {
    title?: string;
    durationMinutes?: number;
    schedulingPolicy?: SchedulingPolicy;
    schedulingConstraints?: Partial<SchedulingConstraints>;
    timezone?: string;
    location?: MeetingLocation;
    responseDeadlineUtc?: string | null;
    invites?: InvitePayload[];
    decisionDependent?: boolean;
  };

  const cleanTitle = typeof title === "string" ? title.trim() : "";
  if (!cleanTitle) {
    return NextResponse.json({ error: "Give the meeting a name." }, { status: 400 });
  }
  if (!schedulingPolicy || typeof schedulingPolicy !== "object") {
    return NextResponse.json({ error: "Pick when WenMeet should look." }, { status: 400 });
  }

  // The policy is re-validated and re-resolved server-side. The client's
  // resolved window is never trusted — it is derived data, and accepting it
  // would let a crafted request widen the search space past its own rules.
  const constraints: SchedulingConstraints = {
    timezone: timezone || schedulingConstraints?.timezone || "UTC",
    activeWeekdays: Array.isArray(schedulingConstraints?.activeWeekdays)
      ? schedulingConstraints!.activeWeekdays!.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      : DEFAULT_ACTIVE_WEEKDAYS,
    blackoutRanges: Array.isArray(schedulingConstraints?.blackoutRanges)
      ? schedulingConstraints!.blackoutRanges!.slice(0, 100)
      : [],
    minimumNoticeMinutes: Math.max(0, Math.min(Number(schedulingConstraints?.minimumNoticeMinutes) || 0, 60 * 24 * 14)),
  };

  const policyErrors = validatePolicy(schedulingPolicy, constraints);
  if (policyErrors.length > 0) {
    return NextResponse.json({ error: policyErrors[0] }, { status: 400 });
  }

  const resolved = resolveWindow(schedulingPolicy, constraints);
  const bounds = windowBoundsUtc(resolved, constraints.timezone);
  if (!bounds) {
    return NextResponse.json({ error: "No scheduling days remain in that window." }, { status: 400 });
  }

  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration < 5 || duration > 8 * 60) {
    return NextResponse.json({ error: "That meeting length isn't supported." }, { status: 400 });
  }

  let cleanLocation: MeetingLocation | null = null;
  if (location && typeof location === "object") {
    if (!LOCATION_KINDS.includes(location.kind)) {
      return NextResponse.json({ error: "That isn't a meeting type we support." }, { status: 400 });
    }
    const detail = typeof location.detail === "string" ? location.detail.trim() : "";
    if (location.kind === "custom_link") {
      // A bad link is worse than no link — participants would just hit a dead end.
      let parsed: URL | null = null;
      try {
        parsed = new URL(detail);
      } catch {
        parsed = null;
      }
      if (!parsed || !["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json({ error: "Add a full meeting link starting with https://" }, { status: 400 });
      }
    }
    cleanLocation = { kind: location.kind, detail: detail || null };
  }

  let deadline: string | null = null;
  if (responseDeadlineUtc) {
    if (Number.isNaN(Date.parse(responseDeadlineUtc))) {
      return NextResponse.json({ error: "That response deadline isn't a real date." }, { status: 400 });
    }
    deadline = responseDeadlineUtc;
  }

  const store = getStore();

  // The organizer's timezone is what candidate times are expressed in, so a
  // change here is a real profile update, not just wizard state.
  if (timezone && typeof timezone === "string" && timezone !== organizer.timezone) {
    await store.updateParticipantTimezone(organizer.id, timezone);
  }

  const meeting = await store.createMeeting({
    title: cleanTitle,
    organizerId: organizer.id,
    shareToken: generateShareToken(),
    durationMinutes: duration,
    schedulingPolicy,
    schedulingConstraints: constraints,
    windowStartUtc: bounds.windowStartUtc,
    windowEndUtc: bounds.windowEndUtc,
    location: cleanLocation,
    responseDeadlineUtc: deadline,
    decisionDependent: Boolean(decisionDependent),
    status: "collecting",
    proposedSlot: null,
    currentSnapshotId: null,
  });

  await store.assignRole({ participantId: organizer.id, meetingId: meeting.id, role: "organizer" });

  // Invitees named up front become real participants with real roles. They
  // still respond through the share link — WenMeet does not send email yet,
  // so adding someone here does not notify them.
  const invited: string[] = [];
  for (const invite of Array.isArray(invites) ? invites : []) {
    const email = typeof invite?.email === "string" ? invite.email.trim().toLowerCase() : "";
    const name = typeof invite?.name === "string" ? invite.name.trim() : "";
    if (!email || !email.includes("@")) continue;

    const role: Role = invite.role && ASSIGNABLE_ROLES.includes(invite.role) ? invite.role : "required";
    const existing = await store.getParticipantByEmail(email);
    const participant =
      existing ??
      (await store.createParticipant({ name: name || email.split("@")[0]!, email, timezone: timezone ?? "UTC" }));

    await store.assignRole({ participantId: participant.id, meetingId: meeting.id, role });
    invited.push(participant.id);
  }

  return NextResponse.json({ ...meeting, invitedCount: invited.length }, { status: 201 });
}
