"use server";

import { db } from "@/lib/db";
import {
  tripSegments,
  segmentReactions,
  tripRemovedStops,
  tripMembers,
  trips,
  itineraryItems,
  savedPlaces,
} from "@/lib/db/schema";
import { and, eq, gt, lt, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseOr, zDateOnly } from "@/lib/actions/validate";
import { BASES, ROUTES, findRoutes, getBase } from "@/lib/packages/library";
import { coordsFor } from "@/lib/packages/coords";
import { photoFor } from "@/lib/packages/photos";
import type { Base, BaseId, ProjectedDay, Segment, TransportMode } from "@/lib/packages/types";
import { allocateNights, routeCapacity, tripNightsBetween } from "@/lib/packages/allocate";
import { segmentsFromLegs, projectDays, redate, relink, segmentNights, errandsFor, type SaveForPlan } from "@/lib/packages/project";
import { gatewayState, orderForGateways, type GatewayState } from "@/lib/packages/gateways";
import { fitToTrip } from "@/lib/packages/fit";
import { factsFor, staleNames, refreshFact } from "@/lib/places/facts";

/**
 * «شكل الرحلة» — the trip's structure, and the day grid projected from it.
 *
 * The rule that shapes this whole file: choosing a route ADOPTS it. There is
 * no draft to confirm, because a draft is what left people on an empty plan
 * tab when they backed out. Everything after adoption is an edit to a live
 * trip, and every edit re-projects the days.
 */

const MODES = ["train", "flight", "car", "bus", "ferry"] as const;

async function requireMember(tripId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const m = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)),
  });
  if (!m) throw new Error("Not a trip member");
  return { user, role: m.role };
}

async function requireOwner(tripId: string) {
  const { user, role } = await requireMember(tripId);
  if (role !== "owner") throw new Error("Only the trip owner can change the shape");
  return user;
}

async function getTrip(tripId: string) {
  const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
  if (!trip) throw new Error("Trip not found");
  return trip;
}

/* ── reading ──────────────────────────────────────────────────────────── */

export interface BaseCard {
  id: BaseId;
  name: string;
  nameAr: string;
  lat: number;
  lng: number;
  nights: number;
  checkIn: string;
  checkOut: string;
  maxNights: number;
  transportInMode: TransportMode | null;
  transportInMinutes: number | null;
  lockedBy: string | null;
  dayTrips: { id: BaseId; name: string; nameAr: string }[];
  reachable: { id: BaseId; name: string; nameAr: string }[];
  /** saves the crew made that sit near this base — «٥ من محفوظاتكم هنا» */
  savesHere: number;
  reactions: { love: number; ok: number; skip: number; mine: string | null };
}

export interface RouteCard {
  id: string;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  provenance: string;
  provenanceAr: string;
  forWho: string;
  forWhoAr: string;
  /** pre-scaled to THIS trip's nights — the small thing that makes it feel built for you */
  chain: { name: string; nameAr: string; nights: number }[];
  dropped: string[];
  droppedAr: string[];
  overflow: number;
  capacity: number;
  /** the chain is shown backwards, because that is what the flights say */
  reversed: boolean;
}

export interface ShapeView {
  tripNights: number;
  /** days of the plan with nothing on them — "assigned" is not "ready" */
  emptyDays: number;
  tripStart: string;
  tripEnd: string;
  bases: BaseCard[];
  addable: { id: BaseId; name: string; nameAr: string; typicalNights: number }[];
  days: ProjectedDay[];
  errands: { kind: string; baseId: BaseId; name: string; nameAr: string; nights?: number; mode?: string; done: boolean }[];
  /**
   * Where the trip enters and leaves. Always present, because every trip
   * has two ends whether or not anyone chose them — `arriveSet`/`departSet`
   * say whether they were chosen or inherited from the shape.
   */
  gateways: GatewayState & {
    arriveName: string;
    arriveNameAr: string;
    departName: string;
    departNameAr: string;
    /** reversing the chain would satisfy both ends — offer the one-tap fix */
    canAlign: boolean;
  };
  isOwner: boolean;
  memberCount: number;
}

/**
 * The base behind a segment, curated or not.
 *
 * A destination we do not curate is still a place you sleep. Rather than
 * refusing to plan it, a custom base carries its own name and coordinates
 * and behaves like any other — it simply has no curated days, so its nights
 * arrive as free days you can fill.
 */
function resolveBase(r: typeof tripSegments.$inferSelect): Base {
  const known = BASES[r.baseId];
  if (known) return known;
  const name = r.customName ?? r.baseId.replace(/^custom:/, "");
  return {
    id: r.baseId,
    name,
    nameAr: r.customNameAr || name,
    country: "",
    lat: r.customLat ?? 0,
    lng: r.customLng ?? 0,
    // 0,0 is a real place in the Gulf of Guinea, and two cities parked
    // there are zero apart. Say we do not know instead of implying we do.
    coordsUnknown: r.customLat == null || r.customLng == null,
    photoQuery: name,
    match: [name.toLowerCase()],
    typicalNights: 1,
    // No curated content, so no ceiling to protect — the whole stay is
    // yours to fill.
    maxNights: 60,
    reachable: [],
    pairsWith: [],
    days: [],
  };
}

/** Curated bases plus whatever custom ones this trip invented. */
function basesFor(rows: (typeof tripSegments.$inferSelect)[]): Record<BaseId, Base> {
  const out: Record<BaseId, Base> = { ...BASES };
  for (const r of rows) if (!out[r.baseId]) out[r.baseId] = resolveBase(r);
  return out;
}

function toSegment(r: typeof tripSegments.$inferSelect): Segment {
  return {
    baseId: r.baseId,
    order: r.sortOrder,
    checkIn: String(r.checkIn),
    checkOut: String(r.checkOut),
    transportInMode: (r.transportInMode as TransportMode) ?? null,
    transportInMinutes: r.transportInMinutes ?? null,
    dayTrips: Array.isArray(r.dayTrips) ? (r.dayTrips as BaseId[]) : [],
    lockedBy: (r.lockedBy as "flight" | "hotel") ?? null,
    customName: r.customName ?? null,
    customNameAr: r.customNameAr ?? null,
    customLat: r.customLat ?? null,
    customLng: r.customLng ?? null,
  };
}

