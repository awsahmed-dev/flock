"use server";

import { db } from "@/lib/db";
import { itineraryItems, savedPlaces, tripMembers, trips, tripSegments, tripRemovedStops } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseOr } from "@/lib/actions/validate";
import { BASES } from "@/lib/packages/library";
import { findStay, stayParam } from "@/lib/packages/stay-key";
import { coordsFor } from "@/lib/packages/coords";
import { photoFor } from "@/lib/packages/photos";
import { whatIs } from "@/lib/packages/descriptions";
import { withoutCity } from "@/lib/packages/describe-in-context";
import { cityIdeas, factsFor } from "@/lib/places/facts";
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
  if (!user) throw new Error("err.notSignedIn");
  const m = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)),
  });
  if (!m) throw new Error("err.notAMember");
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
  /** how many people that rating is made of — Google's, never ours */
  ratingCount?: number | null;
  /** came from Google rather than the curated corpus */
  fromGoogle?: boolean;
  /** lets the card open its real Google page — photos, rating, reviews */
  googlePlaceId?: string | null;
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
/**
 * Google's buckets are not our buckets.
 *
 * This was `g.category as PlaceCategory` — a cast, not a conversion.
 * Google says "eat", "shopping", "coffee"; PlaceCategory says "food",
 * "shop", "rest". None of those overlap, so every Google place carried a
 * category outside the type it claimed, the board's filter chips counted
 * almost nothing, and the `?? "sight"` fallback never fired because a
 * wrong string is still a string.
 */
const GOOGLE_CATEGORY: Record<string, PlaceCategory> = {
  sight: "sight",
  eat: "food",
  coffee: "food",
  nightlife: "food",
  shopping: "shop",
  activity: "walk",
  nature: "nature",
  stay: "rest",
};
function boardCategory(c: string | null | undefined): PlaceCategory {
  return (c && GOOGLE_CATEGORY[c]) || "sight";
}

/**
 * @param stayKey which STAY — «jeddah» for the arrival, «jeddah#2» for
 * the leg you come back on. A bare city id means the first visit, so
 * every link written before a city could repeat still works.
 */
