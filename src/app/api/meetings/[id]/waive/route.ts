import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";
import { waiveParticipant } from "@/lib/scheduling/waiver";

/**
 * §12 / §35: organizer explicitly waives a Required/KDM participant from
 * this meeting only. Their global role on any other meeting is untouched.
 *
 * `waivedBy` is derived from the authenticated session, never trusted from
 * the request body — and the caller must be this meeting's organizer.
 * Neither check existed before this pass: any caller could waive any
 * participant on any meeting by guessing an id. Fixed here rather than
 * building organizer-only UI on top of an unauthenticated endpoint.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const organizer = await getOrCreateCurrentParticipant();
  if (!organizer) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const store = getStore();
  const meeting = await store.getMeeting(params.id);
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (meeting.organizerId !== organizer.id) {
    return NextResponse.json({ error: "Only this meeting's organizer can waive a participant." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const participantId = typeof body?.participantId === "string" ? body.participantId : "";
  const waivedReason = typeof body?.waivedReason === "string" ? body.waivedReason.trim() : "";
  if (!participantId || !waivedReason) {
    return NextResponse.json({ error: "participantId and waivedReason are required" }, { status: 400 });
  }

  await waiveParticipant(store, params.id, participantId, organizer.id, waivedReason);
  const waivers = await store.getWaiversForMeeting(params.id);
  return NextResponse.json(waivers, { status: 201 });
}
