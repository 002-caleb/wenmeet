import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import type { TimeSlot } from "@/lib/types";

/**
 * Submits/updates a participant's availability for a meeting. Slots
 * must already be normalized to UTC by the caller (the painted-grid UI
 * is responsible for that conversion before this hits the API).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { participantId, slots, submittedTimezone } = body as {
    participantId: string;
    slots: TimeSlot[];
    submittedTimezone: string;
  };
  if (!participantId || !slots || !submittedTimezone) {
    return NextResponse.json(
      { error: "participantId, slots, submittedTimezone are required" },
      { status: 400 },
    );
  }
  const availability = await getStore().upsertAvailability({
    meetingId: params.id,
    participantId,
    slots,
    status: "submitted",
    submittedTimezone,
  });
  return NextResponse.json(availability, { status: 201 });
}
