import { getStore } from "../store";
import { googleCalendarProvider, outlookCalendarProvider } from "./providers";
import type { CalendarConnection, TimeSlot } from "../types";

export type CalendarProviderKind = CalendarConnection["provider"];

export interface SourcedBusyBlock extends TimeSlot {
  provider: CalendarProviderKind;
}

const PROVIDER_MAP: Record<CalendarProviderKind, { getBusyBlocks: (id: string, s: string, e: string) => Promise<TimeSlot[]> }> = {
  google: googleCalendarProvider,
  microsoft: outlookCalendarProvider,
};

/** Which calendars this participant actually has connected — a person may have 0, 1, or both. */
export async function getConnectedProviders(participantId: string): Promise<CalendarProviderKind[]> {
  const store = getStore();
  const [google, microsoft] = await Promise.all([
    store.getCalendarConnection(participantId, "google"),
    store.getCalendarConnection(participantId, "microsoft"),
  ]);
  const connected: CalendarProviderKind[] = [];
  if (google) connected.push("google");
  if (microsoft) connected.push("microsoft");
  return connected;
}

/**
 * Merges busy blocks across every calendar this participant has connected,
 * each tagged with which one it came from — so the UI can show *why* a
 * slot is busy, not just that it is.
 */
export async function getBusyBlocksBySource(
  participantId: string,
  rangeStartUtc: string,
  rangeEndUtc: string,
): Promise<SourcedBusyBlock[]> {
  const connected = await getConnectedProviders(participantId);
  const results = await Promise.all(
    connected.map(async (provider) => {
      try {
        const slots = await PROVIDER_MAP[provider].getBusyBlocks(participantId, rangeStartUtc, rangeEndUtc);
        return slots.map((s) => ({ ...s, provider }));
      } catch {
        // A single provider failing (expired/revoked token, API hiccup)
        // shouldn't take down the whole grid — just show less busy data.
        return [];
      }
    }),
  );
  return results.flat();
}