/** Routes for this trip's destination, each pre-scaled to its real length. */
export async function listRoutes(tripId: string): Promise<RouteCard[]> {
  await requireMember(tripId);
  const trip = await getTrip(tripId);
  const nights = tripNightsBetween(trip.startDate, trip.endDate);
  // The DESTINATION decides, and the name is only a fallback for trips
  // created before we captured one. Searching both at once meant a trip to
  // Lisbon named "Qa-A Istanbul" was offered Istanbul routes.
  const matches = trip.destination?.trim()
    ? findRoutes(trip.destination)
    : findRoutes(trip.name ?? "");
  return matches.map((route) => {
    const a = allocateNights(route, BASES, nights);
    // Preview the chain in the direction it will actually be adopted. If the
    // trip already knows it lands in Porto, a card reading "Lisbon → Porto"
    // is advertising something the tap will not produce.
    const ordered = orderForGateways(a.legs, (l) => l.baseId, trip.arriveBaseId, trip.departBaseId);
    const shown = ordered.items;
    return {
      id: route.id,
      title: route.title,
      titleAr: route.titleAr,
      subtitle: route.subtitle,
      subtitleAr: route.subtitleAr,
      provenance: route.provenance,
      provenanceAr: route.provenanceAr,
      forWho: route.forWho,
      forWhoAr: route.forWhoAr,
      chain: shown.map((l) => ({
        name: BASES[l.baseId].name,
        nameAr: BASES[l.baseId].nameAr,
        nights: l.nights,
      })),
      // Was always nameAr, so an English route card listed its dropped
      // cities in Arabic. The caller picks the language, as everywhere else.
      dropped: a.dropped.map((d) => BASES[d]?.name ?? d),
      droppedAr: a.dropped.map((d) => BASES[d]?.nameAr ?? d),
      overflow: a.overflow,
      capacity: routeCapacity(route, BASES),
      reversed: ordered.reversed,
    };
  });
}

/** Rough same-city test — saves carry coords, bases carry coords. */
function near(base: Base, lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return false;
  const dx = base.lat - lat;
  const dy = base.lng - lng;
  return dx * dx + dy * dy < 0.55; // ~0.74° — a metro area, not a street
}

export async function getShape(tripId: string): Promise<ShapeView | null> {
  const { user, role } = await requireMember(tripId);
  const trip = await getTrip(tripId);

  const rows = await db
    .select()
    .from(tripSegments)
    .where(eq(tripSegments.tripId, tripId))
    .orderBy(tripSegments.sortOrder);
  if (!rows.length) return null;

  const LIB = basesFor(rows);
  const segments = relink(redate(rows.map(toSegment), trip.startDate), LIB);
  const [saves, reacts, members] = await Promise.all([
    db
      .select({ lat: savedPlaces.lat, lng: savedPlaces.lng })
      .from(savedPlaces)
      .where(eq(savedPlaces.tripId, tripId)),
    db.select().from(segmentReactions).where(eq(segmentReactions.tripId, tripId)),
    db.select({ id: tripMembers.userId }).from(tripMembers).where(eq(tripMembers.tripId, tripId)),
  ]);

  const used = new Set(segments.map((s) => s.baseId));
  const addable = Object.values(BASES)
    .filter((b) => b.maxNights > 0 && !used.has(b.id))
    .filter((b) => segments.some((s) => LIB[s.baseId]?.pairsWith.includes(b.id)))
    .map((b) => ({ id: b.id, name: b.name, nameAr: b.nameAr, typicalNights: b.typicalNights }));

  const bases: BaseCard[] = segments.map((s) => {
    const b = LIB[s.baseId];
    const mine = reacts.find((r) => r.baseId === s.baseId && r.userId === user.id);
    const forBase = reacts.filter((r) => r.baseId === s.baseId);
    return {
      id: b.id,
      name: b.name,
      nameAr: b.nameAr,
      lat: b.lat,
      lng: b.lng,
      nights: segmentNights(s),
      checkIn: s.checkIn,
      checkOut: s.checkOut,
      maxNights: b.maxNights,
      transportInMode: s.transportInMode,
      transportInMinutes: s.transportInMinutes,
      lockedBy: s.lockedBy,
      dayTrips: s.dayTrips
        .filter((t) => BASES[t])
        .map((t) => ({ id: t, name: BASES[t].name, nameAr: BASES[t].nameAr })),
      reachable: b.reachable
        // Not a place the trip already sleeps in — offering a "day trip"
        // to your own base reads as a bug, and is one.
        .filter((r) => BASES[r] && !s.dayTrips.includes(r) && !segments.some((x) => x.baseId === r))
        .map((r) => ({ id: r, name: BASES[r].name, nameAr: BASES[r].nameAr })),
      savesHere: saves.filter((sv) => near(b, sv.lat, sv.lng)).length,
      reactions: {
        love: forBase.filter((r) => r.reaction === "love").length,
        ok: forBase.filter((r) => r.reaction === "ok").length,
        skip: forBase.filter((r) => r.reaction === "skip").length,
        mine: mine?.reaction ?? null,
      },
    };
  });

  const g = gatewayState(segments, trip.arriveBaseId, trip.departBaseId);
  const nameOf = (id: BaseId | null) =>
    id ? (LIB[id]?.name ?? id.replace(/^custom:/, "")) : "";
  const nameArOf = (id: BaseId | null) =>
    id ? (LIB[id]?.nameAr ?? id.replace(/^custom:/, "")) : "";

  const days = projectDays(segments, LIB, trip.startDate);
  const errands = errandsFor(segments, g).map((e) => ({
    ...e,
    // LIB, not BASES — a custom base printed its raw id, so the checklist
    // read "custom:lisbon hotel · 7 nights".
    name: LIB[e.baseId]?.name ?? e.baseId.replace(/^custom:/, ""),
    nameAr: LIB[e.baseId]?.nameAr ?? e.baseId.replace(/^custom:/, ""),
  }));

  const stopCounts = await db
    .select({ dayDate: itineraryItems.dayDate })
    .from(itineraryItems)
    .where(eq(itineraryItems.tripId, tripId));
  const filled = new Set(stopCounts.map((r) => r.dayDate));

  return {
    tripNights: tripNightsBetween(trip.startDate, trip.endDate),
    // A night can belong to a base and still be an empty day. Reporting
    // only "every day assigned" told a tester his 25-night trip was ready
    // while ten of its days had nothing on them at all.
    emptyDays: days.filter((d) => !filled.has(d.date)).length,
    tripStart: trip.startDate,
    tripEnd: trip.endDate,
    bases,
    addable,
    days,
    errands,
    gateways: {
      ...g,
      arriveName: nameOf(g.arrive),
      arriveNameAr: nameArOf(g.arrive),
      departName: nameOf(g.depart),
      departNameAr: nameArOf(g.depart),
      // Only offer "move the trip to match" when it would actually work.
      // A button that throws when pressed is worse than no button.
      canAlign:
        (g.arriveMismatch || g.departMismatch) &&
        orderForGateways(segments, (s) => s.baseId, trip.arriveBaseId, trip.departBaseId).reversed,
    },
    isOwner: role === "owner",
    memberCount: members.length,
  };
}

