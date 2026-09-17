"use server";

import { db } from "@/lib/db";
import { itineraryItems, savedPlaces, tripMembers, trips, tripSegments, tripRemovedStops } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseOr } from "@/lib/actions/validate";
import { BASES } from "@/lib/packages/library";
import { coordsFor } from "@/lib/packages/coords";
import { photoFor } from "@/lib/packages/photos";
import { whatIs } from "@/lib/packages/descriptions";
import type { Base, BaseId, PlaceCategory } from "@/lib/packages/types";
import { eachDate } from "@/lib/packages/allocate";

/**
 * The city layer — «وش نسوي في طوكيو؟»
 *
 * The shape says where you sleep and for how long; this says what you do
 * while you are there. It exists because the alternative kept failing in the
 * same way: a trip-wide list of places is a listicle, and a trip-wide "add"
 * asks which of thirty days you meant.
 *
 * Scoping to a base answers both. A place in Tokyo can only land on Tokyo's
 * days, so the question shrinks from thirty to a handful — and once we know
 * where everything is, it shrinks to none, because proximity picks the day.
 */

const DAY_SLOTS = ["09:30", "12:30", "15:30", "19:00"];

async function requireMember(tripId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const m = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)),
  });
  if (!m) throw new Error("Not a trip member");
  return { user, role: m.role };
}

export interface CityPlace {
  key: string;
  name: string;
  nameAr: string;
  /**
   * The flat sentence that says what this place IS, shown above the `why`.
   * A name on its own is homework: "I don't know what are you talking about
   * because I don't know the places."
   */
  what?: string | null;
  whatAr?: string | null;
  why: string;
  whyAr: string;
  category: PlaceCategory;
  rating?: number | null;
  lat: number | null;
  lng: number | null;
  /** already on a day of this trip */
  inPlan: boolean;
  /** came from the crew's saves rather than the curated library */
  fromSave: boolean;
  /** the hour this place is actually for — a bar is not a 09:30 stop */
  startTime?: string | null;
  /** a picture, where we have one — the single biggest trust signal */
  photoUrl?: string | null;
}

export interface CityDay {
  date: string;
  stops: number;
  travel: boolean;
  free: boolean;
}

export interface CityPlannedDay {
  date: string;
  travel: boolean;
  stops: {
    title: string;
    titleAr: string | null;
    what: string | null;
    whatAr: string | null;
    startTime: string | null;
    rating: number | null;
  }[];
}

export interface CityBoard {
  baseId: BaseId;
  name: string;
  nameAr: string;
  lat: number;
  lng: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  days: CityDay[];
  freeDays: number;
  places: CityPlace[];
  /** what is already scheduled here, day by day — the primary question */
  planned: CityPlannedDay[];
  /** other bases on this trip, for the switcher */
  siblings: { id: BaseId; name: string; nameAr: string }[];
  isOwner: boolean;
}

