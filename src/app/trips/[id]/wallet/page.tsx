export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { BookingsBoard } from "@/components/wallet/bookings-board";
import { ManageTabs } from "@/components/trips/manage-tabs";
import { getLocale } from "@/lib/i18n";
import { db } from "@/lib/db";
import { itineraryItems } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { eachDayOfInterval } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { format } from "@/lib/i18n/date-fns";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Bookings page — owned entirely by <BookingsBoard>. The default real-trip
 * view is an honest first-run state: a trip-context header, the forward-email
 * affordance promoted to the hero (the page's one primary action), and a
 * "Still to sort" checklist derived from real itinerary gaps. Example passes
 * live behind an opt-in, clearly-badged sample toggle (default off) so no
 * fabricated booking is ever shown as the user's real data.
 */
export default async function WalletPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const locale = await getLocale();
  const itinRows = await db
    .select()
    .from(itineraryItems)
    .where(eq(itineraryItems.tripId, id))
    .orderBy(asc(itineraryItems.dayDate), asc(itineraryItems.sortOrder));

  const days = eachDayOfInterval({
    start: parseDateOnly(trip.startDate as string),
    end: parseDateOnly(trip.endDate as string),
  }).map((d) => format(d, "yyyy-MM-dd"));

  return (
    <>
      <ManageTabs tripId={trip.id} active="bookings" />
      <BookingsBoard
      tripId={trip.id}
      tripName={trip.name}
      destination={trip.destination}
      startDate={trip.startDate as string}
      endDate={trip.endDate as string}
      members={trip.members.length}
      currency={trip.currency}
      locale={locale === "ar" ? "ar" : "en"}
      userId={user.id}
      days={days}
      items={itinRows.map((i) => ({
        id: i.id,
        type: i.type,
        dayDate: i.dayDate,
        title: i.title,
        locationName: i.locationName ?? null,
      }))}
    />
    </>
  );
}