/* ── writing ──────────────────────────────────────────────────────────── */

/**
 * Hold the trip while we rewrite its plan.
 *
 * Two crew members tapping the shape screen at the same moment ran two
 * projections concurrently. Each one deletes the generated rows and
 * re-inserts them — so both deleted (the second finding nothing left to
 * delete) and both inserted, and the trip came out with every single stop
 * in it twice, 1.3ms apart. On a group-travel app that is not an exotic
 * race; it is Tuesday.
 *
 * A transaction-scoped advisory lock serialises them: the second waits,
 * then rebuilds from what the first actually wrote. It releases on commit
 * or rollback, so a failure cannot wedge the trip.
 */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function lockTrip(tx: Tx, tripId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${tripId}, 0))`);
}


/**
 * Write the projected days into the itinerary. Only rows this feature owns
 * (`provider = "package"`) are replaced — anything the crew added by hand or
 * from Discover survives untouched, which is what lets the shape stay
 * editable after adoption instead of being a one-way door.
 */
async function reproject(
  tripId: string,
  segments: Segment[],
  tripStart: string,
  userId: string,
  lib: Record<BaseId, Base> = BASES,
) {
  // The crew's own saves are part of the plan, not a separate tray the plan
  // ignores: a curated route used to place 33 of its own stops and none of
  // the twelve someone had saved for the trip.
  const [saveRows, removed] = await Promise.all([
    db
      .select({
        id: savedPlaces.id,
        name: savedPlaces.placeName,
        lat: savedPlaces.lat,
        lng: savedPlaces.lng,
        category: savedPlaces.category,
        rating: savedPlaces.rating,
      })
      .from(savedPlaces)
      .where(eq(savedPlaces.tripId, tripId)),
    db
      .select({ title: tripRemovedStops.title })
      .from(tripRemovedStops)
      .where(eq(tripRemovedStops.tripId, tripId)),
  ]);
  const gone = new Set(removed.map((r) => r.title));

  // Anything already on this trip that this projection does not own stays
  // put, and must not be offered again — otherwise a reshape duplicates it
  // alongside the curated original.
  //
  // This used to look only at `provider = "chosen"`, which was right for
  // trips built by this system and wrong for every trip that predates it.
  // Older stops are "manual" or "google", so someone who had typed "Eiffel
  // Tower" in by hand and then adopted a curated Paris route got it twice,
  // on two different days, with no way to tell which was theirs.
  //
  // `package` rows are deliberately excluded: this projection replaces
  // those, and treating them as untouchable would suppress the entire
  // curated corpus on the second re-projection and hand back an empty plan.
  const kept = await db
    .select({ title: itineraryItems.title })
    .from(itineraryItems)
    .where(and(eq(itineraryItems.tripId, tripId), sql`${itineraryItems.provider} is distinct from 'package'`));
  for (const k of kept) gone.add(k.title);

  const days = projectDays(segments, lib, tripStart, saveRows as SaveForPlan[]);

  // What Google already knows about these places. A cache read only — the
  // refresh below runs after the plan is written, so a slow or missing
  // Places API can never hold up someone's edit.
  const namesOnPlan = days.flatMap((d) => d.places.map((p) => p.name));
  const facts = await factsFor(namesOnPlan).catch(() => new Map());

  const rows: (typeof itineraryItems.$inferInsert)[] = [];
  for (const day of days) {
    day.places
      .filter((p) => !gone.has(p.name))
      .forEach((p, idx) => {
        rows.push({
          tripId,
          dayDate: day.date,
          title: p.name,
          // The app is Arabic-first and this wrote English only, so the whole
          // curated Arabic corpus never reached a screen.
          titleAr: p.nameAr || null,
          // The curated category was thrown away here, so every meal in
          // every plan was filed as "Activity" — a tester counted seven
          // eating stops across twelve nights and the app knew none of them
          // were food.
          type: p.leg ? "transport" : p.category === "food" ? "meal" : "activity",
          startTime: p.startTime ?? null,
          locationName: p.name,
          // Real, hand-checked coordinates. Curated stops used to ship with
          // none, and a "helpful" fallback geocoded them by name against the
          // whole country and saved the answer — putting the Grand Bazaar in
          // Marmaris. A place we can't confirm gets no pin, which is honest.
          locationLat: coordsFor(p.name)?.[0] ?? null,
          locationLng: coordsFor(p.name)?.[1] ?? null,
          // "For a country I've never seen, that is the whole problem in
          // one sentence" — a tester, on a 36-stop plan with no pictures.
          photoUrl: photoFor(p.name),
          notes: p.why || null,
          topTip: p.why || null,
          topTipAr: p.whyAr || null,
          // Google's, or a save's. Never ours. `facts` is a cache read —
          // no network on this path.
          rating: facts.get(p.name)?.rating ?? p.savedRating ?? null,
          ratingCount: facts.get(p.name)?.ratingCount ?? null,
          priceLevel: p.priceBand ?? null,
          provider: "package",
          baseId: day.baseId,
          status: "confirmed",
          sortOrder: idx,
          createdBy: userId,
        });
      });
  }

  await db.transaction(async (tx) => {
    await lockTrip(tx, tripId);
    const gone = await tx
      .delete(itineraryItems)
      .where(and(eq(itineraryItems.tripId, tripId), eq(itineraryItems.provider, "package")))
      .returning({ id: itineraryItems.id });
    const ids = gone.map((g) => g.id);
    if (ids.length) {
      await tx
        .update(savedPlaces)
        .set({ status: "saved", itemId: null })
        .where(and(eq(savedPlaces.tripId, tripId), inArray(savedPlaces.itemId, ids)));
    }
    if (rows.length) await tx.insert(itineraryItems).values(rows);
    // A save that is now in the plan must stop saying it's waiting.
    const placed = new Set(rows.map((r) => r.title));
    for (const sv of saveRows) {
      const inPlan = placed.has(sv.name);
      await tx
        .update(savedPlaces)
        .set({ status: inPlan ? "planned" : "saved" })
        .where(eq(savedPlaces.id, sv.id));
    }
  });

  // A stop outside the trip's dates exists in the database and nowhere in
  // the app. Shortening a trip used to strand the places someone had chosen
  // just past the new end — so they are pulled back onto the last day
  // rather than quietly disappearing.
  const first = days[0]?.date;
  const last = days[days.length - 1]?.date;
  if (first && last) {
    await db
      .update(itineraryItems)
      .set({ dayDate: last })
      .where(and(eq(itineraryItems.tripId, tripId), gt(itineraryItems.dayDate, last)));
    await db
      .update(itineraryItems)
      .set({ dayDate: first })
      .where(and(eq(itineraryItems.tripId, tripId), lt(itineraryItems.dayDate, first)));
  }

  // Inside the trip's dates is not good enough: a stop has to be inside its
  // OWN city's dates.
  //
  // Reversing Lisbon → Porto leaves both cities' dates valid, so the guard
  // above sees nothing wrong — but a restaurant someone chose in Lisbon
  // stayed on 8 October, which after the reversal belongs to Porto. The
  // plan then showed a Lisbon dinner among four Porto sights, on a day it
  // also labelled Porto. Anything the crew chose is pulled back onto a day
  // of the city it actually belongs to.
  // Arrival and departure days are deliberately thin — an afternoon and a
  // morning — so a re-homed stop goes onto a full day of that city where
  // one exists, rather than being dropped onto the morning you fly out.
  const spanOf = new Map<BaseId, string[]>();
  for (const d of days) {
    const list = spanOf.get(d.baseId) ?? [];
    if (!d.departure && !d.travel) list.push(d.date);
    spanOf.set(d.baseId, list);
  }
  const anyDayOf = new Map<BaseId, string[]>();
  for (const d of days) {
    const list = anyDayOf.get(d.baseId) ?? [];
    list.push(d.date);
    anyDayOf.set(d.baseId, list);
  }
  const stranded = await db
    .select({ id: itineraryItems.id, dayDate: itineraryItems.dayDate, baseId: itineraryItems.baseId })
    .from(itineraryItems)
    .where(eq(itineraryItems.tripId, tripId));
  for (const row of stranded) {
    if (!row.baseId) continue;
    const all = anyDayOf.get(row.baseId);

    // The city left the trip altogether.
    //
    // Nothing was repairing this, so the stop simply stayed — keeping its
    // old `base_id`, drifting onto whatever date the trip now ended on. A
    // tester shrank a trip down to Tokyo and the plan went on recommending
    // Kuromon Ichiba Market, an Osaka fish market four hundred kilometres
    // away, on his last Tokyo morning. Surviving is good; surviving
    // mislabelled inside another city's day is worse than being dropped,
    // because the app renders it as local content.
    //
    // So it goes back to the saves tray rather than the bin: out of a plan
    // it no longer belongs to, still there if the city comes back.
    if (!all?.length) {
      await db.delete(itineraryItems).where(eq(itineraryItems.id, row.id));
      await db
        .update(savedPlaces)
        .set({ status: "saved", itemId: null })
        .where(and(eq(savedPlaces.tripId, tripId), eq(savedPlaces.itemId, row.id)));
      continue;
    }

    if (all.includes(String(row.dayDate))) continue;
    const span = spanOf.get(row.baseId);
    // A full day of that city if it has one, else whatever it has.
    const target = span?.length ? span[span.length - 1] : all[all.length - 1];
    await db.update(itineraryItems).set({ dayDate: target }).where(eq(itineraryItems.id, row.id));
  }

  // Then, off the critical path, ask Google about anything we have never
  // looked up. Deliberately after the write and deliberately not awaited on
  // the user's behalf: a plan must save at the same speed with or without a
  // Places key, and the facts simply appear on the next render.
  void (async () => {
    try {
      const todo = await staleNames(namesOnPlan);
      for (const n of todo.slice(0, 40)) {
        const configured = await refreshFact(n);
        // No key: stop rather than fail forty more times in a row.
        if (!configured) break;
      }
    } catch {
      // Enrichment is a bonus; never let it surface as a failed edit.
    }
  })();

  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/shape`);
  return rows.length;
}

