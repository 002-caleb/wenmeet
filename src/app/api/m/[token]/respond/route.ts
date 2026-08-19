import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { isValidShareTokenShape } from "@/lib/shareToken";
import type { Role, TimeSlot } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["required", "kdm", "optional"];
const MAX_SLOTS = 500;

/**
 * Participant response via a shared link. Deliberately unauthenticated —
 * "participants don't need an account" is the product's core promise — so
 * the share token is the only credential and everything else is treated as
 * hostile input.
 *
 * Guards:
 *  - the token must resolve to a real meeting, or this 404s
 *  - the caller may never choose `organizer`; that role is assigned only
 *    from the authenticated create path
 *  - slots are re-validated and capped rather than trusted
 *  - a locked meeting stops accepting responses
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!isValidShareTokenShape(params.token)) {
    return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
  }

  const store = getStore();
  const meeting = await store.getMeetingByShareToken(params.token);
  if (!meeting) {
    return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
  }
  if (meeting.status === "locked") {
    return NextResponse.json(
      { error: "This meeting is already booked, so it's no longer collecting availability." },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Couldn't read that response." }, { status: 400 });

  const { name, email, timezone, slots, role } = body as {
    name?: string;
    email?: string;
    timezone?: string;
    slots?: TimeSlot[];
    role?: Role;
  };

  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!cleanName || !cleanEmail || !cleanEmail.includes("@")) {
    return NextResponse.json({ error: "Add your name and a valid email." }, { status: 400 });
  }
  if (!timezone || typeof timezone !== "string") {
    return NextResponse.json({ error: "Missing timezone." }, { status: 400 });
  }
  if (!Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: "Pick at least one time that works." }, { status: 400 });
  }
  if (slots.length > MAX_SLOTS) {
    return NextResponse.json({ error: "That's more times than we can accept at once." }, { status: 400 });
  }

  const windowStart = meeting.windowStartUtc;
  const windowEnd = meeting.windowEndUtc;
  const cleanSlots: TimeSlot[] = [];
  for (const slot of slots) {
    const start = typeof slot?.startUtc === "string" ? slot.startUtc : null;
    const end = typeof slot?.endUtc === "string" ? slot.endUtc : null;
    if (!start || !end || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
      return NextResponse.json({ error: "One of those times didn't look right." }, { status: 400 });
    }
    if (start >= end) {
      return NextResponse.json({ error: "One of those times ends before it starts." }, { status: 400 });
    }
    // Keep responses inside the organizer's window — otherwise a crafted
    // request could inject availability the organizer never offered.
    if (start < windowStart || end > windowEnd) {
      return NextResponse.json({ error: "One of those times is outside this meeting's dates." }, { status: 400 });
    }
    cleanSlots.push({ startUtc: start, endUtc: end });
  }

  // Returning participants keep their identity; new ones are created. Email
  // is the natural key here since there's no account.
  let participant = await store.getParticipantByEmail(cleanEmail);
  if (!participant) {
    participant = await store.createParticipant({ name: cleanName, email: cleanEmail, timezone });
  }

  // The organizer role is never self-assignable through a public link.
  const requestedRole: Role = role && ALLOWED_ROLES.includes(role) ? role : "required";
  await store.assignRole({ participantId: participant.id, meetingId: meeting.id, role: requestedRole });

  const availability = await store.upsertAvailability({
    meetingId: meeting.id,
    participantId: participant.id,
    slots: cleanSlots,
    status: "submitted",
    submittedTimezone: timezone,
  });

  return NextResponse.json({ ok: true, availabilityId: availability.id }, { status: 201 });
}
