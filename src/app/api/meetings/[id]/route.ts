import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { computeReadiness } from "@/lib/scheduling/readiness";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const store = getStore();
  const meeting = await store.getMeeting(params.id);
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });

  const roles = await store.getRolesForMeeting(params.id);
  const availability = await store.getAvailabilityForMeeting(params.id);
  const waivers = await store.getWaiversForMeeting(params.id);
  const readiness = computeReadiness(roles, new Map(availability.map((a) => [a.participantId, a])), waivers);

  return NextResponse.json({ meeting, roles, availability, waivers, readiness });
}
