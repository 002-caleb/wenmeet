// Mirrors src/lib/calendar/googleOAuth.ts — same shape, against Microsoft's
// v2.0 endpoint (the "common" tenant, since the app registration allows
// both work/school and personal Microsoft accounts) and Graph's
// getSchedule instead of Google's freeBusy.query.

const AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const SCOPES = ["offline_access", "Calendars.Read", "User.Read"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see .env.example`);
  return value;
}

export function buildMicrosoftAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("MICROSOFT_OAUTH_CLIENT_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: SCOPES.join(" "),
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface MicrosoftTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO-8601 UTC
}

export async function exchangeMicrosoftCode(code: string, redirectUri: string): Promise<MicrosoftTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("MICROSOFT_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("MICROSOFT_OAUTH_CLIENT_SECRET"),
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: SCOPES.join(" "),
    }),
  });
  if (!res.ok) {
    throw new Error(`Microsoft token exchange failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  if (!body.refresh_token) {
    throw new Error(
      "Microsoft did not return a refresh_token — check that offline_access was granted consent.",
    );
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: new Date(Date.now() + body.expires_in * 1000).toISOString(),
  };
}

export async function refreshMicrosoftAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("MICROSOFT_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("MICROSOFT_OAUTH_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: SCOPES.join(" "),
    }),
  });
  if (!res.ok) {
    throw new Error(`Microsoft token refresh failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: body.access_token,
    expiresAt: new Date(Date.now() + body.expires_in * 1000).toISOString(),
  };
}

export async function fetchMicrosoftAccountEmail(accessToken: string): Promise<string> {
  const meRes = await fetch(`${GRAPH_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!meRes.ok) {
    throw new Error(`Microsoft Graph /me failed: ${meRes.status} ${await meRes.text()}`);
  }
  const me = (await meRes.json()) as { mail?: string; userPrincipalName: string };
  return me.mail ?? me.userPrincipalName;
}

export async function queryMicrosoftFreeBusy(
  accessToken: string,
  timeMinUtc: string,
  timeMaxUtc: string,
): Promise<{ startUtc: string; endUtc: string }[]> {
  const selfAddress = await fetchMicrosoftAccountEmail(accessToken);

  const res = await fetch(`${GRAPH_BASE}/me/calendar/getSchedule`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      schedules: [selfAddress],
      startTime: { dateTime: timeMinUtc, timeZone: "UTC" },
      endTime: { dateTime: timeMaxUtc, timeZone: "UTC" },
      availabilityViewInterval: 60,
    }),
  });
  if (!res.ok) {
    throw new Error(`Microsoft getSchedule failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as {
    value: { scheduleItems?: { status: string; start: { dateTime: string }; end: { dateTime: string } }[] }[];
  };
  const items = body.value[0]?.scheduleItems ?? [];
  // We asked for timeZone: "UTC" on both bounds, so these come back as
  // UTC-referenced local time without an offset suffix — normalize to
  // a real ISO-8601 UTC instant so downstream TimeSlot handling is uniform.
  const asUtc = (dateTime: string) => (dateTime.endsWith("Z") ? dateTime : `${dateTime}Z`);
  return items
    .filter((i) => i.status !== "free")
    .map((i) => ({ startUtc: asUtc(i.start.dateTime), endUtc: asUtc(i.end.dateTime) }));
}
