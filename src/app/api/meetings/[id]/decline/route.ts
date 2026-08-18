import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { handlePostLockDecline } from "@/lib/scheduling/waiver";

/**
 * §12 (after lock): a Required attendee or KDM explicitly declines or
 * says they can't attend. Moves the meeting to needs_rescheduling and
 * relies on the caller's notification layer to alert the organizer.
 * This endpoint intentionally does not accept a `participantId` that
 * silently waives anyone — waiving remains its own explicit action via
 * /waive.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const meeting = await getStore().getMeeting(params.id);
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (meeting.status !== "locked") {
    return NextResponse.json(
      { error: "decline-after-lock only applies once the meeting is locked; before lock, resubmit availability instead" },
      { status: 409 },
    );
  }
  const updated = await handlePostLockDecline(getStore(), params.id);
  return NextResponse.json(updated);
}
