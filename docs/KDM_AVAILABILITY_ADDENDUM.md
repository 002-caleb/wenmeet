# WenMeet Availability Intelligence and KDM Decision Flow — PRD Addendum

**Implementation note (this pass):** This is a 44-section, system-scale
spec — per `.forgeos/FORGE.md`'s complexity router, too large to
implement in full in one slice. What shipped in this pass, and what was
deliberately deferred, is recorded in `.forgeos/graph.md` under the
`kdm-visibility` domain entry rather than silently claimed complete here.
In short: the readiness ring, roster, waiver UI, precise status
language, and wizard KDM copy are real and shipped. The organizer
multi-participant overlap grid (§33–34) does not exist yet — there is no
organizer-facing availability grid of any kind today, participant or
otherwise, to extend. That is a separate, larger FEATURE-level slice.

---

## 26. KDM Product Principle

A Key Decision Maker is not merely another required attendee.

A KDM is someone whose attendance or approval determines whether the
meeting can proceed. WenMeet must make this dependency visible throughout
meeting creation, availability collection, recommendation, booking, and
rescheduling.

The organizer should always be able to answer:

- Who are the KDMs?
- Have all KDMs responded?
- Can every KDM attend the recommended time?
- Is a KDM blocking readiness?
- Has a KDM's availability become stale?
- Did the organizer explicitly waive a KDM?
- Can the meeting safely proceed?

## 27. Multiple KDMs

A meeting may have zero, one, or multiple KDMs. The data model must
remain many-to-many:

```ts
interface ParticipantRole {
  participantId: string;
  meetingId: string;
  role: "organizer" | "required" | "kdm" | "optional";
}
```

A participant may hold more than one role when necessary. KDM must never
be modeled as a single `meeting.kdmId` field. The UI may optimize for one
KDM, but every workflow must correctly support multiple KDMs.

## 28. Readiness Progress Circle

Persistent readiness indicator on the organizer meeting-detail page, near
the lifecycle state, above the availability matrix.

