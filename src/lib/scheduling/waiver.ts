import type { NebulaStore } from "../store/NebulaStore";

/**
 * PRD §12: continuing without a Required/KDM participant is an explicit
 * data state, not a UI override. Waiving only affects this meeting —
 * the participant's global role is untouched.
 */
export async function waiveParticipant(
  store: NebulaStore,
  meetingId: string,
  participantId: string,
  waivedBy: string,
  waivedReason: string,
) {
  await store.waiveParticipant({
    meetingId,
    participantId,
    waivedBy,
    waivedAt: new Date().toISOString(),
    waivedReason,
  });
}

/**
 * PRD §12 (after lock): if a Required attendee or KDM explicitly
 * declines or says they can't attend, the meeting moves to
 * `needs_rescheduling` and the organizer is notified. This function
 * does not itself waive anyone — waiving remains a separate, explicit
 * organizer action.
 */
export async function handlePostLockDecline(store: NebulaStore, meetingId: string) {
  const meeting = await store.updateMeeting(meetingId, { status: "needs_rescheduling" });
  return meeting;
}
