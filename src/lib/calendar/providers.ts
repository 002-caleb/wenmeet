import { NotImplementedCalendarProvider, type CalendarProvider } from "./CalendarProvider";

// Both Google Meet and Outlook are P0 for launch (PRD §20, CEO directive) —
// the two providers are wired to the same interface so neither is
// privileged. Both are stubs pending real OAuth apps + credentials.
export const googleCalendarProvider: CalendarProvider = new NotImplementedCalendarProvider("google");
export const outlookCalendarProvider: CalendarProvider = new NotImplementedCalendarProvider("microsoft");

export const calendarProviders: CalendarProvider[] = [googleCalendarProvider, outlookCalendarProvider];