async function persist(tripId: string, segments: Segment[], tripStart: string, userId: string) {
  const lib: Record<BaseId, Base> = { ...BASES };
  for (const sg of segments) {
    if (lib[sg.baseId]) continue;
    const name = sg.customName ?? sg.baseId.replace(/^custom:/, "");
    lib[sg.baseId] = {
      id: sg.baseId, name, nameAr: sg.customNameAr || name, country: "",
      lat: sg.customLat ?? 0, lng: sg.customLng ?? 0, photoQuery: name,
      coordsUnknown: sg.customLat == null || sg.customLng == null,
      match: [name.toLowerCase()], typicalNights: 1, maxNights: 60,
      reachable: [], pairsWith: [], days: [],
    };
  }
  const fresh = relink(redate(segments, tripStart), lib);

  // A gateway must never point at a city the trip no longer visits.
  //
  // Every path that rewrites the shape ends here — adopting a route,
  // starting blank, any edit, a date change that drops a stay — so this is
  // the one place the guarantee can actually hold. Enforcing it at each
  // call site is how the grid and the shape drifted apart the last time.
  // Clearing hands that end back to the shape, which is always true.
  const here = new Set(fresh.map((s) => s.baseId));
  const ends = await db
    .select({ arrive: trips.arriveBaseId, depart: trips.departBaseId })
    .from(trips)
    .where(eq(trips.id, tripId));
  const clear: { arriveBaseId?: null; departBaseId?: null } = {};
  if (ends[0]?.arrive && !here.has(ends[0].arrive)) clear.arriveBaseId = null;
  if (ends[0]?.depart && !here.has(ends[0].depart)) clear.departBaseId = null;

  await db.transaction(async (tx) => {
    await lockTrip(tx, tripId);
    if (Object.keys(clear).length) await tx.update(trips).set(clear).where(eq(trips.id, tripId));
    await tx.delete(tripSegments).where(eq(tripSegments.tripId, tripId));
    if (fresh.length) {
      await tx.insert(tripSegments).values(
        fresh.map((s) => ({
          tripId,
          baseId: s.baseId,
          sortOrder: s.order,
          checkIn: s.checkIn,
          checkOut: s.checkOut,
          transportInMode: s.transportInMode,
          transportInMinutes: s.transportInMinutes,
          dayTrips: s.dayTrips,
          lockedBy: s.lockedBy,
          customName: s.customName ?? null,
          customNameAr: s.customNameAr ?? null,
          customLat: s.customLat ?? null,
          customLng: s.customLng ?? null,
          updatedAt: new Date(),
        })),
      );
    }
  });
  await reproject(tripId, fresh, tripStart, userId, lib);
  return fresh;
}

