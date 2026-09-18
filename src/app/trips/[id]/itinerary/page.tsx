export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { listTripSaves } from "@/lib/actions/saves";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { itineraryItems, documents, packingItems, tripPhotos, tripSegments } from "@/lib/db/schema";
import { eq, asc, inArray, and, or, isNull, sql } from "drizzle-orm";
import { tripPhase } from "@/lib/trip-phase";
import { getToday } from "@/lib/today-server";
import { BASES } from "@/lib/packages/library";
import { whatIs } from "@/lib/packages/descriptions";
import { getLocale } from "@/lib/i18n";
import { ItineraryBoard } from "@/components/itinerary/itinerary-board";
import { eachDayOfInterval, parseISO } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { isOwner as checkOwner } from "@/lib/permissions";
import { geocode, geocodeDestination } from "@/lib/geocode";
import { getRates } from "@/lib/fx";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}

export default async function ItineraryPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { day: initialDay } = await searchParams;
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
    geocodeDestination(trip.destination).catch(() => null),
    getRates(trip.currency),
  ]);

  // Backfill missing coordinates for any items that have a location name
  // but no coords yet — AI-planned trips written before the geocode-on-
  // insert fix have null lat/lng so they don't show as map pins. We
  // geocode in parallel (capped at 30 to avoid abusing Nominatim) and
  // persist the result, then patch the in-memory rows so this render
  // already includes them.
  // User testing: this put Sensō-ji in Okayama, Nakamise in Hiroshima and the
  // Grand Bazaar in Marmaris — 700km out — then PERSISTED each wrong answer,
  // so the bad pin became permanent and poisoned day placement too. The cause
  // is the scope: a name plus a whole country ("Sensō-ji Temple, Japan") and
  // then the first Nominatim hit, no bounding box, no distance check.
  //
  // Curated stops carry real coordinates now, so they are excluded outright:
  // for them a missing pin is honest and a wrong one is a lie the user acts
  // on. Hand-added stops keep the backfill, since their name is something the
  // user typed about a place they meant.
  const missingGeo = items
    .filter(
      (i) =>
        i.locationName &&
        i.locationLat == null &&
        i.locationLng == null &&
        i.provider !== "package",
    )
    .slice(0, 30);
  if (missingGeo.length > 0) {
    const results = await Promise.all(
      missingGeo.map((i) =>
        geocode(i.locationName as string, trip.destination).catch(() => null),
      ),
    );
    await Promise.all(
      missingGeo.map(async (i, idx) => {
        const geo = results[idx];
        if (!geo) return;
        i.locationLat = geo.lat;
        i.locationLng = geo.lng;
        await db
          .update(itineraryItems)
          .set({ locationLat: geo.lat, locationLng: geo.lng })
          .where(eq(itineraryItems.id, i.id))
          .catch(() => {});
      }),
    );
  }

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
  // A whole-country destination ("Japan") used to open at city zoom on the
  // country's centroid — a blank map over mountains. Frame the extent.
  const destinationZoom = destinationGeo?.zoom ?? 12;

  // Phase 6 §6-B: booking meta for anchor rows (PDF chip, confirmation #,
  // multi-night repetition).
  const anchorIds = items.filter((i) => i.stopType !== "regular").map((i) => i.id);

  // Sprint 5 §3c: day-pinned documents render under each day's stops.
  const dayDocs = await db
    .select({
      id: documents.id,
      title: documents.title,
      type: documents.type,
      url: documents.url,
      dayDate: documents.dayDate,
    })
    .from(documents)
    .where(eq(documents.tripId, id));

  // Sprint 8 Item 6: the sheet is phase-aware. DEPARTURE pulls the pack
  // list (mine + shared); RECAP pulls crew-photo counts per stop.
  const todayIso = await getToday();
  const locale = await getLocale();
  const phase = tripPhase({ startDate: trip.startDate, endDate: trip.endDate }, todayIso);
  const packList =
    phase === "DEPARTURE"
      ? await db
          .select({
            id: packingItems.id,
            label: packingItems.label,
            category: packingItems.category,
            packed: packingItems.packed,
          })
          .from(packingItems)
          .where(
            and(
              eq(packingItems.tripId, id),
              or(isNull(packingItems.userId), eq(packingItems.userId, user.id)),
            ),
          )
          .orderBy(asc(packingItems.sortOrder))
      : [];
  const photoCountByItem: Record<string, number> = {};
  if (phase === "RECAP") {
    const counts = await db
      .select({ itemId: tripPhotos.itemId, n: sql<number>`count(*)::int` })
      .from(tripPhotos)
      .where(eq(tripPhotos.tripId, id))
      .groupBy(tripPhotos.itemId);
    for (const c of counts) if (c.itemId) photoCountByItem[c.itemId] = c.n;
  }

  // Planning v2: the saves tray the plan pulls from. Failure here must never
  // take the itinerary down with it — an empty tray is a fine degradation.
  const tripSaves = await listTripSaves(id).catch(() => []);

  // Which city owns each day, straight from the shape. An empty day has no
  // stops to infer a city from, and that is exactly the day where knowing
  // the city matters most.
  const segsForDays = await db
    .select({ baseId: tripSegments.baseId, checkIn: tripSegments.checkIn, checkOut: tripSegments.checkOut })
    .from(tripSegments)
    .where(eq(tripSegments.tripId, id))
    .orderBy(tripSegments.sortOrder)
    .catch(() => []);
  const baseByDay: Record<string, string> = {};
  for (const d of days) {
    const owning = segsForDays.find((sg) => d >= String(sg.checkIn) && d < String(sg.checkOut));
    // The departure day sits on the last stay's checkOut and belongs to it.
    const sg = owning ?? segsForDays[segsForDays.length - 1];
    if (sg) baseByDay[d] = sg.baseId;
  }

  return (
    <ItineraryBoard
        baseNames={Object.fromEntries(
          Object.values(BASES).map((b) => [b.id, locale === "ar" ? b.nameAr : b.name]),
        )}
      // Only the titles actually on this trip: the corpus is 530 entries and
      // has no business in the client bundle.
      baseByDay={baseByDay}
      whatByTitle={Object.fromEntries(
        serializedItems
          .map((i) => [i.title, whatIs(i.title)] as const)
          .filter(([, w]) => w)
          .map(([title, w]) => [title, w!]),
      )}
      tripId={id}
      days={days}
      items={serializedItems as any}
      documents={dayDocs.filter((d) => d.dayDate != null)}
      currency={trip.currency}
      destination={trip.destination}
      destinationCenter={destinationCenter}
      destinationZoom={destinationZoom}
      fxRates={fxRates}
      userId={user.id}
      isOwner={checkOwner(trip, user.id)}
      crewSize={trip.members.length}
      initialDay={initialDay ?? null}
      phase={phase}
      startDate={trip.startDate}
      packItems={packList}
      photoCountByItem={photoCountByItem}
      todayIso={todayIso}
      saves={tripSaves}
    />
  );
}
