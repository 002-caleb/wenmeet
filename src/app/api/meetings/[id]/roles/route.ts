import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import type { Role } from "@/lib/types";

/**
 * §4: participant_roles is many-to-many — a meeting can have zero, one,
 * or multiple KDMs, and a participant can hold more than one role.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { participantId, role } = body as { participantId: string; role: Role };
  if (!participantId || !role) {
    return NextResponse.json({ error: "participantId and role are required" }, { status: 400 });
  }
  await getStore().assignRole({ participantId, meetingId: params.id, role });
  const roles = await getStore().getRolesForMeeting(params.id);
  return NextResponse.json(roles, { status: 201 });
}
