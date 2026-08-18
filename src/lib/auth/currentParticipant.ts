import { currentUser } from "@clerk/nextjs/server";
import { getStore } from "@/lib/store";
import type { Participant } from "@/lib/types";

/**
 * The Clerk <-> Participant identity bridge. A signed-in Clerk user has no
 * meaning to the scheduling domain until they're resolved to a Participant
 * record — this is that resolution, find-or-create, keyed on clerkUserId.
 *
 * Returns null if there's no signed-in user. Safe to call from a Server
 * Component, Route Handler, or Server Action.
 */
export async function getOrCreateCurrentParticipant(): Promise<Participant | null> {
  const user = await currentUser();
  if (!user) return null;

  const store = getStore();
  const existing = await store.getParticipantByClerkUserId(user.id);
  if (existing) return existing;

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "WenMeet user";
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";

  return store.createParticipant({
    name,
    email,
    // No reliable way to read the browser's timezone from a server-side
    // Clerk user — this participant's existing tzCorrection flow (§6)
    // takes it from here once they interact with an availability grid.
    timezone: "UTC",
    clerkUserId: user.id,
  });
}