/** The tap that adopts. No draft, no confirmation step. */
export async function adoptRoute(tripId: string, routeId: string) {
  const user = await requireOwner(tripId);
  const trip = await getTrip(tripId);
  const route = ROUTES.find((r) => r.id === routeId);
  if (!route) throw new Error("Unknown route");

  const nights = tripNightsBetween(trip.startDate, trip.endDate);
  if (nights < 1) throw new Error("Trip is too short to plan");
  const alloc = allocateNights(route, BASES, nights);
  if (!alloc.legs.length) throw new Error("Nothing to plan");

  // If the trip already knows which city it flies into and out of — set on
  // a previous shape, then re-adopted — walk the route in whichever
  // direction honours that. Lisbon → Porto and Porto → Lisbon are the same
  // curated content; only one of them matches your tickets.
  const ordered = orderForGateways(
    alloc.legs,
    (l) => l.baseId,
    trip.arriveBaseId,
    trip.departBaseId,
  );
  // Reversing invalidates every curated transport leg — the train that
  // brought you INTO Porto is not the train out of it. `relink` re-derives
  // them from real distance, and the first leg must carry none at all.
  const legs = ordered.reversed
    ? ordered.items.map((l, i) => ({
        ...l,
        transportInMode: i === 0 ? null : l.transportInMode,
        transportInMinutes: null,
      }))
    : ordered.items;

  const segments = segmentsFromLegs(legs, trip.startDate);
  await persist(tripId, segments, trip.startDate, user.id);
  return {
    bases: alloc.legs.length,
    dropped: alloc.dropped.map((d) => BASES[d]?.name ?? d),
    droppedAr: alloc.dropped.map((d) => BASES[d]?.nameAr ?? d),
    overflow: alloc.overflow,
    /** the route was walked backwards to match the flights — say so */
    reversed: ordered.reversed,
  };
}

/**
 * Start from nothing — one base, the destination itself, all the nights.
 *
 * Works for a destination we have never heard of: a tester typed "Lisbon",
 * got no routes, and the only door offered was Discover — which cannot
 * build a plan. Now every destination can have a shape, curated or not.
 */
export async function startBlankShape(
  tripId: string,
  baseId: string | null,
  custom?: { name: string; lat?: number | null; lng?: number | null },
) {
  const user = await requireOwner(tripId);
  const trip = await getTrip(tripId);
  // A same-day trip really does have zero nights, and forcing one made the
  // only segment end a day after the trip did — the exact drift every other
  // rule here exists to prevent.
  const nights = tripNightsBetween(trip.startDate, trip.endDate);

  const base = baseId ? getBase(baseId) : null;
  if (base) {
    const segments = segmentsFromLegs(
      [{ baseId: base.id, nights: Math.min(nights, Math.max(1, base.maxNights)), transportInMode: null, transportInMinutes: null }],
      trip.startDate,
    );
    await persist(tripId, segments, trip.startDate, user.id);
    return { bases: 1 };
  }

  const name = (custom?.name ?? trip.destination ?? trip.name ?? "").trim();
  if (!name) throw new Error("Where are you going?");
  const slug = "custom:" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  await persist(
    tripId,
    [
      {
        baseId: slug,
        order: 0,
        checkIn: trip.startDate,
        checkOut: addIso(trip.startDate, nights),
        transportInMode: null,
        transportInMinutes: null,
        dayTrips: [],
        lockedBy: null,
        customName: name,
        customNameAr: name,
        customLat: custom?.lat ?? null,
        customLng: custom?.lng ?? null,
      },
    ],
    trip.startDate,
    user.id,
  );
  return { bases: 1 };
}

const zEdit = z.discriminatedUnion("op", [
  z.object({ op: z.literal("nights"), baseId: z.string().max(60), nights: z.number().int().min(1).max(60) }),
  z.object({ op: z.literal("reorder"), order: z.array(z.string().max(60)).max(20) }),
  z.object({ op: z.literal("add"), baseId: z.string().max(60) }),
  z.object({
    op: z.literal("addCustom"),
    name: z.string().trim().min(2).max(80),
    lat: z.number().finite().min(-90).max(90).nullish(),
    lng: z.number().finite().min(-180).max(180).nullish(),
  }),
  z.object({ op: z.literal("remove"), baseId: z.string().max(60) }),
  z.object({ op: z.literal("dayTrip"), baseId: z.string().max(60), tripId: z.string().max(60), on: z.boolean() }),
  z.object({ op: z.literal("transport"), baseId: z.string().max(60), mode: z.enum(MODES) }),
  z.object({ op: z.literal("lock"), baseId: z.string().max(60), lock: z.enum(["flight", "hotel"]).nullable() }),
  /** "I land in Porto" / "I fly home from Lisbon" — null clears it back to the shape's own end */
  z.object({
    op: z.literal("gateway"),
    end: z.enum(["arrive", "depart"]),
    baseId: z.string().max(60).nullable(),
  }),
  /** the other repair for a mismatch: move the shape to match the flights */
  z.object({ op: z.literal("alignGateways") }),
]);
export type ShapeEdit = z.infer<typeof zEdit>;

/**
 * One entry point for every edit, because each one has to re-date the
 * segments and re-project the days — doing that in six places is how the
 * grid and the shape drift apart.
 */
