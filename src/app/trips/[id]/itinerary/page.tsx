export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { itineraryItems } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { TripShell } from "@/components/trips/trip-shell";
import { ItineraryBoard } from "@/components/itinerary/itinerary-board";
import { eachDayOfInterval, parseISO, format } from "date-fns";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ItineraryPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const items = await db
    .select()
    .from(itineraryItems)
    .where(eq(itineraryItems.tripId, id))
    .orderBy(asc(itineraryItems.sortOrder), asc(itineraryItems.startTime));

  const days = eachDayOfInterval({
    start: parseISO(trip.startDate),
    end: parseISO(trip.endDate),
  }).map((d) => format(d, "yyyy-MM-dd"));

  return (
    <TripShell trip={trip} userId={user.id}>
      <ItineraryBoard
        tripId={id}
        days={days}
        items={items}
        currency={trip.currency}
      />
    </TripShell>
  );
}
