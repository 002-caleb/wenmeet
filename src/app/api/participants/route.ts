import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, timezone } = body as { name: string; email: string; timezone: string };
  if (!name || !email || !timezone) {
    return NextResponse.json({ error: "name, email, timezone are required" }, { status: 400 });
  }
  const participant = await getStore().createParticipant({ name, email, timezone });
  return NextResponse.json(participant, { status: 201 });
}
