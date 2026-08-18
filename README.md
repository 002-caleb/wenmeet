# WenMeet

Find a time. Share one link. Get the meeting booked.

WenMeet helps groups coordinate meetings across people, calendars, roles, and timezones — without the usual back-and-forth.

The simple version:

```text
Create a meeting
      ↓
Choose when you're free
      ↓
Share one link
      ↓
Everyone adds availability
      ↓
WenMeet finds the overlap
      ↓
Book the meeting
```

The scheduling itself is deterministic. No AI is needed to decide whether people are available.

## Where we are

WenMeet already has the core scheduling logic behind the product. It understands:

- required attendees,
- decision makers,
- optional attendees,
- availability,
- timezone changes,
- meeting conflicts,
- rescheduling,
- participant waivers,
- and the 24-hour meeting lock.

The core logic is covered by automated tests. The next major work is connecting that foundation to real calendars and finishing the customer experience.

## What works today

### Meeting roles

A meeting can have different kinds of participants:

- **Required** — the meeting cannot be scheduled without them.
- **Decision maker** — the meeting cannot be scheduled without them.
- **Optional** — WenMeet tries to include them, but they do not block the meeting.

One person can hold more than one role.

### Scheduling

WenMeet can determine whether a valid meeting time exists. It does not guess. If everyone who must attend cannot meet during the available window, WenMeet returns:

> No time works for everyone yet.

The organizer can then widen the dates or ask people for new availability.

### Timezones

Availability is handled consistently across timezones. If someone's timezone changes after they have already submitted their times, WenMeet asks them to confirm their availability again. The user experience should simply say:

> Still good?

The complicated timezone handling stays behind the screen.

### Changes while scheduling

People can change their availability before the meeting is locked. WenMeet checks that the information it used is still current before accepting a final result. If important availability changed, it recalculates. The user doesn't need to manage this.

### 24-hour lock

Meetings lock 24 hours before they begin. Before then, availability can continue changing. The lock is based on time, not on how many times WenMeet has recalculated the meeting.

### Rescheduling

If someone who is required can no longer attend after the meeting is locked, the meeting moves into:

> Needs rescheduling

WenMeet does not silently remove them. The organizer can find another time, cancel, or explicitly continue without that person.

### Continuing without someone

An organizer can waive someone from one specific meeting. That decision is recorded. It does not change that person's role in future meetings.

## What is being built next

Three pieces matter most now.

### 1. The real product experience

The scheduling engine exists. Now the frontend needs to make it feel simple. The main experience is:

```text
Create
  → Choose times
  → Share
  → Respond
  → Book
```

Important screens include:

- Create a WenMeet
- Availability grid
- Share link
- Participant response
- Organizer meeting room
- Best-time selection
- Booking confirmation

The product should feel simple even though the system underneath is not.

### 2. Google Calendar

WenMeet needs to know when someone is busy without requiring them to manually recreate their calendar. Google Calendar integration will provide:

- sign-in/authorization,
- free/busy information,
- live calendar changes,
- calendar event creation,
- Google Meet creation.

### 3. Microsoft Outlook

Microsoft receives the same priority as Google. WenMeet will support:

- Outlook / Microsoft 365 calendars,
- free/busy information,
- live calendar changes,
- event creation,
- Microsoft Teams meetings.

A Google user and a Microsoft user should be able to schedule together without thinking about the difference.

### Live availability

This is an important part of V1. Availability should not become stale just because someone submitted it yesterday. WenMeet's view of someone's availability eventually combines:

```text
their calendar
  + times they selected
  + times they blocked
  + other WenMeet commitments
  = when they can actually meet
```

If another meeting fills a previously free time, WenMeet should know.

## How WenMeet chooses a time

The core scheduling engine does not use an LLM. It uses rules.

First, WenMeet eliminates times that cannot work:

```text
Required person unavailable   → time cannot be used
Decision maker unavailable    → time cannot be used
```

Then it ranks the remaining valid times. Things like optional attendees and preferred hours can make one valid time better than another.

This means the scheduling result is predictable, testable, inexpensive, fast, and explainable. Same information in. Same answer out.

## Technology

WenMeet is a Next.js application designed to run primarily on Netlify. The product is intentionally being kept operationally small.

Main pieces:

```text
Next.js + TypeScript
Netlify
PostgreSQL
Google Calendar
Microsoft Outlook
Google Meet
Microsoft Teams
```

The scheduling logic is kept separate from Google, Microsoft, Netlify, and the database. That matters — WenMeet should be able to change infrastructure later without rewriting the heart of the product.

## Current code structure

For developers:

```text
src/lib/scheduling/   Core scheduling rules
src/lib/calendar/     Google and Microsoft calendar connections
src/lib/store/        Persistent data access
src/lib/timezone/     Timezone handling
src/app/              WenMeet web application
tests/                Automated tests
db/                   Database schema
```

You do not need to understand these folders to understand the product.

## Running locally

```bash
npm install
npm test
npm run dev
```

Then open:

```text
http://localhost:3000
```

## What is real vs. unfinished

**Working**

- meeting roles
- required/decision-maker rules
- deterministic overlap calculation
- no-overlap detection
- timezone correction
- scheduling revalidation
- 24-hour locking rules
- rescheduling logic
- per-meeting waivers
- automated tests

**Still being completed**

- polished customer-facing UI
- Google OAuth
- live Google Calendar availability
- Google Meet creation
- Microsoft OAuth
- live Outlook availability
- Microsoft Teams creation
- production database configuration
- live calendar change notifications

Nothing unfinished should be disguised as finished.

## Product decisions still open

These are not required to make the core scheduling product useful.

- **Decision-maker proxies** — should a decision maker be able to nominate another person to act for them? Possible later feature.
- **Live meeting voting** — useful for the broader meeting-intelligence vision, but not necessary for the scheduling wedge.
- **Shared team calendar** — potential future view for organizations using WenMeet frequently.

The first priority remains making the basic scheduling experience excellent.

## Product rule

WenMeet can be complicated underneath. It should never feel complicated to use.

The customer should experience:

```text
When can you meet?
        ↓
Send this link.
        ↓
Everyone's ready.
        ↓
Thursday at 10 works.
        ↓
Booked.
```

Everything else exists to make those five moments reliable.
