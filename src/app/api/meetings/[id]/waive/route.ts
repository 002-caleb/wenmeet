import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { waiveParticipant } from "@/lib/scheduling/waiver";

/**
 * §12: organizer explicitly waives a Required/KDM participant from this
 * meeting only. Their global role on any other meeting is untouched.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { participantId, waivedBy, waivedReason } = body as {
    participantId: string;
    waivedBy: string;
    waivedReason: string;
  };
  if (!participantId || !waivedBy || !waivedReason) {
    return NextResponse.json(
      { error: "participantId, waivedBy, waivedReason are required" },
      { status: 400 },
    );
  }
  await waiveParticipant(getStore(), params.id, participantId, waivedBy, waivedReason);
  const waivers = await getStore().getWaiversForMeeting(params.id);
  return NextResponse.json(waivers, { status: 201 });
}