/** Everything you could add while based here, and where there's room. */
export async function getCityBoard(tripId: string, baseId: string): Promise<CityBoard | null> {
  const { role } = await requireMember(tripId);
  const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
  if (!trip) return null;
  const segs = await db
    .select()
    .from(tripSegments)
    .where(eq(tripSegments.tripId, tripId))
    .orderBy(tripSegments.sortOrder);
  const seg = segs.find((s) => s.baseId === baseId);
  if (!seg) return null;

  // A city we do not curate still gets this screen — it just has nothing to
  // suggest yet, and everything to fill.
  const base: Base =
    BASES[baseId] ?? {
      id: baseId,
      name: seg.customName ?? baseId.replace(/^custom:/, ""),
      nameAr: seg.customNameAr || seg.customName || baseId.replace(/^custom:/, ""),
      country: "",
      lat: seg.customLat ?? 0,
      lng: seg.customLng ?? 0,
      photoQuery: seg.customName ?? "",
      match: [],
      typicalNights: 1,
      maxNights: 60,
      reachable: [],
      pairsWith: [],
      days: [],
    };

  const [stops, saves, removed] = await Promise.all([
    db.select().from(itineraryItems).where(eq(itineraryItems.tripId, tripId)),
    db.select().from(savedPlaces).where(eq(savedPlaces.tripId, tripId)),
    db.select({ title: tripRemovedStops.title }).from(tripRemovedStops).where(eq(tripRemovedStops.tripId, tripId)),
  ]);
  const gone = new Set(removed.map((r) => r.title));
  const onPlan = new Set(stops.map((s) => s.title));

  // Nights are checkIn..checkOut exclusive — except for the last base,
  // which also owns the departure day. Without this the city header said
  // "Tue 13 → Sat 17" and then listed only 13–16, while the plan had a
  // stop on the 17th: two screens, two answers.
  const isLast = segs[segs.length - 1]?.baseId === baseId;
  const span = eachDate(String(seg.checkIn), String(seg.checkOut));
  const dates = isLast ? span : span.slice(0, -1);
  const countFor = (d: string) => stops.filter((s) => s.dayDate === d).length;
  const days: CityDay[] = dates.map((d, i) => ({
    date: d,
    stops: countFor(d),
    // The first day here is an arrival — you got off a plane or a train.
    travel: i === 0,
    free: countFor(d) === 0,
  }));

  // Curated content for this base that isn't already scheduled, plus the
  // crew's own saves that sit near it. One list, because from the user's
  // side "somewhere I might go in Tokyo" is one idea, not two.
  const curated: CityPlace[] = [];
  const seen = new Set<string>();
  const shapes = [...base.days, ...(base.dayTrip ? [base.dayTrip] : [])];
  for (const d of shapes) {
    for (const p of d.places) {
      if (seen.has(p.name) || gone.has(p.name)) continue;
      seen.add(p.name);
      const c = coordsFor(p.name);
      curated.push({
        key: `c:${p.name}`,
        name: p.name,
        nameAr: p.nameAr,
        what: whatIs(p.name)?.what ?? null,
        whatAr: whatIs(p.name)?.whatAr ?? null,
        why: p.why,
        whyAr: p.whyAr,
        category: p.category,
        rating: p.rating ?? null,
        lat: c?.[0] ?? null,
        lng: c?.[1] ?? null,
        inPlan: onPlan.has(p.name),
        fromSave: false,
        startTime: p.startTime ?? null,
        photoUrl: photoFor(p.name),
      });
    }
  }

  const near = (lat: number | null, lng: number | null) => {
    if (lat == null || lng == null) return false;
    const dx = base.lat - lat;
    const dy = base.lng - lng;
    return dx * dx + dy * dy < 0.8;
  };
  for (const s of saves) {
    if (!near(s.lat, s.lng) || seen.has(s.placeName)) continue;
    seen.add(s.placeName);
    curated.push({
      key: `s:${s.id}`,
      name: s.placeName,
      nameAr: s.placeName,
      why: "",
      whyAr: "",
      category: (s.category as PlaceCategory) ?? "sight",
      rating: s.rating,
      lat: s.lat,
      lng: s.lng,
      inPlan: onPlan.has(s.placeName),
      fromSave: true,
      startTime: null,
      photoUrl: s.photoRef ? `/api/discover/photo?ref=${encodeURIComponent(s.photoRef)}&w=400` : null,
    });
  }

  // "What am I doing in Tokyo?" is the question this screen is opened with.
  // It used to answer only "what could I add?", which on a fully-planned
  // city is an empty screen saying "nothing left to suggest".
  const planned: CityPlannedDay[] = days.map((d) => ({
    date: d.date,
    travel: d.travel,
    stops: stops
      .filter((s) => s.dayDate === d.date)
      // A stop with no time belongs at the END of the day, not the start:
      // an empty string sorts before "07:00", which put an untimed save
      // ahead of a 7am fish market.
      .sort((a, b) => {
        const at = a.startTime ? String(a.startTime) : "~";
        const bt = b.startTime ? String(b.startTime) : "~";
        return at.localeCompare(bt) || a.sortOrder - b.sortOrder;
      })
      .map((s) => ({
        title: s.title,
        titleAr: s.titleAr,
        // Looked up by the English title rather than stored on the row:
        // the description is authored content, and copying it into every
        // itinerary row would leave stale text behind on the next edit.
        what: whatIs(s.title)?.what ?? null,
        whatAr: whatIs(s.title)?.whatAr ?? null,
        startTime: s.startTime ? String(s.startTime).slice(0, 5) : null,
        rating: s.rating,
      })),
  }));

  return {
    baseId,
    name: base.name,
    nameAr: base.nameAr,
    lat: base.lat,
    lng: base.lng,
    checkIn: String(seg.checkIn),
    checkOut: String(seg.checkOut),
    nights: dates.length,
    days,
    // Must agree with fillFreeDays, which skips arrival days. They
    // disagreed, so the button offered "Fill the free day" and the action
    // answered "No free days here" — on the same screen, at once.
    freeDays: days.filter((d) => d.free && !d.travel).length,
    places: curated,
    planned,
    siblings: segs
      .filter((sg) => sg.baseId !== baseId)
      .map((sg) => ({
        id: sg.baseId,
        name: BASES[sg.baseId]?.name ?? sg.customName ?? sg.baseId.replace(/^custom:/, ""),
        nameAr: BASES[sg.baseId]?.nameAr ?? sg.customNameAr ?? sg.customName ?? sg.baseId.replace(/^custom:/, ""),
      })),
    isOwner: role === "owner",
  };
}

