import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json();
  const { title, organizerId, windowStartUtc, windowEndUtc, decisionDependent } = body as {
    title: string;
    organizerId: string;
    windowStartUtc: string;
    windowEndUtc: string;
    decisionDependent?: boolean;
  };
  if (!title || !organizerId || !windowStartUtc || !windowEndUtc) {
    return NextResponse.json(
      { error: "title, organizerId, windowStartUtc, windowEndUtc are required" },
      { status: 400 },
    );
  }
  const store = getStore();
  const meeting = await store.createMeeting({
    title,
    organizerId,
    windowStartUtc,
    windowEndUtc,
    decisionDependent: Boolean(decisionDependent),
    status: "collecting",
    proposedSlot: null,
    currentSnapshotId: null,
  });
  await store.assignRole({ participantId: organizerId, meetingId: meeting.id, role: "organizer" });
  return NextResponse.json(meeting, { status: 201 });
}
