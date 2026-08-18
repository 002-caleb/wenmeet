// Thin wrapper around Google's OAuth 2.0 + Calendar v3 freebusy endpoints.
// Deliberately not a generic Google SDK dependency — this is the whole
// surface CalendarProvider needs, kept in one place so the OAuth routes
// and the provider implementation share exactly one source of truth.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see .env.example`);
  return value;
}

export function buildGoogleAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline", // required to get a refresh_token
    prompt: "consent", // forces refresh_token on repeat connects too
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO-8601 UTC
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  if (!body.refresh_token) {
    // Happens if the user has connected before and Google didn't re-issue
    // one — access_type=offline + prompt=consent above should prevent this,
    // but fail loudly rather than silently storing an unrefreshable token.
    throw new Error("Google did not return a refresh_token. Revoke WenMeet's access at myaccount.google.com and reconnect.");
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: new Date(Date.now() + body.expires_in * 1000).toISOString(),
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: body.access_token,
    expiresAt: new Date(Date.now() + body.expires_in * 1000).toISOString(),
  };
}

export async function queryGoogleFreeBusy(
  accessToken: string,
  timeMinUtc: string,
  timeMaxUtc: string,
): Promise<{ startUtc: string; endUtc: string }[]> {
  const res = await fetch(FREEBUSY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: timeMinUtc, timeMax: timeMaxUtc, items: [{ id: "primary" }] }),
  });
  if (!res.ok) {
    throw new Error(`Google freebusy query failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as {
    calendars: Record<string, { busy: { start: string; end: string }[] }>;
  };
  return (body.calendars.primary?.busy ?? []).map((b) => ({ startUtc: b.start, endUtc: b.end }));
}
