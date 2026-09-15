export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listInboxSaves, listFolders } from "@/lib/actions/saves";
import { db } from "@/lib/db";
import { trips, tripMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SavesInbox } from "@/components/saves/saves-inbox";
import { PageHeader } from "@/components/ui/page-header";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";

/**
 * «محفوظاتي» — the global bookmark inbox.
 *
 * The missing primitive the roundtable converged on: for this audience
 * collecting starts months before a trip exists, so a save must have
 * somewhere to land that isn't a trip. It also inverts the funnel —
 * enough saves in one place becomes the prompt to create the trip.
 */
export default async function SavesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string) => tFromDict(dict, k, undefined, locale);

  const [saves, folders, myTrips] = await Promise.all([
    listInboxSaves(),
    listFolders(),
    db
      .select({ id: trips.id, name: trips.name, destination: trips.destination })
      .from(trips)
      .innerJoin(tripMembers, eq(tripMembers.tripId, trips.id))
      .where(eq(tripMembers.userId, user.id)),
  ]);

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader title={t("saves.inboxTitle")} backHref="/dashboard" />
      <SavesInbox saves={saves} folders={folders} trips={myTrips} />
    </div>
  );
}
