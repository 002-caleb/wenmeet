import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";

export async function POST(req: Request) {
  // organizerId is derived from the signed-in Clerk session, never trusted
  // from the request body — a client-supplied organizerId would let anyone
  // create a meeting as anyone else.
  const organizer = await getOrCreateCurrentParticipant();
  if (!organizer) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await req.json();
  const { title, windowStartUtc, windowEndUtc, decisionDependent } = body as {
    title: string;
    windowStartUtc: string;
    windowEndUtc: string;
    decisionDependent?: boolean;
  };
  if (!title || !windowStartUtc || !windowEndUtc) {
    return NextResponse.json(
      { error: "title, windowStartUtc, windowEndUtc are required" },
      { status: 400 },
    );
  }

  const store = getStore();
  const meeting = await store.createMeeting({
    title,
    organizerId: organizer.id,
    windowStartUtc,
    windowEndUtc,
    decisionDependent: Boolean(decisionDependent),
    status: "collecting",
    proposedSlot: null,
    currentSnapshotId: null,
  });
  await store.assignRole({ participantId: organizer.id, meetingId: meeting.id, role: "organizer" });
  return NextResponse.json(meeting, { status: 201 });
}
