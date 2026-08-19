import { getOrCreateCurrentParticipant } from "@/lib/auth/currentParticipant";
import { getStore } from "@/lib/store";
import { CreateWizard } from "@/components/wizard/CreateWizard";

/**
 * Creation is a guided wizard rather than a form (docs/CREATE_WIZARD.md).
 * The organizer's saved timezone and real calendar connections are loaded
 * server-side so the first step is already correct rather than guessing and
 * then correcting itself after hydration.
 */
export default async function NewMeetingPage() {
  const organizer = await getOrCreateCurrentParticipant();
  const store = getStore();

  const [google, microsoft] = organizer
    ? await Promise.all([
        store.getCalendarConnection(organizer.id, "google"),
        store.getCalendarConnection(organizer.id, "microsoft"),
      ])
    : [null, null];

  const connected: Array<"google" | "microsoft"> = [];
  if (google) connected.push("google");
  if (microsoft) connected.push("microsoft");

  // "UTC" is the placeholder every participant starts on, so treat it as
  // "not chosen yet" and let the wizard detect the real one.
  const saved = organizer?.timezone && organizer.timezone !== "UTC" ? organizer.timezone : "";

  return <CreateWizard initialTimezone={saved} connectedProviders={connected} />;
}
