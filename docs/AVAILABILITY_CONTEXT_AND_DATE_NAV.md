# WenMeet Availability Context & Date Navigation

**Status:** P0 frontend requirement
**Applies to:** Organizer and participant availability flows
**Parent specification:** [WenMeet Frontend Product System PRD](./FRONTEND_PRODUCT_SYSTEM.md)

## 1. Problem

The availability grid is the core interaction, but a grid without sufficient context becomes ambiguous. The user must never have to remember which meeting this is, how long it is, which dates are shown, whose invitation they opened, what timezone the grid uses, whether calendar conflicts are included, or whether they can inspect another week.

The answer is contextual controls, not explanatory paragraphs.

## 2. Availability Screen Information Hierarchy

```
Navigation
Meeting context
Date navigation
Primary question / small instruction
Timezone + calendar context
Availability grid
Selection summary / primary action
```

## 3. Canonical Screen

```
← WenMeet

Strategy Call
30 min · Video call

Aug 18–22
‹ Previous     This week     Next ›

When can you meet?
Select every time that works.

[ Los Angeles · PDT ▾ ]     [ Calendar connected ✓ ]

             TUE 18   WED 19   THU 20   FRI 21
9 AM           ○        ○        ○        ○
10 AM          ○        ○        ○        ○
11 AM          ○        busy     ○        ○
12 PM          ○        ○        ○        ○
1 PM           ○        ○        ○       busy
2 PM           ○        ○        ○        ○

3 times selected                     Continue →
```

## 4. Meeting Context Header

Required: meeting title, duration, date/window. Optional when known: meeting type/location, organizer, participant count.

Avoid: "Meeting: demo", meeting IDs, "Scheduling request."

## 5. Organizer Identity

Organizer identity may be shown only when loaded from actual meeting data.

Allowed: `{meeting.organizer.displayName} invited you` when that is the actual organizer.

**Never** `"Aman invited you"` as fixture or fallback copy.

Fallback: "You've been invited to choose a time." or "The organizer invited you."

The interface must function without exposing any particular person's identity.

## 6. Date Headers Must Include Dates

Use `TUE 18`, not just `TUE`. The date number is required — a user should never need to infer which Tuesday is being displayed.

## 7. Date Range Navigation

Compact date navigator above the grid, e.g. `‹  Aug 18–22  ›`. The date controls must remain constrained by the organizer's allowed scheduling window. Participants may inspect another valid date range within it; they may not navigate outside the meeting's configured window unless the product explicitly offers "Suggest different dates."

## 8. Organizer Date Range Control

Default at meeting-creation time: `When? [ Next 5 workdays ▾ ]` with options (Today + tomorrow, Next 5 workdays, Next 7 days, Next 10 workdays, This week, Next week, Custom). Custom opens a date-range picker — do not show two raw date inputs unless Custom is selected.

## 9. Participant Date Navigation

Participants browse the organizer's configured window, they don't redefine it: `Aug 18–22 of Aug 18–29` with `‹ Earlier / Later ›`. If the window only has a few days, skip unnecessary navigation.

## 10. Meeting Duration Must Affect the Grid

The grid must visually respect meeting duration (30 min vs 60 min intervals) and the duration should always remain visible near the title.

## 11. Calendar Context

One small contextual control: `✓ Calendar connected` or `Connect calendar` as a secondary action (tooltip: "See conflicts automatically"). No large integration cards inside the availability task. Connecting a calendar must not be mandatory to respond.

## 12. Busy State

Busy cells need visible meaning, not just a hover tooltip — state vocabulary stays: Available, Selected, Busy, Unavailable. Never show private event names.

## 13. Current Day

Visually distinguish today (e.g. a small "Today" tag under the date) without over-styling it.

## 14. Past Time

Time slots already in the past must not be selectable.

## 15. Business Hours

Default grid focuses on reasonable daytime hours (e.g. 8 AM–6 PM), with a "Show earlier/later" control for cross-timezone meetings. Not a 24-hour grid by default.

## 16. Cross-Timezone Context

No global timezone converter. Optionally, one collapsed comparison timezone ("Compare with"). For most participants, a single "Los Angeles · PDT" pill is sufficient.

## 17. Day Availability Summary

Date headers may subtly show "3 selected" under each day — useful on mobile. No percentages.

## 18. Selection Feedback

