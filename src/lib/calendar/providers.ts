import type { CalendarProvider } from "./CalendarProvider";
import { getStore } from "../store";
import { queryGoogleFreeBusy, refreshGoogleAccessToken } from "./googleOAuth";
import { queryMicrosoftFreeBusy, refreshMicrosoftAccessToken } from "./microsoftOAuth";
import type { CalendarConnection, TimeSlot } from "../types";

/** Shared by both providers: load the connection, refresh if expired, return a usable access token. */
async function getFreshAccessToken(
  participantId: string,
  provider: CalendarConnection["provider"],
  refresh: (refreshToken: string) => Promise<{ accessToken: string; expiresAt: string }>,
): Promise<string> {
  const store = getStore();
  const connection = await store.getCalendarConnection(participantId, provider);
  if (!connection) {
    throw new Error(
      `No ${provider} calendar connection for this participant — connect one at /app/calendars.`,
    );
  }
  if (new Date(connection.expiresAt).getTime() <= Date.now()) {
    const refreshed = await refresh(connection.refreshToken);
    await store.saveCalendarConnection({
      ...connection,
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
    });
    return refreshed.accessToken;
  }
  return connection.accessToken;
}

/**
 * Backed by whatever the participant connected at /app/calendars
 * (src/app/api/auth/google/{authorize,callback}).
 */
class GoogleCalendarProvider implements CalendarProvider {
  readonly kind = "google" as const;

  async getBusyBlocks(participantId: string, rangeStartUtc: string, rangeEndUtc: string): Promise<TimeSlot[]> {
    const accessToken = await getFreshAccessToken(participantId, "google", refreshGoogleAccessToken);
    const busy = await queryGoogleFreeBusy(accessToken, rangeStartUtc, rangeEndUtc);
    return busy.map((b) => ({ startUtc: b.startUtc, endUtc: b.endUtc }));
  }
}

/**
 * Backed by whatever the participant connected at /app/calendars
 * (src/app/api/auth/microsoft/{authorize,callback}).
 */
class MicrosoftCalendarProvider implements CalendarProvider {
  readonly kind = "microsoft" as const;

  async getBusyBlocks(participantId: string, rangeStartUtc: string, rangeEndUtc: string): Promise<TimeSlot[]> {
    const accessToken = await getFreshAccessToken(participantId, "microsoft", refreshMicrosoftAccessToken);
    const busy = await queryMicrosoftFreeBusy(accessToken, rangeStartUtc, rangeEndUtc);
    return busy.map((b) => ({ startUtc: b.startUtc, endUtc: b.endUtc }));
  }
}

export const googleCalendarProvider: CalendarProvider = new GoogleCalendarProvider();
export const outlookCalendarProvider: CalendarProvider = new MicrosoftCalendarProvider();

export const calendarProviders: CalendarProvider[] = [googleCalendarProvider, outlookCalendarProvider];