export async function editShape(tripId: string, edit: ShapeEdit) {
  const user = await requireOwner(tripId);
  const e = parseOr(zEdit, edit, "Invalid edit");
  const trip = await getTrip(tripId);

  const rows = await db
    .select()
    .from(tripSegments)
    .where(eq(tripSegments.tripId, tripId))
    .orderBy(tripSegments.sortOrder);
  let segments = rows.map(toSegment);
  if (!segments.length) throw new Error("No shape yet");

  const tripNights = tripNightsBetween(trip.startDate, trip.endDate);
  const find = (id: string) => segments.find((s) => s.baseId === id);
  /** Nights taken from an existing stay, so the UI can say so out loud. */
  const borrowedFrom: { baseId: BaseId; nights: number }[] = [];
  // Nights that LEFT this base and went somewhere else. A tester tapped
  // minus on Tokyo twice and the freed night went to Osaka the first time
  // and Kyoto the second, with no message either time — same button, two
  // answers, and no way to tell where his night had gone.
  const before = new Map(segments.map((sg) => [sg.baseId, segmentNights(sg)]));
  const orderBefore = segments.map((sg) => sg.baseId).join(">");
  /** a change the nights map can't see — setting an end, or losing one */
  let gatewayChanged = false;

  switch (e.op) {
    case "nights": {
      const seg = find(e.baseId);
      if (!seg) throw new Error("Not in this trip");
      if (seg.lockedBy) throw new Error("This stay is booked");
      // The ceiling is ADVICE, not a rule.
      //
      // It exists so the generator never claims 13 curated nights in Tokyo.
      // Applying it to the user's own stepper froze the control completely:
      // on a 9-night Portugal trip the allocator had already spent the
      // overflow night (Lisbon 6 against a max of 5), so every "+" was
      // disabled and every "−" had nowhere to send its night. "The steppers
      // are decorative. It's my holiday."
      //
      // Past the ceiling you simply get free days, and the UI says so.
      seg.checkOut = addIso(seg.checkIn, Math.max(1, e.nights));
      break;
    }
    case "reorder": {
      const pos = new Map(e.order.map((id, i) => [id, i]));
      segments.sort((a, b) => (pos.get(a.baseId) ?? 99) - (pos.get(b.baseId) ?? 99));
      segments.forEach((s, i) => (s.order = i));
      clearLegs(segments);
      break;
    }
    case "add": {
      if (find(e.baseId)) throw new Error("Already in this trip");
      const base = BASES[e.baseId];
      if (!base || base.maxNights < 1) throw new Error("Not a base you can stay in");
      if (segments.length >= 8) throw new Error("That's a lot of moving");
      const want = Math.min(base.typicalNights || 1, base.maxNights);

      // Spend the unassigned nights FIRST. A tester went to fill two empty
      // days, added Osaka, and watched Tokyo drop from 6 nights to 4 without
      // being asked — the old code always raided the longest stay even when
      // the trip had slack sitting right there.
      const assigned = segments.reduce((n, sg) => n + segmentNights(sg), 0);
      const slack = Math.max(0, tripNights - assigned);
      let got = Math.min(want, slack);

      // Only if that isn't enough do we borrow, and then we say who from.
      while (got < 1) {
        const donor = segments
          .filter((sg) => !sg.lockedBy && segmentNights(sg) > 1)
          .sort((a, b) => segmentNights(b) - segmentNights(a))[0];
        if (!donor) break;
        const take = Math.min(want - got, segmentNights(donor) - 1);
        if (take <= 0) break;
        donor.checkOut = addIso(donor.checkIn, segmentNights(donor) - take);
        borrowedFrom.push({ baseId: donor.baseId, nights: take });
        got += take;
      }
      if (got < 1) throw new Error("No nights free — shorten a stay first");

      segments.push({
        baseId: base.id,
        order: segments.length,
        checkIn: trip.startDate,
        checkOut: addIso(trip.startDate, got),
        // No fabricated duration. A flat "2h" on every added city was
        // printed as fact and was an hour adrift of the real Lisbon–Porto
        // train; `relink` estimates from actual distance instead.
        transportInMode: null,
        transportInMinutes: null,
        dayTrips: [],
        lockedBy: null,
      });
      break;
    }
    case "addCustom": {
      // Any city, curated or not. "Add a base" could only ever offer cities
      // that pair with a curated route, so on a trip we do not curate there
      // was nothing to offer and no way to type your own.
      const slug = "custom:" + e.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
      if (!slug.replace("custom:", "")) throw new Error("Give the city a name");
      if (segments.some((sg) => sg.baseId === slug)) throw new Error("Already in this trip");
      if (segments.length >= 8) throw new Error("That's a lot of moving");

      const assignedNow = segments.reduce((n, sg) => n + segmentNights(sg), 0);
      const slack = Math.max(0, tripNights - assignedNow);
      let got = Math.min(2, slack);
      while (got < 1) {
        const donor = segments
          .filter((sg) => !sg.lockedBy && segmentNights(sg) > 1)
          .sort((a, b) => segmentNights(b) - segmentNights(a))[0];
        if (!donor) break;
        donor.checkOut = addIso(donor.checkIn, segmentNights(donor) - 1);
        borrowedFrom.push({ baseId: donor.baseId, nights: 1 });
        got += 1;
      }
      if (got < 1) throw new Error("No nights free — shorten a stay first");

      segments.push({
        baseId: slug,
        order: segments.length,
        checkIn: trip.startDate,
        checkOut: addIso(trip.startDate, got),
        // No fabricated duration. A flat "2h" on every added city was
        // printed as fact and was an hour adrift of the real Lisbon–Porto
        // train; `relink` estimates from actual distance instead.
        transportInMode: null,
        transportInMinutes: null,
        dayTrips: [],
        lockedBy: null,
        customName: e.name,
        customNameAr: e.name,
        customLat: e.lat ?? null,
        customLng: e.lng ?? null,
      });
      break;
    }
    case "remove": {
      const seg = find(e.baseId);
      if (!seg) throw new Error("Not in this trip");
      if (seg.lockedBy) throw new Error("This stay is booked");
      if (segments.length <= 1) throw new Error("A trip needs somewhere to sleep");
      const freed = segmentNights(seg);
      segments = segments.filter((s) => s.baseId !== e.baseId);
      // Give the nights back rather than shortening the trip.
      const taker = segments.find((s) => !s.lockedBy) ?? segments[0];
      const base = BASES[taker.baseId];
      const room = Math.max(0, (base?.maxNights ?? 99) - segmentNights(taker));
      taker.checkOut = addIso(taker.checkIn, segmentNights(taker) + Math.min(freed, room));
      // Whatever followed the removed city is now reached from somewhere
      // else. Dropping Kyoto from Tokyo → Kyoto → Osaka left Osaka still
      // advertising the 15-minute Kyoto train as the way in from Tokyo,
      // four hundred kilometres away. Same bug the reorder path already
      // guards against; this path never got the guard.
      clearLegs(segments);
      break;
    }
    case "dayTrip": {
      const seg = find(e.baseId);
      if (!seg) throw new Error("Not in this trip");
      const target = BASES[e.tripId];
      if (!target) throw new Error("Unknown place");
      if (e.on) {
        if (!BASES[seg.baseId]?.reachable.includes(e.tripId)) throw new Error("Too far for a day trip");
        if (seg.dayTrips.length >= segmentNights(seg) - 1) throw new Error("Not enough days here");
        if (!seg.dayTrips.includes(e.tripId)) seg.dayTrips.push(e.tripId);
      } else {
        seg.dayTrips = seg.dayTrips.filter((t) => t !== e.tripId);
      }
      break;
    }
    case "transport": {
      const seg = find(e.baseId);
      if (!seg) throw new Error("Not in this trip");
      seg.transportInMode = e.mode;
      break;
    }
    case "lock": {
      const seg = find(e.baseId);
      if (!seg) throw new Error("Not in this trip");
      seg.lockedBy = e.lock;
      break;
    }
    case "gateway": {
      // You can only fly into a city the trip actually visits. Allowing a
      // free-floating airport would put a city on the booking checklist
      // that appears nowhere in the plan.
      if (e.baseId && !find(e.baseId)) throw new Error("Add that city to the trip first");
      await db
        .update(trips)
        .set(e.end === "arrive" ? { arriveBaseId: e.baseId } : { departBaseId: e.baseId })
        .where(eq(trips.id, tripId));
      gatewayChanged = true;
      break;
    }
    case "alignGateways": {
      // The other half of the repair. A mismatch offers two honest fixes —
      // change the flights, or move the trip — and this is the second. It
      // reverses rather than rotates, because a chain that starts in the
      // middle is a plan that doubles back.
      const ord = orderForGateways(
        segments,
        (s) => s.baseId,
        trip.arriveBaseId,
        trip.departBaseId,
      );
      // Already pointing the right way is success, not failure. Two people
      // on the same shape screen both tapping the repair had the loser told
      // "Reordering can't reach those two ends" about a trip that was, by
      // then, correctly ordered.
      const g0 = gatewayState(segments, trip.arriveBaseId, trip.departBaseId);
      if (!ord.reversed && (g0.arriveMismatch || g0.departMismatch)) {
        throw new Error("Reordering can't reach those two ends");
      }
      segments = ord.items;
      segments.forEach((s, i) => (s.order = i));
      clearLegs(segments);
      break;
    }
  }

  // The trip length is fixed by its dates; the shape must always cover it
  // exactly. This is the one rule the whole screen rests on, so it lives in
  // a pure function a test can hammer — see fitToTrip.
  const fitted = fitToTrip(segments, tripNights, trip.startDate, e.op === "nights" ? e.baseId : null);
  segments = fitted.segments;
  const dropped = fitted.dropped;

  // Did anything actually change? A minus that silently reverts — because
  // every other city is already at its useful maximum, so the freed night
  // has nowhere to go — reads as a frozen screen. Say what is really
  // blocking it, and point at the fix.
  const unchanged =
    !gatewayChanged &&
    // A reorder moves no nights at all, so counting only nights called every
    // drag a no-op and told the user nothing had happened.
    segments.map((sg) => sg.baseId).join(">") === orderBefore &&
    segments.length === before.size &&
    segments.every((sg) => before.get(sg.baseId) === segmentNights(sg));

  const saved = await persist(tripId, segments, trip.startDate, user.id);

  // Report the OTHER side of the trade. Pressing "+" on Lisbon and being
  // told "the night went to Lisbon" says nothing you didn't just do; what
  // you want to know is which stay paid for it.
  const touched = e.op === "nights" ? e.baseId : null;
  // A custom city's real name is sitting in its own row; the slug is
  // lowercased and hyphenated for URLs. "The night went to coimbra".
  const customName = new Map(
    rows.filter((r) => r.customName).map((r) => [r.baseId, r.customName as string]),
  );
  const label = (id: BaseId) => {
    const typed = customName.get(id) ?? id.replace(/^custom:/, "");
    return {
      name: BASES[id]?.name ?? typed,
      nameAr: BASES[id]?.nameAr ?? typed,
    };
  };
  const deltas = saved
    .map((sg) => ({ baseId: sg.baseId, delta: segmentNights(sg) - (before.get(sg.baseId) ?? 0) }))
    .filter((x) => before.has(x.baseId) && x.delta !== 0 && x.baseId !== touched);
  const gave = deltas.filter((x) => x.delta < 0).map((x) => ({ ...label(x.baseId), nights: -x.delta }));
  const got = deltas.filter((x) => x.delta > 0).map((x) => ({ ...label(x.baseId), nights: x.delta }));
  const movedTo = got;
  const takenFrom = gave;

  return {
    ok: true,
    /** nothing moved — the UI must explain why rather than look broken */
    noop: unchanged,
    /** stays that gave nights up, for the other half of the sentence */
    takenFrom,
    borrowedFrom: borrowedFrom.map((b) => ({
      name: BASES[b.baseId]?.name ?? b.baseId,
      nameAr: BASES[b.baseId]?.nameAr ?? b.baseId,
      nights: b.nights,
    })),
    movedTo,
    /**
     * Cities the shape had to give up to fit the trip's dates. Losing a
     * whole stay in silence is how someone discovers on the day that Porto
     * left their holiday.
     */
    dropped: dropped.map(label),
  };
}