Default presentation: a circular progress indicator showing gating
participants who have submitted confirmed availability (`5 / 6`),
labeled "Required responses", with a breakdown line below ("2 KDMs · 3
required · 1 waiting").

**Denominator** includes Required + KDM participants (counted once if
both), excludes Optional, Waived, and the organizer unless the organizer
explicitly submits as a gating attendee.

**Numerator** includes only gating participants whose availability is
`confirmed`, or `submitted` if timezone confirmation isn't required.
Excludes missing responses, `needs_confirmation`, and waived participants.

**Visual segmentation:** confirmed KDM (violet), confirmed required
(WenMeet blue), waiting (neutral gray), needs confirmation (amber),
waived (removed from the ring, not shown as complete), blocking problem
(red marker). Color is never the only signal — labels, icons, tooltips,
and accessible text always accompany it.

## 29. Progress Circle Interaction

Supports hover, keyboard focus, click, and touch tap. Hovering/focusing
shows a concise summary (KDMs: 2 of 2 ready · Required: 3 of 4 ready ·
Optional: 1 of 3 responded). Selecting it opens the full readiness
roster, grouped by Key decision makers / Required attendees / Optional
attendees, each row showing name, role(s), response state, slot count,
last response time, submitted timezone, whether they block readiness,
and whether they were waived. Selecting a participant highlights their
persisted availability in the main grid (deferred — no such grid exists
yet; see implementation note).

## 30. Dashboard Progress Circle

Compact version on meeting rows and attention cards. States: Collecting
(`4/6`, "Waiting on 1 KDM"), Ready (`6/6`, "All decision-makers
available"), Blocked (`5/6`, "KDM has no matching time"), Booked
(replaces the ring with "✓ Booked" — never a misleading 100% ring after
booking).

## 31. KDM Assignment Flow

Role selection during creation (Required / Key decision maker /
Optional), with copy: "Key decision maker — This meeting cannot become
Ready unless this person responds and can attend, unless you explicitly
waive them." Multiple KDMs supported. Review step summarizes: "This
WenMeet has 2 key decision makers. Both must respond before WenMeet can
recommend a final time." If no KDM is assigned, no warning by default —
KDM is an optional scheduling concept, not a universal requirement.

## 32. Complete KDM Lifecycle

Nine stages: Assigned → Waiting → Submitted → Timezone Confirmation
(preserve UTC slots, never silently reinterpret; status becomes
`needs_confirmation`) → Consensus Evaluation → Ready (every non-waived
KDM and Required attendee confirmed, a full-duration slot satisfies hard
constraints) → Booking (revalidate availability versions immediately
before booking; discard and recalculate if stale) → KDM Declines/Becomes
Unavailable (pre-lock: invalidate and recalculate; post-lock: state
becomes `needs_rescheduling`, never silently continue) → Rescheduling
(recalculate against current confirmed availability, never an
unversioned copy).

## 33. KDM Availability Visualization

Organizer overlap grid must visually distinguish full-KDM-availability
cells (violet marker, "All KDMs" in the accessible label), partial (count
shown), and none (never presented as a strong recommendation regardless
of optional-participant availability). **Deferred — no organizer overlap
grid exists yet.**

## 34. KDM Filtering

Scope filters (Everyone / KDMs / Required / Optional) above the
availability grid. **Deferred — depends on §33.**

## 35. Explicit Waiver State

"Continue without this participant" creates a durable meeting-level
waiver (`Waiver { meetingId, participantId, waivedBy, waivedAt,
waivedReason }`) that never mutates the participant's permanent role. A
waived KDM remains visibly labeled "KDM · Waived for this meeting".
Requires explicit confirmation and a waiver reason; organizer-only action.

## 36. Concurrent and Last-Second Responses

Versioned availability snapshots: capture every gating participant's
version at recommendation time, recalculate if any Required/KDM version
changed before lock, inform the organizer what changed. Optional-participant
changes update counts but never invalidate an otherwise-valid
required/KDM recommendation.

## 37. Freshness and Rescheduling

No automatic expiry in V1, but response freshness is always displayed
("Updated today" / "Updated 3 days ago" / "Needs confirmation"). Bulk
"Ask everyone to reconfirm" is a **future release** item — V1 preserves
version/update metadata so it can be added without a schema migration.

## 38. Participant Privacy

Organizer sees full participant-level availability. Non-organizer
participants get an aggregated view by default ("Three people are
available at this time"), never individual identities, calendar
conflicts, emails, waiver reasons, or KDM decision metadata — unless the
organizer explicitly enables participant visibility in a future release.
**Not yet applicable — no participant-facing overlap view exists to
aggregate from.**

## 39. KDM Notifications and Attention States

`Needs attention` surfaces KDM-specific states in priority order:
post-lock KDM decline → stale recommendation from KDM change → no valid
KDM overlap → KDM timezone confirmation needed → KDM response missing.
Optional-participant issues never outrank a KDM blocker.

## 40. KDM Status Language

Precise, never vague. "Waiting on 1 KDM" / "All KDMs responded" / "All
key decision makers can attend" / "KDM availability needs confirmation" /
"No time works for every KDM" / "KDM waived for this meeting" — never
"almost ready", "mostly available", "everyone important responded", or
"KDM complete".

## 41. Updated Scheduling Readiness Rule

```
const ready =
  everyNonWaivedKdmHasConfirmedAvailability &&
  everyNonWaivedRequiredParticipantHasConfirmedAvailability &&
  atLeastOneValidSlotContainsFullMeetingDuration &&
  hardConstraintsAreSatisfied;
```

Optional participants improve ranking but never gate readiness. Soft
constraints rank valid slots but never invalidate them.

## 42. Calendar Provider Scope

KDM scheduling behavior stays provider-independent. Google and Microsoft
both remain supported; no additional provider changes KDM readiness
semantics, availability ownership, waiver behavior, snapshot versioning,
or privacy rules.

## 43. Acceptance Criteria

- A meeting can contain multiple KDMs.
- The organizer can identify every KDM immediately.
- The readiness circle distinguishes KDM, Required, waiting, and confirmation states.
- Hover, focus, click, and tap expose the readiness roster.
- KDM availability can be isolated in the grid. *(deferred — no grid yet)*
- A recommendation cannot be marked Ready while a non-waived KDM is missing or stale.
- Every recommendation includes full KDM attendance unless a waiver exists.
- A KDM waiver creates a durable audit record.
- Timezone correction preserves stored UTC slots and requires reconfirmation.
- Concurrent gating-participant updates invalidate stale recommendations.
- Rescheduling uses the latest confirmed availability.
- Non-organizer participants receive aggregated availability by default. *(not yet applicable)*
- Dashboard, meeting detail, and scheduling states use consistent KDM terminology.
- Progress-circle and roster interactions work at desktop and mobile breakpoints.
- Screen readers receive a complete textual readiness summary.

## 44. Definition of Done

For a meeting containing two KDMs, the organizer must be able to: see
both without opening a settings page; understand whether each has
responded; open the progress circle and inspect all gating participants;
filter the availability grid to KDMs *(deferred)*; identify times that
work for every KDM *(deferred — no grid)*; understand why a time is
blocked; detect stale or timezone-unconfirmed availability; explicitly
waive a KDM with a recorded reason; recalculate against the latest
availability; book only after all non-waived KDM and Required
constraints are satisfied.
