import { NotImplementedCalendarProvider, type CalendarProvider } from "./CalendarProvider";
import { getStore } from "../store";
import { queryGoogleFreeBusy, refreshGoogleAccessToken } from "./googleOAuth";
import type { TimeSlot } from "../types";

/**
 * Real implementation, backed by whatever the participant connected at
 * /app/calendars (src/app/api/auth/google/{authorize,callback}). Refreshes
 * the access token transparently when it's expired.
 */
class GoogleCalendarProvider implements CalendarProvider {
  readonly kind = "google" as const;

  async getBusyBlocks(
    participantId: string,
    rangeStartUtc: string,
    rangeEndUtc: string,
  ): Promise<TimeSlot[]> {
    const store = getStore();
    const connection = await store.getCalendarConnection(participantId, "google");
    if (!connection) {
      throw new Error(
        "No Google Calendar connection for this participant — connect one at /app/calendars.",
      );
    }

    let accessToken = connection.accessToken;
    if (new Date(connection.expiresAt).getTime() <= Date.now()) {
      const refreshed = await refreshGoogleAccessToken(connection.refreshToken);
      accessToken = refreshed.accessToken;
      await store.saveCalendarConnection({ ...connection, accessToken, expiresAt: refreshed.expiresAt });
    }

    const busy = await queryGoogleFreeBusy(accessToken, rangeStartUtc, rangeEndUtc);
    return busy.map((b) => ({ startUtc: b.startUtc, endUtc: b.endUtc }));
  }
}

// Microsoft is still a stub — same priority as Google (README), not yet built.
export const googleCalendarProvider: CalendarProvider = new GoogleCalendarProvider();
export const outlookCalendarProvider: CalendarProvider = new NotImplementedCalendarProvider("microsoft");

export const calendarProviders: CalendarProvider[] = [googleCalendarProvider, outlookCalendarProvider];