export async function reactToBase(tripId: string, baseId: string, reaction: "love" | "ok" | "skip") {
  const { user } = await requireMember(tripId);
  await db
    .delete(segmentReactions)
    .where(
      and(
        eq(segmentReactions.tripId, tripId),
        eq(segmentReactions.baseId, baseId),
        eq(segmentReactions.userId, user.id),
      ),
    );
  await db.insert(segmentReactions).values({ tripId, baseId, userId: user.id, reaction });
  revalidatePath(`/trips/${tripId}/shape`);
}

/**
 * Forget every inbound leg, so `relink` re-derives them all.
 *
 * Reordering changes what each leg IS, not just where it sits. Reversing
 * Lisbon -> Coimbra -> Porto leaves Coimbra still advertising the 90-minute
 * Lisbon train while it is now reached from Porto: a real duration for a
 * journey nobody is taking, which is the same class of lie as the flat "2h"
 * we removed. Only a leg whose two endpoints are unchanged may be kept, and
 * after a reorder that is none of them.
 */
function clearLegs(segments: Segment[]) {
  for (const s of segments) {
    s.transportInMode = null;
    s.transportInMinutes = null;
  }
}

function addIso(iso: string, n: number): string {
  const t = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/* ── one-tap day pacing ───────────────────────────────────────────────── */

/**
 * Make one day lighter.
 *
 * Reported: "It never stops, and it doesn't move anything — it deletes."
 * A friendly-sounding button with no warning and no undo was silently
 * destroying real places, and it chose badly — asked to lighten a Kyoto
 * day it removed two walks minutes from Kiyomizu-dera and KEPT the two
 * stops out in Uji, a train ride away.
 *
 * So two changes. It drops the stop that makes the day SPRAWL — the one
 * furthest from everything else — because that is what actually makes a
 * day heavy. And it MOVES that stop to a free day in the same city when
 * there is one, rather than throwing it away; only with nowhere to put it
 * does it remove, and then it says so and can be undone.
 */
export async function lightenDay(tripId: string, dayDate: string) {
  const user = await requireOwner(tripId);
  const day = parseOr(zDateOnly, dayDate, "Invalid day");

  const all = await db
    .select()
    .from(itineraryItems)
    .where(and(eq(itineraryItems.tripId, tripId), eq(itineraryItems.provider, "package")));
  const rows = all.filter((r) => r.dayDate === day);
  if (rows.length <= 1) throw new Error("Nothing left to drop here");

  // The outlier: furthest from the day's centre of gravity. Falls back to
  // the lowest rated when we have no coordinates to reason with.
  const geo = rows.filter((r) => r.locationLat != null && r.locationLng != null);
  let victim = rows[0];
  if (geo.length >= 3) {
    const cx = geo.reduce((n, r) => n + r.locationLat!, 0) / geo.length;
    const cy = geo.reduce((n, r) => n + r.locationLng!, 0) / geo.length;
    victim = geo.reduce((a, b) => {
      const d = (r: typeof a) => (r.locationLat! - cx) ** 2 + (r.locationLng! - cy) ** 2;
      return d(b) > d(a) ? b : a;
    });
  } else {
    // No coordinates to reason with, and no honest score to rank by, so
    // drop the last stop of the day — the evening extra is what someone
    // asking for a lighter day actually wants back.
    victim = rows[rows.length - 1];
  }

  // Somewhere else in this city with room? Move it rather than bin it.
  const sameBase = victim.baseId
    ? all.filter((r) => r.baseId === victim.baseId).map((r) => r.dayDate)
    : [];
  const counts = new Map<string, number>();
  for (const d of sameBase) counts.set(d, (counts.get(d) ?? 0) + 1);
  // Not onto the arrival day — that one is deliberately light because you
  // spent the morning on a train.
  const arrival = [...sameBase].sort()[0];
  const target = [...new Set(sameBase)]
    .filter((d) => d !== day && d !== arrival)
    .sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0];
  // Room enough if the target day would still be no busier than this one
  // ENDS UP — this day loses a stop, so compare against `rows.length - 1`
  // inclusively. The strict `<` meant a 4-stop day could only ever move
  // onto a day of 2 or fewer; with curated days almost always 3 or 4, the
  // move branch was unreachable in real data and "make it lighter"
  // quietly went back to being the delete button it was fixed for.
  const roomy = target && (counts.get(target) ?? 0) <= rows.length - 1;

  if (roomy) {
    await db
      .update(itineraryItems)
      .set({ dayDate: target, startTime: null, sortOrder: counts.get(target) ?? 0 })
      .where(eq(itineraryItems.id, victim.id));
    revalidatePath(`/trips/${tripId}/itinerary`);
    return {
      moved: true as const,
      to: target,
      removed: victim.title,
      removedAr: victim.titleAr ?? victim.title,
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(tripRemovedStops)
      .values({ tripId, title: victim.title, baseId: victim.baseId ?? null, removedBy: user.id })
      .onConflictDoNothing();
    await tx.delete(itineraryItems).where(eq(itineraryItems.id, victim.id));
  });

  revalidatePath(`/trips/${tripId}/itinerary`);
  return {
    moved: false as const,
    to: null,
    removed: victim.title,
    removedAr: victim.titleAr ?? victim.title,
  };
}

