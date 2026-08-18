import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { handleParticipantTimezoneChange } from "@/lib/timezone/tzCorrection";

/**
 * §6: changing timezone after submission moves prior submissions to
 * needs_confirmation across every meeting listed in `meetingIds`.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { timezone, meetingIds } = body as { timezone: string; meetingIds?: string[] };
  if (!timezone) {
    return NextResponse.json({ error: "timezone is required" }, { status: 400 });
  }
  await handleParticipantTimezoneChange(getStore(), params.id, timezone, meetingIds ?? []);
  const participant = await getStore().getParticipant(params.id);
  return NextResponse.json(participant);
}
