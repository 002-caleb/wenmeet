import type { NebulaStore } from "../store/NebulaStore";

/**
 * PRD §6: if a participant changes their timezone after submitting
 * availability, that availability moves to `needs_confirmation` for
 * every meeting they've submitted for. It does not count toward a new
 * scheduling run until they confirm (re-render is a display-layer
 * concern; storage stays UTC and is untouched by this step).
 */
export async function handleParticipantTimezoneChange(
  store: NebulaStore,
  participantId: string,
  newTimezone: string,
  meetingIdsWithSubmittedAvailability: string[],
) {
  await store.updateParticipantTimezone(participantId, newTimezone);

  for (const meetingId of meetingIdsWithSubmittedAvailability) {
    const existing = await store.getAvailability(meetingId, participantId);
    if (!existing) continue;
    if (existing.status === "confirmed" || existing.status === "submitted") {
      await store.upsertAvailability({
        meetingId: existing.meetingId,
        participantId: existing.participantId,
        // slots stay in UTC — unchanged. Only submittedTimezone (the
        // reference frame for display) is updated so the UI knows to
        // re-render existing slots converted into the new timezone.
        slots: existing.slots,
        status: "needs_confirmation",
        submittedTimezone: newTimezone,
      });
    }
  }
}

/**
 * Participant confirms the re-rendered grid as-is (or after editing it —
 * the caller is responsible for upserting edited slots before calling
 * this with the final slot list).
 */
export async function confirmAvailability(store: NebulaStore, meetingId: string, participantId: string) {
  const existing = await store.getAvailability(meetingId, participantId);
  if (!existing) throw new Error("No availability submission to confirm");
  return store.upsertAvailability({
    meetingId: existing.meetingId,
    participantId: existing.participantId,
    slots: existing.slots,
    status: "confirmed",
    submittedTimezone: existing.submittedTimezone,
  });
}