/** Put back one stop that «خفّف» removed. */
export async function undoLighten(tripId: string, title: string) {
  const user = await requireOwner(tripId);
  await db
    .delete(tripRemovedStops)
    .where(and(eq(tripRemovedStops.tripId, tripId), eq(tripRemovedStops.title, title)));
  const trip = await getTrip(tripId);
  const rows = await db
    .select()
    .from(tripSegments)
    .where(eq(tripSegments.tripId, tripId))
    .orderBy(tripSegments.sortOrder);
  if (rows.length) {
    await reproject(tripId, relink(redate(rows.map(toSegment), trip.startDate), BASES), trip.startDate, user.id);
  }
  return { ok: true };
}

/** Undo every «خفّف» on a day — the stops come back on the next rebuild. */
export async function restoreDay(tripId: string, dayDate: string) {
  const user = await requireOwner(tripId);
  const day = parseOr(zDateOnly, dayDate, "Invalid day");
  const seg = await db
    .select()
    .from(tripSegments)
    .where(eq(tripSegments.tripId, tripId))
    .orderBy(tripSegments.sortOrder);
  if (!seg.length) throw new Error("No shape yet");

  await db.delete(tripRemovedStops).where(eq(tripRemovedStops.tripId, tripId));
  const trip = await getTrip(tripId);
  await reproject(tripId, relink(redate(seg.map(toSegment), trip.startDate), BASES), trip.startDate, user.id);
  return { day };
}

/** How many stops this day has lost, so the UI can offer to put them back. */
export async function removedCount(tripId: string) {
  await requireMember(tripId);
  const rows = await db
    .select({ title: tripRemovedStops.title })
    .from(tripRemovedStops)
    .where(eq(tripRemovedStops.tripId, tripId));
  return rows.length;
}


/**
 * Re-fit the shape to the trip's dates.
 *
 * Changing a trip's dates used to leave the shape where it was: a tester
 * pulled the end date back by 18 days and the last stay still ran four days
 * PAST the new end, with nine itinerary rows stranded beyond it — present in
 * the database, invisible in the app. Moving the START date was worse: the
 * screen rendered dates from the trip while the stored segments kept the old
 * ones, so the two disagreed by four days on every row and day one showed
 * the wrong city.
 *
 * So dates are the trip's, always, and the shape is re-dated and re-fitted
 * to them whenever they move.
 */
export async function refitShapeToTrip(tripId: string): Promise<{ dropped: string[] }> {
  const user = await getCurrentUser();
  if (!user) return { dropped: [] };
  const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
  if (!trip) return { dropped: [] };

  const rows = await db
    .select()
    .from(tripSegments)
    .where(eq(tripSegments.tripId, tripId))
    .orderBy(tripSegments.sortOrder);
  if (!rows.length) return { dropped: [] };

  let segments = redate(rows.map(toSegment), trip.startDate);
  const want = tripNightsBetween(trip.startDate, trip.endDate);
  if (want <= 0) return { dropped: [] };

  // Shortening a trip drops whole stays. A tester pulled his end date back
  // three days and Porto vanished — the city, the hotel, the train and
  // three days of content — with no warning and no undo. It still has to
  // happen, but it must be reported.
  const dropped: string[] = [];

  // Trim from the tail when the trip shrank; drop whole stays that no
  // longer fit rather than leaving them hanging past the end.
  let total = segments.reduce((n, sg) => n + segmentNights(sg), 0);
  while (total > want && segments.length) {
    const last = segments[segments.length - 1];
    const n = segmentNights(last);
    if (n > 1 && total - 1 >= segments.length) {
      last.checkOut = addIso(last.checkIn, n - 1);
      total -= 1;
    } else {
      const gone = segments.pop()!;
      dropped.push(BASES[gone.baseId]?.name ?? gone.customName ?? gone.baseId.replace(/^custom:/, ""));
      total -= n;
    }
    segments = redate(segments, trip.startDate);
  }
  // Grow the tail when it lengthened, so the whole trip still has a base.
  if (total < want && segments.length) {
    const last = segments[segments.length - 1];
    last.checkOut = addIso(last.checkIn, segmentNights(last) + (want - total));
  }

  await persist(tripId, redate(segments, trip.startDate), trip.startDate, user.id);
  return { dropped };
}