export async function getCityBoard(tripId: string, stayKey: string): Promise<CityBoard | null> {
  const { role } = await requireMember(tripId);
  const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
  if (!trip) return null;
  const segs = await db
    .select()
    .from(tripSegments)
    .where(eq(tripSegments.tripId, tripId))
    .orderBy(tripSegments.sortOrder);
  // By STAY, not by city. Resolving Jeddah to whichever Jeddah came
  // first meant the return leg had no page at all: its card opened the
  // arrival's dates, and «املأ الأيام الفاضية» filled October while the
  // November day you were looking at stayed empty.
  const seg = findStay(segs, stayKey);
  if (!seg) return null;
  const baseId = seg.baseId;
  const segIndex = segs.indexOf(seg);

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
  // By POSITION. Comparing the city meant the first Jeddah of a
  // Jeddah → Riyadh → Jeddah trip was treated as the last stay, so it
  // claimed the departure day — which is Riyadh's check-in — and listed
  // «طيران إلى الرياض» under what you are doing in Jeddah.
  const isLast = segIndex === segs.length - 1;
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
  // What Google knows about the curated places, so their cards can open
  // the same photos-rating-reviews sheet a Google suggestion does.
  const curatedNames = [...base.days, ...(base.dayTrip ? [base.dayTrip] : [])]
    .flatMap((d) => d.places.map((p) => p.name));
  const facts = await factsFor(curatedNames).catch(() => new Map());
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
        // This whole screen is headed by the city, so the line does not
        // need to end with it five times in a row.
        what: withoutCity(whatIs(p.name)?.what, base.name) || null,
        whatAr: withoutCity(whatIs(p.name)?.whatAr, base.nameAr) || null,
        why: p.why,
        whyAr: p.whyAr,
        category: p.category,
        // Curated places carry no rating — see CuratedPlace.
        rating: facts.get(p.name)?.rating ?? null,
        ratingCount: facts.get(p.name)?.ratingCount ?? null,
        googlePlaceId: facts.get(p.name)?.googlePlaceId ?? null,
        lat: c?.[0] ?? null,
        lng: c?.[1] ?? null,
        inPlan: onPlan.has(p.name),
        fromSave: false,
        startTime: p.startTime ?? null,
        photoUrl: photoFor(p.name),
      });
    }
  }

  // The corpus is finite: Langkawi has fourteen places and a five-night
  // stay uses all fourteen, after which this screen has nothing left to
  // suggest. The rest of the city comes from Google — the same API
  // Discover uses — cached per city for a week.
  const ideas = await cityIdeas(baseId, base.lat, base.lng, base.nameAr || base.name).catch(() => []);
  for (const g of ideas) {
    if (seen.has(g.name) || gone.has(g.name) || onPlan.has(g.name)) continue;
    seen.add(g.name);
    curated.push({
      key: `g:${g.placeId}`,
      name: g.name,
      nameAr: g.name,
      what: g.address,
      whatAr: g.address,
      why: "",
      whyAr: "",
      category: boardCategory(g.category),
      rating: g.rating,
      ratingCount: g.ratingCount,
      lat: g.lat,
      lng: g.lng,
      inPlan: false,
      fromSave: false,
      fromGoogle: true,
      googlePlaceId: g.placeId,
      startTime: null,
      photoUrl: g.photoRef ? `/api/discover/photo?ref=${encodeURIComponent(g.photoRef)}&w=400` : null,
    });
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
      category: boardCategory(s.category),
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
        what: withoutCity(whatIs(s.title)?.what, base.name) || null,
        whatAr: withoutCity(whatIs(s.title)?.whatAr, base.nameAr) || null,
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
    // Nights, not days. `dates` is the DAY list and is deliberately one
    // longer for the last base so the departure day appears — reusing it
    // here made the city header claim "7 ليالٍ" on a six-night trip, two
    // clicks after the shape screen had correctly said six. A number the
    // reader can check on their fingers, and it was wrong.
    nights: Math.max(0, span.length - 1),
    days,
    // Must agree with fillFreeDays, which skips arrival days. They
    // disagreed, so the button offered "Fill the free day" and the action
    // answered "No free days here" — on the same screen, at once.
    freeDays: days.filter((d) => d.free && !d.travel).length,
    places: curated,
    planned,
    // One chip per CITY, not per stay. A trip that returns to Jeddah has
    // two Jeddah stays, and listing both here offered a choice between a
    // city and itself — twice the same name, twice the same link, and a
    // duplicate React key. This row means "the other cities"; the second
    // leg is reached from its own card on the shape screen.
    siblings: segs
      .filter((sg, i) => sg.baseId !== baseId && segs.findIndex((x) => x.baseId === sg.baseId) === i)
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
/**
 * Expected refusals come back as data, not as a throw.
 *
 * React strips a thrown message out of a server action in production —
 * the browser receives "An error occurred in the Server Components
 * render…" instead — so the Arabic sentence written here never reached
 * anyone. A returned value is not redacted. Real faults still throw.
 */
export async function addPlaceToCity(input: z.infer<typeof zAdd>) {
  try {
    return await runAddPlaceToCity(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("err.")) return { ok: false as const, error: msg };
    throw err;
  }
}

async function runAddPlaceToCity(input: z.infer<typeof zAdd>) {
  const { tripId, baseId, placeKey, dayDate } = parseOr(zAdd, input, "Invalid request");
  const { user, role } = await requireMember(tripId);
  if (role !== "owner") throw new Error("err.ownerOnlyPlan");

  const board = await getCityBoard(tripId, baseId);
  if (!board) throw new Error("err.notACityHere");
  const place = board.places.find((p) => p.key === placeKey);
  if (!place) throw new Error("err.unknownPlace");
  if (place.inPlan) return { day: null, already: true as const };

  const usable = board.days.filter((d) => !d.travel);
  const pool = usable.length ? usable : board.days;
  if (!pool.length) throw new Error("err.noDaysHere");

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
    ratingCount: place.ratingCount ?? null,
    googlePlaceId: place.googlePlaceId ?? null,
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
  revalidatePath(`/trips/${tripId}/city/${encodeURIComponent(stayParam(baseId))}`);
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
  try {
    return await runFillFreeDays(tripId, baseId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("err.")) return { ok: false as const, error: msg };
    throw err;
  }
}

async function runFillFreeDays(tripId: string, baseId: string) {
  const { user, role } = await requireMember(tripId);
  if (role !== "owner") throw new Error("err.ownerOnlyPlan");
  const board = await getCityBoard(tripId, baseId);
  if (!board) throw new Error("err.notACityHere");

  const perDay = 4;
  const free = board.days.filter((d) => d.free && !d.travel);
  if (!free.length) throw new Error("err.noFreeDaysHere");

  let pool = board.places.filter((p) => !p.inPlan && p.lat != null && p.lng != null);
  if (!pool.length) throw new Error("err.nothingLeftToAdd");

  const planned: { date: string; places: CityPlace[] }[] = [];
  for (const day of free) {
    if (!pool.length) break;
    // Seed with the strongest remaining place, then walk outward.
    // Seed with the first place the curator listed. It used to seed with
    // the highest rated, which sounds better until you know the ratings
    // were invented — curation order is the real signal and always was.
    // Open the day on something worth leaving the hotel for.
    //
    // This took pool[0] and said the curator's order is the real signal.
    // True for the curated corpus; meaningless for a city we do not
    // curate, where the list is Google's and position 0 is just whatever
    // has the most reviews in town. In Jeddah that was Red Sea Mall,
    // then Cenomi Mall of Arabia, then جده بارك — the three day-seeds
    // were literally list positions 1, 2 and 3.
    const anchor = pool.find((p) => p.category === "sight" || p.category === "nature" || p.category === "walk");
    const seed = anchor ?? pool[0];
    const chosen = [seed];
    pool = pool.filter((p) => p.key !== seed.key);
    // One of each kind per day. The walk below only measured distance,
    // and Jeddah's malls sit a few kilometres apart along one road, so
    // every day went mall → mall → mall and called it an afternoon.
    const used: Record<string, number> = { [seed.category]: 1 };
    const CAP: Record<string, number> = { shop: 1, food: 2 };
    while (chosen.length < perDay && pool.length) {
      const last = chosen[chosen.length - 1];
      const eligible = pool.filter((p) => (used[p.category] ?? 0) < (CAP[p.category] ?? 99));
      // Never stall a day over the cap — a repeat beats an empty slot.
      const from = eligible.length ? eligible : pool;
      const next = from.reduce((a, b) =>
        km([last.lat!, last.lng!], [b.lat!, b.lng!]) < km([last.lat!, last.lng!], [a.lat!, a.lng!]) ? b : a,
      );
      // Beyond 15km it is a different afternoon, not the same one.
      if (km([last.lat!, last.lng!], [next.lat!, next.lng!]) > 15) break;
      chosen.push(next);
      used[next.category] = (used[next.category] ?? 0) + 1;
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
      // Carry Google's own numbers and its place id.
      //
      // This said `rating: null`. You pick a place off the board BECAUSE
      // it reads 4.5 from 12,222 people — and the moment it landed on a
      // day, the rating, the review count, the photo and the link back to
      // Google were all dropped. The plan then showed a bare name, which
      // is the thing the board exists to stop.
      rating: p.rating ?? null,
      ratingCount: p.ratingCount ?? null,
      googlePlaceId: p.googlePlaceId ?? null,
      photoUrl: p.photoUrl ?? null,
      // Asked for by name, so it survives a reshape like any other choice.
      provider: "chosen" as const,
      status: "confirmed" as const,
      sortOrder: i,
      createdBy: user.id,
    })),
  );
  if (rows.length) await db.insert(itineraryItems).values(rows);

  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/city/${encodeURIComponent(stayParam(baseId))}`);
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

