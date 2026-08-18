import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";
import { exchangeGoogleCode } from "@/lib/calendar/googleOAuth";
import { getStore } from "@/lib/store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const calendarsUrl = new URL("/app/calendars", url.origin);

  if (oauthError) {
    calendarsUrl.searchParams.set("error", "google_declined");
    return NextResponse.redirect(calendarsUrl);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    calendarsUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(calendarsUrl);
  }

  const participant = await getOrCreateCurrentParticipant();
  if (!participant) {
    return NextResponse.redirect(new URL("/sign-in?next=/app/calendars", url.origin));
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;

  try {
    const tokens = await exchangeGoogleCode(code, redirectUri);
    await getStore().saveCalendarConnection({
      participantId: participant.id,
      provider: "google",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });
    calendarsUrl.searchParams.set("connected", "google");
  } catch {
    calendarsUrl.searchParams.set("error", "exchange_failed");
  }

  const res = NextResponse.redirect(calendarsUrl);
  res.cookies.delete("google_oauth_state");
  return res;
}
