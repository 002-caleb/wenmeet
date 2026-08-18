# WenMeet Authenticated App Shell & Routing PRD

**Status:** P0
**Applies to:** Authenticated routing, navigation, session handling, post-login behavior
**Goal:** Signed-in users enter the product, not the marketing site.

## 1. Hard Rule

> Marketing is for acquisition. The app is for work.

Once a user is authenticated, WenMeet must not send them back to the marketing homepage during normal product use. Authenticated users should land in an application shell centered on their meetings, meetings awaiting their response, upcoming meetings, creating a WenMeet, calendar connections, and settings.

## 2. Canonical Route Separation

```
Public marketing:      /  /how-it-works  /for-teams  /pricing
Authenticated app:      /app  /app/meetings  /app/meetings/:id  /app/new  /app/calendars  /app/settings
Shared participant:     /m/:shareToken  /m/:shareToken/availability
```

Public pages and application pages should use separate layouts.

## 3. Root Route Behavior

`/` must be session-aware. Logged out → render marketing homepage. Logged in → immediately redirect `/ → /app`. Do not render the marketing hero and simply replace "Sign in" with an avatar.

## 4. Post-Authentication Redirect

Authentication must preserve user intent: started at `/app/new` → back to `/app/new` after auth; started from `/m/7KQ4P` → back to `/m/7KQ4P`; no prior destination → `/app`. Never default to `/`.

## 5. Authenticated Home

`/app` is not another landing page — it is the user's operating surface: "Good morning", what needs attention, upcoming, your WenMeets, with a persistent `+ New WenMeet` CTA.

## 6. Empty Authenticated Home

A new user sees: "Schedule something. Choose your times, share one link, and let WenMeet find the overlap." + "Create your first WenMeet →" + secondary "Connect a calendar." No marketing navigation, no giant hero, no Product Hunt copy.

## 7. App Navigation

Authenticated desktop: `WenMeet · Meetings · Calendars · + New WenMeet · Profile`. Never show `Product / How it works / For teams` inside the app shell — those belong to marketing.

## 8. Logo Behavior

Public site: WenMeet logo → `/`. Authenticated app: WenMeet logo → `/app`. Hard rule — clicking the logo while working must not eject a user into marketing.

## 9. Create CTA Behavior

Logged out: "Create a WenMeet" → auth or guest creation flow. Logged in: "Create a WenMeet" → `/app/new`. Never send an authenticated user through the landing-page conversion flow again.

## 10. Session-Aware Middleware

Implement routing at the platform/router layer, not sprinkled across components:

```ts
if (pathname === "/" && session) redirect("/app");
if (pathname.startsWith("/app") && !session) redirect(`/login?next=${encodeURIComponent(pathname)}`);
// after successful auth: redirect(validatedNext ?? "/app")
```

Validate `next` to prevent open redirects.

## 11. Separate Layout Trees

Marketing and application navigation should not share a giant conditional component — use separate shells/layouts for the marketing tree and the `/app` tree.

## 12. Marketing Shell

Contains: Product, How it works, For teams, Sign in, Create a WenMeet. Purpose: acquisition.

## 13. Application Shell

Contains: Meetings, Calendars, New WenMeet, profile/settings. Purpose: execution. The visual transition should be noticeable — marketing can be expressive, the app should be quieter, denser, faster, and task-oriented.

## 14. Authenticated State Must Be Obvious

"Marketing nav + avatar" is insufficient. The user should immediately feel "I am inside my workspace" via an app-oriented header and meaningful content state.

## 15. Meeting Inbox

The signed-in home functions partly like an inbox, prioritizing meetings requiring action, in order: `NEEDS YOU → READY TO BOOK → WAITING → UPCOMING → RECENT`.

## 16. Suggested `/app` Example

Good morning / Needs you (with per-meeting actions) / Upcoming / Waiting — see canonical example in the source PRD thread.

## 17. Participant vs Organizer Home

A person can simultaneously be organizer of one WenMeet, participant in another, decision maker in another. `/app` aggregates responsibilities rather than splitting into separate organizer/participant accounts.

## 18. Share Links Remain Direct

Authentication must not break the core viral flow. Opening `/m/abc123` reaches the meeting immediately — never redirect authenticated recipients to `/app` before letting them respond. Priority: explicit deep link > generic authenticated redirect.

## 19. Marketing Escape Hatch

Authenticated users may still intentionally access public content (profile menu link to the homepage, or typing `/how-it-works` directly) — normal navigation must just never route them there accidentally.

## 20. Back Navigation

Inside application routes, back navigation stays contextual (e.g. "← Meetings"), never "← WenMeet" if that would return to public marketing.

## 21. Authenticated Landing Copy Is Forbidden

Do not render the marketing hero ("Stop asking / 'What time works for everyone?'") as the primary screen after login. The user already bought the premise — now help them schedule. Equivalent to Gmail showing its marketing homepage after every sign-in.

## 22. Internal Identity Leakage Still Applies

Public demos use synthetic names only (see `docs/FRONTEND_PRODUCT_SYSTEM.md` §17). Authenticated app views may display real names only from actual meeting/session data. Never hardcode internal team identities in either layout.

## 23. Route Intent Priority

```
1. Explicit shared meeting URL
2. Explicit `next` destination
3. Required onboarding step
4. Authenticated app home
5. Marketing homepage
```

## 24. First Login

Never-used-WenMeet users land at `/app` with lightweight in-app onboarding (e.g. "Connect your calendar" with a Skip option), not a trip back through marketing education.

## 25. Returning User

`/app` immediately shows actionable meeting state — no onboarding, no hero, no product explanation.

## 26. Performance

Session routing should occur server-side/middleware-side wherever possible. Avoid render-marketing-then-client-redirect flashes; resolve the session and render the correct route in one pass.

## 27. Acceptance Criteria

- Authenticated `/` redirects to `/app`.
- Login defaults to `/app`; `next` is preserved through auth.
- Shared links preserve meeting intent.
- App logo routes to `/app`; marketing logo routes to `/`.
- App shell has no Product / How it works / For teams nav, and has New WenMeet.
- `/app` contains actionable meetings; new users see an app empty state, not marketing.
- No client-side marketing flash before redirect.
- No internal fixture identities render anywhere.
- Logout returns to an appropriate public/auth route.

## Canonical Rule

> Before login, explain WenMeet. After login, get out of the way.

Marketing earns the click. The application earns continued use.