Footer responds to interaction: "Select your times" (disabled Continue) → "3 times selected" (enabled) — or "Available on 3 days" if that maps better to the selection model.

## 19. Selection Shortcuts

"Select all free" / "Clear" as secondary utilities near the heading, never primary buttons.

## 20. Availability Quality Hint

If selection looks sparse, an optional subtle hint ("More options make it easier to find a match.") — never blocking, never a lecture.

## 21. Meeting Context Expansion

Collapsed header (title + duration + range) can expand to show location, participant count, and an optional description — the availability interaction stays dominant either way.

## 22. Description Handling

An organizer-entered description goes behind "Meeting details ▾", never as an automatic paragraph above the grid.

## 23. Participant Context

A participant may see "4 people" or a small avatar stack — not a full guest directory unless privacy rules permit it.

## 24. Role Context

Plain language, not internal terms: "Your attendance is required." / "You're a decision maker for this meeting." Never "Role: KDM" or "Hard constraint." Lives inside expandable meeting details unless immediately relevant.

## 25. Organizer Version

The organizer's availability screen should feel almost identical to the participant's — reuse the same core grid and context components rather than building two unrelated interfaces.

## 26. Component Architecture

```tsx
<MeetingContextHeader />
<DateRangeNavigator />
<TimezoneControl />
<CalendarStatus />
<AvailabilityToolbar />
<AvailabilityGrid />
<AvailabilitySelectionSummary />
<AvailabilityFooter />
```

## 27. Meeting Context View Model

```ts
type MeetingContextViewModel = {
  title: string;
  durationLabel: string;
  dateRangeLabel: string;
  meetingLocationLabel?: string;
  organizerLabel?: string;
  participantCountLabel?: string;
};
```

All presentation copy must already be resolved before it reaches the component.

## 28. Date Navigation View Model

```ts
type DateRangeNavigationViewModel = {
  visibleStart: Date;
  visibleEnd: Date;
  meetingStart: Date;
  meetingEnd: Date;
  canGoPrevious: boolean;
  canGoNext: boolean;
  label: string;
};
```

The UI must never allow navigation beyond the legal scheduling window.

## 29. Sticky Context

Desktop: meeting context may stay at top of the page. Mobile: a sticky compact header while scrolling ("Strategy Call · 30 min / Aug 18–22"), plus a sticky bottom Continue action, without consuming large vertical space.

## 30. Mobile Example

Single-day view with `‹ Tue 18 ›` navigation, vertical time list beneath, sticky selection footer. Swipe or tap moves between dates.

## 31. Desktop Example

Full week grid with date navigator above, timezone + calendar status row, "Select all free · Clear" shortcuts near the heading, selection summary + Continue in the sticky footer.

## 32. Context Priority Rule

```
1. What meeting?
2. What dates?
3. What timezone?
4. When can I meet?
5. What is already busy?
6. What have I selected?
7. Continue.
```

Anything not serving one of those questions is secondary.

## 33. No Context Overload

Adding context does not mean adding explanatory paragraphs. Replace architecture explanations with controls that demonstrate state: "Los Angeles · PDT", "Google Calendar ✓", "Aug 18–22", "30 min" — four compact signals communicate more than four paragraphs.

## 34. Completion Screen

"You're all set. Your availability is saved." Optional secondary: "Add WenMeet to your calendar." Primary: "Done." No hardcoded organizer name, no scheduling internals, no explanation of backend behavior.

## 35. Frontend Hard Rule

> Context should be visible. Complexity should not.

The user should always know what, when, where, whose meeting, what timezone, what to do next. They should never need to know how WenMeet stores it, normalizes it, which state machine transitioned, which provider API returned it, or which algorithm will consume it.

## 36. Acceptance Criteria

- Meeting title, duration, and actual date numbers are visible.
- Date-range navigation works and respects meeting bounds.
- Timezone is visible and editable; calendar connection state is visible when relevant.
- Busy cells are understandable; past slots cannot be selected.
- Selection count/summary updates instantly; Continue responds to selection.
- Meeting details are available without dominating the UI.
- Mobile has dedicated date navigation.
- No hardcoded internal identity, internal state names, UTC explanation, or private event titles render.
- Context remains understandable without explanatory prose.

## Canonical Rule

> A calendar grid tells you where to click. Context tells you why you're clicking.

WenMeet needs both. The final availability experience should feel complete without feeling complicated.
