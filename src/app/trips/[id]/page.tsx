export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { itineraryItems, expenses, packingItems, tripMembers } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { eachDayOfInterval, format as isoFormat } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { getRates, convert } from "@/lib/fx";
import { ensureTripHeroImage } from "@/lib/actions/ensure-trip-hero";
import { NowCockpit, type NowItem } from "@/components/trips/now-cockpit";
import { PreStartOverview, type PreStartDay } from "@/components/trips/pre-start-overview";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * NOW screen (redesign brief Screen C). Fetches the trip itinerary + spend and
 * renders the dark cockpit (full-screen map + draggable sheet). The light
 * pre-start overview for upcoming trips (Screen H) lands in a later step.
 */
export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  // Keep the hero photo warm for the dashboard / pre-start screens.
  ensureTripHeroImage({
    tripId: trip.id,
    destination: trip.destination,
    existingUrl: trip.heroImageUrl,
    existingCreditName: trip.heroImageCreditName,
    existingCreditLink: trip.heroImageCreditLink,
  }).catch(() => {});

  const rows = await db
    .select()
    .from(itineraryItems)
    .where(eq(itineraryItems.tripId, id))
    .orderBy(asc(itineraryItems.sortOrder), asc(itineraryItems.startTime));

  const items: NowItem[] = rows.map((r) => ({
    id: r.id,
    dayDate: r.dayDate,
    title: r.title,
    type: r.type,
    startTime: r.startTime,
    locationName: r.locationName,
    lat: r.locationLat,
    lng: r.locationLng,
    status: r.status,
  }));

  const tripCurrency = trip.currency ?? "USD";
  const expRows = await db
    .select({ amount: expenses.amount, currency: expenses.currency })
    .from(expenses)
    .where(eq(expenses.tripId, id));
  let spent = 0;
  if (expRows.length) {
    const rates = await getRates(tripCurrency).catch(() => null);
    for (const e of expRows) {
      const amt = Number(e.amount) || 0;
      const converted =
        e.currency !== tripCurrency ? convert(amt, e.currency, tripCurrency, rates) : amt;
      spent += converted ?? amt;
    }
  }

  const days = eachDayOfInterval({
    start: parseDateOnly(trip.startDate),
    end: parseDateOnly(trip.endDate),
  }).map((d) => isoFormat(d, "yyyy-MM-dd"));

  const withCoords = items.find((i) => i.lat != null && i.lng != null);
  const center: [number, number] | null = withCoords
    ? [withCoords.lng as number, withCoords.lat as number]
    : null;

  // Upcoming trips (not yet started) get the light pre-start overview (Screen
  // H); started trips get the dark NOW cockpit (Screen C).
  const started = parseDateOnly(trip.startDate) <= new Date();
  if (!started) {
    const memberRows = await db
      .select({ userId: tripMembers.userId })
      .from(tripMembers)
      .where(eq(tripMembers.tripId, id));
    const packRows = await db
      .select({ packed: packingItems.packed })
      .from(packingItems)
      .where(eq(packingItems.tripId, id));
    const packed = packRows.filter((p) => p.packed).length;
    const itemDays = new Set(items.map((i) => i.dayDate));
    const todayIso = isoFormat(new Date(), "yyyy-MM-dd");
    const preDays: PreStartDay[] = days.map((d, i) => ({
      key: d,
      label: String(i + 1),
      hasItems: itemDays.has(d),
      isToday: d === todayIso,
    }));
    const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const staticMapUrl =
      withCoords && mapToken
        ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+6b5ce7(${withCoords.lng},${withCoords.lat})/${withCoords.lng},${withCoords.lat},9,0/640x360@2x?access_token=${mapToken}`
        : null;
    const dateLabel = `${isoFormat(parseDateOnly(trip.startDate), "d MMM")} – ${isoFormat(parseDateOnly(trip.endDate), "d MMM yyyy")}`;
    return (
      <PreStartOverview
        tripId={id}
        name={trip.name}
        destination={trip.destination}
        dates={dateLabel}
        heroImageUrl={trip.heroImageUrl ?? null}
        staticMapUrl={staticMapUrl}
        days={preDays}
        placesCount={items.length}
        crewCount={memberRows.length}
        packing={{ packed, total: packRows.length }}
        budget={{
          total: trip.budgetTotal != null ? Number(trip.budgetTotal) : null,
          currency: tripCurrency,
        }}
      />
    );
  }

  return (
    <NowCockpit
      tripId={id}
      center={center}
      days={days}
      items={items}
      budget={{
        total: trip.budgetTotal != null ? Number(trip.budgetTotal) : null,
        spent,
        currency: tripCurrency,
      }}
    />
  );
}
