import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { runSchedulingSnapshot, revalidateBeforeLock } from "@/lib/scheduling/snapshot";
import { isPastLockCutoff } from "@/lib/scheduling/lock";

/**
 * Triggers (or re-validates) a scheduling run for a meeting, and applies
 * the T-24h auto-lock (§7, CEO directive — time-based, not attempt-based).
 * Optional query param `now` (ISO string) lets the test/demo client
 * simulate time without waiting for the real clock.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const now = url.searchParams.get("now") ?? new Date().toISOString();

  const store = getStore();
  let meeting = await store.getMeeting(params.id);
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (meeting.status === "locked" || meeting.status === "needs_rescheduling") {
    return NextResponse.json({ meeting, note: "meeting is not open for scheduling runs" });
  }

  let revalidation: Awaited<ReturnType<typeof revalidateBeforeLock>> | null = null;
  if (!meeting.currentSnapshotId) {
    await runSchedulingSnapshot(store, params.id);
  } else {
    revalidation = await revalidateBeforeLock(store, params.id);
  }

  meeting = await store.getMeeting(params.id);
  if (meeting?.proposedSlot && isPastLockCutoff(meeting.proposedSlot.startUtc, now)) {
    meeting = await store.updateMeeting(params.id, { status: "locked" });
  }

  return NextResponse.json({ meeting, revalidation });
}