/* ── adding ───────────────────────────────────────────────────────────── */

function km(a: [number, number], b: [number, number]) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const zAdd = z.object({
  tripId: z.string().uuid(),
  baseId: z.string().max(60),
  placeKey: z.string().max(200),
  /** optional explicit day; omitted means "you pick" */
  dayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * Add one place while based here. The day is computed, not asked: the day in
 * this city that already has the nearest stops, else the emptiest. Never the
 * arrival day, and never a day in a city this place isn't in — that was the
 * bug where a Kyoto restaurant landed on a Tokyo morning.
 */
export async function addPlaceToCity(input: z.infer<typeof zAdd>) {
  const { tripId, baseId, placeKey, dayDate } = parseOr(zAdd, input, "Invalid request");
  const { user, role } = await requireMember(tripId);
  if (role !== "owner") throw new Error("Only the trip owner can change the plan");

  const board = await getCityBoard(tripId, baseId);
  if (!board) throw new Error("Not a city on this trip");
  const place = board.places.find((p) => p.key === placeKey);
  if (!place) throw new Error("Unknown place");
  if (place.inPlan) return { day: null, already: true as const };

  const usable = board.days.filter((d) => !d.travel);
  const pool = usable.length ? usable : board.days;
  if (!pool.length) throw new Error("No days here");

  let day = dayDate && pool.some((d) => d.date === dayDate) ? dayDate : null;
  let reason: "asked" | "near" | "emptiest" = "asked";

  if (!day) {
    const stops = await db
      .select({ dayDate: itineraryItems.dayDate, lat: itineraryItems.locationLat, lng: itineraryItems.locationLng })
      .from(itineraryItems)
      .where(eq(itineraryItems.tripId, tripId));
    if (place.lat != null && place.lng != null) {
      let best: { d: string; km: number } | null = null;
      for (const p of pool) {
        const withCoords = stops.filter((s) => s.dayDate === p.date && s.lat != null && s.lng != null);
        if (!withCoords.length) continue;
        const d = Math.min(
          ...withCoords.map((s) => km([place.lat!, place.lng!], [s.lat!, s.lng!])),
        );
        if (!best || d < best.km) best = { d: p.date, km: d };
      }
      // Within ~12km is "same part of town, same day".
      if (best && best.km < 12) {
        day = best.d;
        reason = "near";
      }
    }
    if (!day) {
      day = pool.reduce((a, b) => (b.stops < a.stops ? b : a)).date;
      reason = "emptiest";
    }
  }

  const order = (await db
    .select({ n: itineraryItems.sortOrder })
    .from(itineraryItems)
    .where(and(eq(itineraryItems.tripId, tripId), eq(itineraryItems.dayDate, day)))).length;

  await db.insert(itineraryItems).values({
    tripId,
    dayDate: day,
    baseId,
    title: place.name,
    titleAr: place.nameAr,
    // Same as the projection: a meal is a meal, not an "activity".
    type: place.category === "food" ? "meal" : "activity",
    locationName: place.name,
    locationLat: place.lat,
    locationLng: place.lng,
    photoUrl: place.photoUrl ?? null,
    notes: place.why || null,
    topTip: place.why || null,
    topTipAr: place.whyAr || null,
    rating: place.rating ?? null,
    // "chosen", never "package": the shape regeneration deletes every
    // package row and rebuilds. A tester added Fushimi Inari, then
    // shortened TOKYO by one night — a different city — and Fushimi was
    // gone, while every stop the app had picked came back. A place someone
    // went looking for is not disposable.
    provider: "chosen",
    status: "confirmed",
    sortOrder: order,
    createdBy: user.id,
  });

  if (place.fromSave) {
    await db
      .update(savedPlaces)
      .set({ status: "planned" })
      .where(and(eq(savedPlaces.tripId, tripId), eq(savedPlaces.placeName, place.name)));
  }
  // Adding back something previously dropped un-drops it.
  await db
    .delete(tripRemovedStops)
    .where(and(eq(tripRemovedStops.tripId, tripId), eq(tripRemovedStops.title, place.name)));

  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/city/${baseId}`);
  return { day, reason, already: false as const };
}

/**
 * «املأ الأيام الفاضية» — fill this city's free days by geography.
 *
 * The founder's ask, and the one job here a person genuinely cannot do from
 * memory: nobody knows that Fushimi Inari and Tōfuku-ji are ten minutes
 * apart. No model is involved and none is needed — we have coordinates and
 * opening times, so this is arithmetic, which means it is fast, free, and
 * cannot invent a restaurant.
 *
 * Greedy nearest-neighbour: seed each free day with the best unplaced place,
 * then pull in whatever is closest to it until the day is full. Returns what
 * it did and why, because a rearrangement you can't see is the wizard again.
 */
export async function fillFreeDays(tripId: string, baseId: string) {
  const { user, role } = await requireMember(tripId);
  if (role !== "owner") throw new Error("Only the trip owner can change the plan");
  const board = await getCityBoard(tripId, baseId);
  if (!board) throw new Error("Not a city on this trip");

  const perDay = 4;
  const free = board.days.filter((d) => d.free && !d.travel);
  if (!free.length) throw new Error("No free days here");

  let pool = board.places.filter((p) => !p.inPlan && p.lat != null && p.lng != null);
  if (!pool.length) throw new Error("Nothing left to add here");

  const planned: { date: string; places: CityPlace[] }[] = [];
  for (const day of free) {
    if (!pool.length) break;
    // Seed with the strongest remaining place, then walk outward.
    const seed = pool.reduce((a, b) => ((b.rating ?? 0) > (a.rating ?? 0) ? b : a));
    const chosen = [seed];
    pool = pool.filter((p) => p.key !== seed.key);
    while (chosen.length < perDay && pool.length) {
      const last = chosen[chosen.length - 1];
      const next = pool.reduce((a, b) =>
        km([last.lat!, last.lng!], [b.lat!, b.lng!]) < km([last.lat!, last.lng!], [a.lat!, a.lng!]) ? b : a,
      );
      // Beyond 15km it is a different afternoon, not the same one.
      if (km([last.lat!, last.lng!], [next.lat!, next.lng!]) > 15) break;
      chosen.push(next);
      pool = pool.filter((p) => p.key !== next.key);
    }
    // Order the day by when each place is actually for, and keep its own
    // hour where the curation gives one. Slotting purely by pick-order put
    // a lantern-lit drinking alley at 09:30 — geographically tidy, socially
    // absurd, and exactly the kind of wrong that makes a plan untrustworthy.
    chosen.sort((a, b) => (a.startTime ?? "12:00").localeCompare(b.startTime ?? "12:00"));
    planned.push({ date: day.date, places: chosen });
  }

  const rows = planned.flatMap((d) =>
    d.places.map((p, i) => ({
      tripId,
      dayDate: d.date,
      baseId,
      title: p.name,
      titleAr: p.nameAr,
      type: (p.category === "food" ? "meal" : "activity") as "meal" | "activity",
      startTime: p.startTime ?? DAY_SLOTS[i] ?? null,
      locationName: p.name,
      locationLat: p.lat,
      locationLng: p.lng,
      notes: p.why || null,
      topTip: p.why || null,
      topTipAr: p.whyAr || null,
      rating: p.rating ?? null,
      // Asked for by name, so it survives a reshape like any other choice.
      provider: "chosen" as const,
      status: "confirmed" as const,
      sortOrder: i,
      createdBy: user.id,
    })),
  );
  if (rows.length) await db.insert(itineraryItems).values(rows);

  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/city/${baseId}`);
  return {
    days: planned.map((d) => ({
      date: d.date,
      names: d.places.map((p) => p.name),
      namesAr: d.places.map((p) => p.nameAr),
      // The spread of the day, so the screen can say WHY these went together.
      spreadKm:
        d.places.length < 2
          ? 0
          : Math.round(
              Math.max(
                ...d.places.map((a) =>
                  Math.max(...d.places.map((b) => km([a.lat!, a.lng!], [b.lat!, b.lng!]))),
                ),
              ),
            ),
    })),
  };
}

