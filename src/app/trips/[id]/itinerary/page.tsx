export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { itineraryItems } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
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

  // Serialize Date fields so Next.js can safely pass them to the client component
  const serializedItems = items.map((item) => ({
    ...item,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
  }));

  return (
    <ItineraryBoard
      tripId={id}
      days={days}
      items={serializedItems as any}
      currency={trip.currency}
      destination={trip.destination}
    />
  );
}
