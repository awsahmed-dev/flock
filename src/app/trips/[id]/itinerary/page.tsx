export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { itineraryItems } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { ItineraryBoard } from "@/components/itinerary/itinerary-board";
import { eachDayOfInterval, parseISO, format } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { isOwner as checkOwner } from "@/lib/permissions";
import { geocode } from "@/lib/geocode";
import { getRates } from "@/lib/fx";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ItineraryPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  // B5: parallel boot — itinerary items, destination geocode for the map
  // initial center, and FX rates for dual-currency price display.
  const [items, destinationGeo, fxRates] = await Promise.all([
    db
      .select()
      .from(itineraryItems)
      .where(eq(itineraryItems.tripId, id))
      .orderBy(asc(itineraryItems.sortOrder), asc(itineraryItems.startTime)),
    geocode(trip.destination).catch(() => null),
    getRates(trip.currency),
  ]);

  const days = eachDayOfInterval({
    start: parseDateOnly(trip.startDate),
    end: parseDateOnly(trip.endDate),
  }).map((d) => format(d, "yyyy-MM-dd"));

  // Serialize Date fields so Next.js can safely pass them to the client
  // component. The Drizzle row may return some columns as Date — coerce
  // to ISO strings to keep the client payload JSON-safe.
  const serializedItems = items.map((item) => ({
    ...item,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
  }));

  // Mapbox uses [lng, lat] tuples — flip the order here so the client
  // doesn't have to remember.
  const destinationCenter: [number, number] | null = destinationGeo
    ? [destinationGeo.lng, destinationGeo.lat]
    : null;

  return (
    <ItineraryBoard
      tripId={id}
      days={days}
      items={serializedItems as any}
      currency={trip.currency}
      destination={trip.destination}
      destinationCenter={destinationCenter}
      fxRates={fxRates}
      userId={user.id}
      isOwner={checkOwner(trip, user.id)}
    />
  );
}
