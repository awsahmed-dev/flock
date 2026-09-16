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
import { and, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseOr, zDateOnly } from "@/lib/actions/validate";
import { BASES, ROUTES, findRoutes, getBase } from "@/lib/packages/library";
import { coordsFor } from "@/lib/packages/coords";
import type { Base, BaseId, ProjectedDay, Segment, TransportMode } from "@/lib/packages/types";
import { allocateNights, routeCapacity, tripNightsBetween } from "@/lib/packages/allocate";
import { segmentsFromLegs, projectDays, redate, relink, segmentNights, errandsFor, type SaveForPlan } from "@/lib/packages/project";

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
  overflow: number;
  capacity: number;
}

export interface ShapeView {
  tripNights: number;
  tripStart: string;
  tripEnd: string;
  bases: BaseCard[];
  addable: { id: BaseId; name: string; nameAr: string; typicalNights: number }[];
  days: ProjectedDay[];
  errands: { kind: string; baseId: BaseId; name: string; nameAr: string; nights?: number; mode?: string; done: boolean }[];
  isOwner: boolean;
  memberCount: number;
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
  };
}

/** Routes for this trip's destination, each pre-scaled to its real length. */
export async function listRoutes(tripId: string): Promise<RouteCard[]> {
  await requireMember(tripId);
  const trip = await getTrip(tripId);
  const nights = tripNightsBetween(trip.startDate, trip.endDate);
  const matches = findRoutes(`${trip.destination ?? ""} ${trip.name ?? ""}`);
  return matches.map((route) => {
    const a = allocateNights(route, BASES, nights);
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
      chain: a.legs.map((l) => ({
        name: BASES[l.baseId].name,
        nameAr: BASES[l.baseId].nameAr,
        nights: l.nights,
      })),
      dropped: a.dropped.map((d) => BASES[d]?.nameAr ?? d),
      overflow: a.overflow,
      capacity: routeCapacity(route, BASES),
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

  const segments = relink(redate(rows.map(toSegment), trip.startDate), BASES);
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
    .filter((b) => segments.some((s) => BASES[s.baseId]?.pairsWith.includes(b.id)))
    .map((b) => ({ id: b.id, name: b.name, nameAr: b.nameAr, typicalNights: b.typicalNights }));

  const bases: BaseCard[] = segments.map((s) => {
    const b = BASES[s.baseId];
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
        .filter((r) => BASES[r] && !s.dayTrips.includes(r))
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

  const days = projectDays(segments, BASES, trip.startDate);
  const errands = errandsFor(segments).map((e) => ({
    ...e,
    name: BASES[e.baseId]?.name ?? e.baseId,
    nameAr: BASES[e.baseId]?.nameAr ?? e.baseId,
  }));

  return {
    tripNights: tripNightsBetween(trip.startDate, trip.endDate),
    tripStart: trip.startDate,
    tripEnd: trip.endDate,
    bases,
    addable,
    days,
    errands,
    isOwner: role === "owner",
    memberCount: members.length,
  };
}

/* ── writing ──────────────────────────────────────────────────────────── */

/**
 * Write the projected days into the itinerary. Only rows this feature owns
 * (`provider = "package"`) are replaced — anything the crew added by hand or
 * from Discover survives untouched, which is what lets the shape stay
 * editable after adoption instead of being a one-way door.
 */
async function reproject(tripId: string, segments: Segment[], tripStart: string, userId: string) {
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

  const days = projectDays(segments, BASES, tripStart, saveRows as SaveForPlan[]);
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
          type: "activity",
          startTime: p.startTime ?? null,
          locationName: p.name,
          // Real, hand-checked coordinates. Curated stops used to ship with
          // none, and a "helpful" fallback geocoded them by name against the
          // whole country and saved the answer — putting the Grand Bazaar in
          // Marmaris. A place we can't confirm gets no pin, which is honest.
          locationLat: coordsFor(p.name)?.[0] ?? null,
          locationLng: coordsFor(p.name)?.[1] ?? null,
          notes: p.why || null,
          topTip: p.why || null,
          topTipAr: p.whyAr || null,
          rating: p.rating ?? null,
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

  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/shape`);
  return rows.length;
}

async function persist(tripId: string, segments: Segment[], tripStart: string, userId: string) {
  const fresh = relink(redate(segments, tripStart), BASES);
  await db.transaction(async (tx) => {
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
          updatedAt: new Date(),
        })),
      );
    }
  });
  await reproject(tripId, fresh, tripStart, userId);
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

  const segments = segmentsFromLegs(alloc.legs, trip.startDate);
  await persist(tripId, segments, trip.startDate, user.id);
  return {
    bases: alloc.legs.length,
    dropped: alloc.dropped.map((d) => BASES[d]?.nameAr ?? d),
    overflow: alloc.overflow,
  };
}

/** Start from nothing — one base, the destination itself, all the nights. */
export async function startBlankShape(tripId: string, baseId: string) {
  const user = await requireOwner(tripId);
  const trip = await getTrip(tripId);
  const base = getBase(baseId);
  if (!base) throw new Error("Unknown base");
  const nights = Math.max(1, tripNightsBetween(trip.startDate, trip.endDate));
  const segments = segmentsFromLegs(
    [{ baseId: base.id, nights: Math.min(nights, Math.max(1, base.maxNights)), transportInMode: null, transportInMinutes: null }],
    trip.startDate,
  );
  await persist(tripId, segments, trip.startDate, user.id);
  return { bases: 1 };
}

const zEdit = z.discriminatedUnion("op", [
  z.object({ op: z.literal("nights"), baseId: z.string().max(60), nights: z.number().int().min(1).max(60) }),
  z.object({ op: z.literal("reorder"), order: z.array(z.string().max(60)).max(20) }),
  z.object({ op: z.literal("add"), baseId: z.string().max(60) }),
  z.object({ op: z.literal("remove"), baseId: z.string().max(60) }),
  z.object({ op: z.literal("dayTrip"), baseId: z.string().max(60), tripId: z.string().max(60), on: z.boolean() }),
  z.object({ op: z.literal("transport"), baseId: z.string().max(60), mode: z.enum(MODES) }),
  z.object({ op: z.literal("lock"), baseId: z.string().max(60), lock: z.enum(["flight", "hotel"]).nullable() }),
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

  switch (e.op) {
    case "nights": {
      const seg = find(e.baseId);
      if (!seg) throw new Error("Not in this trip");
      if (seg.lockedBy) throw new Error("This stay is booked");
      const base = BASES[seg.baseId];
      // The ceiling is the whole reason "13 nights in Tokyo" can't happen.
      const n = Math.min(e.nights, Math.max(1, base?.maxNights ?? 1));
      seg.checkOut = addIso(seg.checkIn, n);
      break;
    }
    case "reorder": {
      const pos = new Map(e.order.map((id, i) => [id, i]));
      segments.sort((a, b) => (pos.get(a.baseId) ?? 99) - (pos.get(b.baseId) ?? 99));
      segments.forEach((s, i) => (s.order = i));
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
        transportInMode: "train",
        transportInMinutes: 120,
        dayTrips: [],
        lockedBy: null,
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
  }

  // The trip length is fixed by its dates; the shape must always cover it
  // exactly. Absorb any drift into the last unlocked stay.
  segments = redate(segments, trip.startDate);
  const total = segments.reduce((n, s) => n + segmentNights(s), 0);
  if (total !== tripNights && segments.length) {
    const diff = tripNights - total;
    const flex = [...segments].reverse().find((s) => {
      if (s.lockedBy) return false;
      const b = BASES[s.baseId];
      return diff > 0 ? segmentNights(s) + diff <= (b?.maxNights ?? 99) : segmentNights(s) + diff >= 1;
    });
    if (flex) flex.checkOut = addIso(flex.checkIn, segmentNights(flex) + diff);
  }

  await persist(tripId, segments, trip.startDate, user.id);
  return {
    ok: true,
    borrowedFrom: borrowedFrom.map((b) => ({
      name: BASES[b.baseId]?.name ?? b.baseId,
      nameAr: BASES[b.baseId]?.nameAr ?? b.baseId,
      nights: b.nights,
    })),
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

function addIso(iso: string, n: number): string {
  const t = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/* ── one-tap day pacing ───────────────────────────────────────────────── */

/**
 * «خفّف» — make one day lighter.
 *
 * User testing: "I wanted fewer stops per day and one lazy day. The only
 * tools are: delete one item at a time, and drag to reorder." Deleting four
 * stops across fourteen days by hand is not a pace control.
 *
 * Drops the weakest curated stop on the day — lowest rated, latest in the
 * evening if unrated — and tombstones it, so the next rebuild honours it.
 * Only curated rows are eligible: something the crew added by hand is a
 * decision, not filler.
 */
export async function lightenDay(tripId: string, dayDate: string) {
  const user = await requireOwner(tripId);
  const day = parseOr(zDateOnly, dayDate, "Invalid day");

  const rows = await db
    .select()
    .from(itineraryItems)
    .where(
      and(
        eq(itineraryItems.tripId, tripId),
        eq(itineraryItems.dayDate, day),
        eq(itineraryItems.provider, "package"),
      ),
    );
  if (rows.length <= 1) throw new Error("Nothing left to drop here");

  const weakest = rows.slice().sort((a, b) => {
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (ra !== rb) return ra - rb;
    return (b.startTime ?? "").localeCompare(a.startTime ?? "");
  })[0];

  await db.transaction(async (tx) => {
    await tx
      .insert(tripRemovedStops)
      .values({ tripId, title: weakest.title, baseId: weakest.baseId ?? null, removedBy: user.id })
      .onConflictDoNothing();
    await tx.delete(itineraryItems).where(eq(itineraryItems.id, weakest.id));
  });

  revalidatePath(`/trips/${tripId}/itinerary`);
  return { removed: weakest.title, removedAr: weakest.titleAr ?? weakest.title };
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
