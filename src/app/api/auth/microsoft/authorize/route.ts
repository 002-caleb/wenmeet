import { NextResponse } from "next/server";
import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";
import { buildMicrosoftAuthorizeUrl } from "@/lib/calendar/microsoftOAuth";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const participant = await getOrCreateCurrentParticipant();
  if (!participant) {
    return NextResponse.redirect(new URL("/sign-in?next=/app/calendars", url.origin));
  }

  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/api/auth/microsoft/callback`;

  const res = NextResponse.redirect(buildMicrosoftAuthorizeUrl(redirectUri, state));
  res.cookies.set("microsoft_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
