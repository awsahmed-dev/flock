"use server";

import { db } from "@/lib/db";
import {
  savedPlaces,
  saveFolders,
  tripMembers,
  trips,
  itineraryItems,
  tripSegments,
} from "@/lib/db/schema";
import { BASES } from "@/lib/packages/library";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { parseOr, zText, zDateOnly } from "@/lib/actions/validate";
import { z } from "zod";

/**
 * The saves layer (docs/planning-ux-audit.md part 4).
 *
 * Capture is a heartbeat: one tap, no questions, never a day picker. The day
 * is *offered* afterwards, never asked — which is what retires the 30-chip
 * wall a 30-day trip used to throw at you the moment you liked a café.
 *
 * A save with no tripId lives in the global inbox («محفوظاتي»), because for
 * this audience collecting starts months before a trip exists.
 */

export interface SavePlaceInput {
  placeId?: string | null;
  placeName: string;
  photoRef?: string | null;
  category?: string | null;
  rating?: number | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  source?: "discover" | "reel" | "search" | "manual" | "package";
  sourceUrl?: string | null;
  note?: string | null;
  status?: "saved" | "unverified";
}

const zSave = z.object({
  placeId: z.string().max(300).nullish(),
  placeName: z.string().trim().min(1).max(200),
  photoRef: z.string().max(2000).nullish(),
  category: z.string().max(80).nullish(),
  rating: z.number().finite().min(0).max(5).nullish(),
  address: z.string().max(400).nullish(),
  lat: z.number().finite().min(-90).max(90).nullish(),
  lng: z.number().finite().min(-180).max(180).nullish(),
  source: z.enum(["discover", "reel", "search", "manual", "package"]).default("discover"),
  sourceUrl: z.string().max(2000).nullish(),
  note: z.string().max(1000).nullish(),
  status: z.enum(["saved", "unverified"]).default("saved"),
});

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

/** Folders are personal; a folder id arriving from the client is not proof. */
async function assertOwnFolder(folderId: string, userId: string) {
  const f = await db.query.saveFolders.findFirst({ where: eq(saveFolders.id, folderId) });
  if (!f || f.userId !== userId) throw new Error("Not found");
}

/** Membership check — only for trip-scoped saves; inbox saves are personal. */
async function assertMember(tripId: string, userId: string) {
  const member = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)),
  });
  if (!member) throw new Error("Not a trip member");
}

export interface SavedRow {
  id: string;
  placeId: string | null;
  placeName: string;
  photoRef: string | null;
  category: string | null;
  rating: number | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  source: string;
  sourceUrl: string | null;
  status: string;
  itemId: string | null;
  tripId: string | null;
  folderId: string | null;
  savedBy: string;
  createdAt: Date;
}

/**
 * Save a place. Idempotent per (user, trip, place) so a double-tap can't
 * create twins — the second tap reports the existing row as a duplicate
 * instead, which is a fate the UI can show.
 */
export async function savePlace(
  tripId: string | null,
  input: SavePlaceInput,
): Promise<{ id: string; duplicate: boolean }> {
  const user = await requireUser();
  const place = parseOr(zSave, input, "Invalid place");
  if (tripId) await assertMember(tripId, user.id);

  const existing = place.placeId
    ? await db.query.savedPlaces.findFirst({
        where: and(
          eq(savedPlaces.userId, user.id),
          eq(savedPlaces.placeId, place.placeId),
          tripId ? eq(savedPlaces.tripId, tripId) : isNull(savedPlaces.tripId),
        ),
      })
    : null;
  if (existing) return { id: existing.id, duplicate: true };

  const [row] = await db
    .insert(savedPlaces)
    .values({
      userId: user.id,
      tripId: tripId ?? null,
      placeId: place.placeId ?? null,
      placeName: place.placeName,
      photoRef: place.photoRef ?? null,
      category: place.category ?? null,
      rating: place.rating ?? null,
      address: place.address ?? null,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
      source: place.source,
      sourceUrl: place.sourceUrl ?? null,
      note: place.note ?? null,
      status: place.status,
    })
    .returning({ id: savedPlaces.id });

  if (tripId) {
    revalidatePath(`/trips/${tripId}/itinerary`);
    revalidatePath(`/trips/${tripId}/discover`);
  }
  revalidatePath("/saves");
  return { id: row.id, duplicate: false };
}

export async function unsavePlace(id: string) {
  const user = await requireUser();
  const row = await db.query.savedPlaces.findFirst({ where: eq(savedPlaces.id, id) });
  if (!row || row.userId !== user.id) throw new Error("Not found");
  await db.delete(savedPlaces).where(eq(savedPlaces.id, id));
  if (row.tripId) revalidatePath(`/trips/${row.tripId}/itinerary`);
  revalidatePath("/saves");
}

/** Everything saved for a trip — the tray the plan pulls from. */
export async function listTripSaves(tripId: string): Promise<SavedRow[]> {
  const user = await requireUser();
  await assertMember(tripId, user.id);
  const rows = await db
    .select()
    .from(savedPlaces)
    .where(eq(savedPlaces.tripId, tripId))
    .orderBy(desc(savedPlaces.createdAt));
  return rows.map(toRow);
}

/** The global inbox — saves with no trip yet. */
export async function listInboxSaves(): Promise<SavedRow[]> {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(savedPlaces)
    .where(and(eq(savedPlaces.userId, user.id), isNull(savedPlaces.tripId)))
    .orderBy(desc(savedPlaces.createdAt));
  return rows.map(toRow);
}

function toRow(r: typeof savedPlaces.$inferSelect): SavedRow {
  return {
    id: r.id,
    placeId: r.placeId,
    placeName: r.placeName,
    photoRef: r.photoRef,
    category: r.category,
    rating: r.rating,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    source: r.source,
    sourceUrl: r.sourceUrl,
    status: r.status,
    itemId: r.itemId,
    tripId: r.tripId,
    folderId: r.folderId,
    savedBy: r.userId,
    createdAt: r.createdAt,
  };
}

/* ── folders (the TikTok-bookmark model) ─────────────────────────────── */

export async function createFolder(name: string) {
  const user = await requireUser();
  const clean = parseOr(zText(60), name, "Folder name too long");
  const [row] = await db
    .insert(saveFolders)
    .values({ userId: user.id, name: clean })
    .returning({ id: saveFolders.id });
  revalidatePath("/saves");
  return row.id;
}

export async function listFolders() {
  const user = await requireUser();
  return db
    .select({
      id: saveFolders.id,
      name: saveFolders.name,
      count: sql<number>`(select count(*)::int from ${savedPlaces} sp where sp.folder_id = ${saveFolders.id} and sp.user_id = ${user.id})`,
    })
    .from(saveFolders)
    .where(eq(saveFolders.userId, user.id))
    .orderBy(desc(saveFolders.createdAt));
}

export async function moveToFolder(saveId: string, folderId: string | null) {
  const user = await requireUser();
  const row = await db.query.savedPlaces.findFirst({ where: eq(savedPlaces.id, saveId) });
  if (!row || row.userId !== user.id) throw new Error("Not found");
  // The folder id is client-supplied: without this you could file your save
  // inside someone else's folder and it would show up in their inbox count.
  if (folderId) await assertOwnFolder(folderId, user.id);
  await db.update(savedPlaces).set({ folderId }).where(eq(savedPlaces.id, saveId));
  revalidatePath("/saves");
}

/**
 * Turn a folder into a trip's tray — the inbox's whole reason to exist.
 * «عندك ٧ أماكن في اليابان — نسوي رحلة؟»
 */
export async function attachFolderToTrip(folderId: string, tripId: string) {
  const user = await requireUser();
  await assertMember(tripId, user.id);
  await assertOwnFolder(folderId, user.id);
  await db
    .update(savedPlaces)
    .set({ tripId })
    .where(and(eq(savedPlaces.folderId, folderId), eq(savedPlaces.userId, user.id), isNull(savedPlaces.tripId)));
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath("/saves");
}

/* ── scheduling: the day is offered, never asked ─────────────────────── */

/**
 * Which day should this place land on? We already know where every day of
 * the plan *is* (the package and the existing stops carry coordinates), so
 * the app can answer its own question instead of showing 30 chips: pick the
 * day whose existing stops sit closest to this place, else the emptiest day.
 */
export async function suggestDayFor(
  tripId: string,
  coords: { lat?: number | null; lng?: number | null },
): Promise<{ day: string | null; reason: "near" | "emptiest" | "first" | "base" }> {
  const user = await requireUser();
  await assertMember(tripId, user.id);

  const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
  if (!trip) throw new Error("Trip not found");

  // The trip's shape answers this better than any centroid can.
  //
  // User testing: this put Arashiyama Bamboo Grove — Kyoto — on day one in
  // Tokyo, 450km away and six days before the crew goes near Kyoto, while
  // the app was simultaneously printing "4 of your saves are here" on the
  // Kyoto card. It knew. It just wasn't asked.
  //
  // So if the trip has bases, a place lands in the city it is actually in,
  // and nowhere else.
  if (coords.lat != null && coords.lng != null) {
    const segs = await db
      .select()
      .from(tripSegments)
      .where(eq(tripSegments.tripId, tripId))
      .orderBy(tripSegments.sortOrder);
    if (segs.length) {
      let best: { seg: typeof segs[number]; d2: number } | null = null;
      for (const seg of segs) {
        const b = BASES[seg.baseId];
        if (!b) continue;
        const dx = b.lat - coords.lat;
        const dy = b.lng - coords.lng;
        const d2 = dx * dx + dy * dy;
        if (!best || d2 < best.d2) best = { seg, d2 };
      }
      // ~0.9° ≈ a metro area plus its day-trip radius.
      if (best && best.d2 < 0.8) {
        const stops = await db
          .select({ dayDate: itineraryItems.dayDate })
          .from(itineraryItems)
          .where(eq(itineraryItems.tripId, tripId));
        const count = new Map<string, number>();
        for (const r of stops) if (r.dayDate) count.set(r.dayDate, (count.get(r.dayDate) ?? 0) + 1);
        const inBase = eachDay(String(best.seg.checkIn), String(best.seg.checkOut)).slice(0, -1);
        // Skip the arrival day — you just got off a train.
        const usable = inBase.length > 1 ? inBase.slice(1) : inBase;
        if (usable.length) {
          const day = usable.reduce((a, b) => ((count.get(b) ?? 0) < (count.get(a) ?? 0) ? b : a));
          return { day, reason: "base" };
        }
      }
    }
  }

  const rows = await db
    .select({
      dayDate: itineraryItems.dayDate,
      lat: itineraryItems.locationLat,
      lng: itineraryItems.locationLng,
    })
    .from(itineraryItems)
    .where(eq(itineraryItems.tripId, tripId));

  const byDay = new Map<string, { n: number; lat: number; lng: number; geo: number }>();
  for (const r of rows) {
    if (!r.dayDate) continue;
    const d = byDay.get(r.dayDate) ?? { n: 0, lat: 0, lng: 0, geo: 0 };
    d.n += 1;
    if (r.lat != null && r.lng != null) {
      d.lat += r.lat;
      d.lng += r.lng;
      d.geo += 1;
    }
    byDay.set(r.dayDate, d);
  }

  // Nearest day by centroid — the "قريب من أماكن اليوم ٥" answer.
  if (coords.lat != null && coords.lng != null) {
    let best: { day: string; dist: number } | null = null;
    for (const [day, d] of byDay) {
      if (d.geo === 0) continue;
      const dx = d.lat / d.geo - coords.lat;
      const dy = d.lng / d.geo - coords.lng;
      const dist = dx * dx + dy * dy;
      if (!best || dist < best.dist) best = { day, dist };
    }
    // ~0.09 squared degrees ≈ same-city cluster; beyond that "near" is a lie.
    if (best && best.dist < 0.09) return { day: best.day, reason: "near" };
  }

  const days = eachDay(trip.startDate, trip.endDate);
  if (!days.length) return { day: null, reason: "first" };
  let emptiest = days[0];
  let min = Infinity;
  for (const d of days) {
    const n = byDay.get(d)?.n ?? 0;
    if (n < min) {
      min = n;
      emptiest = d;
    }
  }
  return { day: emptiest, reason: min === 0 ? "emptiest" : "first" };
}

/** Day strings between two YYYY-MM-DD bounds, inclusive, zone-free. */
function eachDay(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const [ys, ms, ds] = startIso.split("-").map(Number);
  const [ye, me, de] = endIso.split("-").map(Number);
  const cur = Date.UTC(ys, ms - 1, ds);
  const end = Date.UTC(ye, me - 1, de);
  for (let t = cur; t <= end; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Graduate a save into the plan. Writes the itinerary stop and stamps the
 * save with its fate so the tray can say «في اليوم ٣» instead of going quiet.
 */
export async function planSavedPlace(saveId: string, dayDate: string) {
  const user = await requireUser();
  const day = parseOr(zDateOnly, dayDate, "Invalid day");
  const row = await db.query.savedPlaces.findFirst({ where: eq(savedPlaces.id, saveId) });
  if (!row) throw new Error("Not found");
  if (!row.tripId) throw new Error("Save has no trip");
  await assertMember(row.tripId, user.id);

  // Replay guard: the tray button is a network round-trip away from a second
  // tap, and every extra tap used to mint another identical stop.
  if (row.status === "planned" && row.itemId) return { itemId: row.itemId, already: true as const };

  const trip = await db.query.trips.findFirst({ where: eq(trips.id, row.tripId) });
  if (!trip) throw new Error("Trip not found");
  // A day outside the trip renders nowhere — the stop would exist in the
  // database and be invisible in the UI, which is the worst of both.
  if (day < trip.startDate || day > trip.endDate) throw new Error("Day is outside the trip");

  const itemId = await db.transaction(async (tx) => {
    const [item] = await tx
      .insert(itineraryItems)
      .values({
        tripId: row.tripId!,
        dayDate: day,
        title: row.placeName,
        type: "activity",
        locationName: row.address ?? row.placeName,
        locationLat: row.lat,
        locationLng: row.lng,
        googlePlaceId: row.placeId,
        photoUrl: row.photoRef,
        rating: row.rating,
        address: row.address,
        provider: row.placeId ? "google" : "manual",
        // Something the crew saved and then chose to schedule is a decision,
        // not a proposal awaiting votes.
        status: "confirmed",
        createdBy: user.id,
      })
      .returning({ id: itineraryItems.id });
    await tx
      .update(savedPlaces)
      .set({ status: "planned", itemId: item.id })
      .where(eq(savedPlaces.id, saveId));
    return item.id;
  });

  revalidatePath(`/trips/${row.tripId}/itinerary`);
  return { itemId, already: false as const };
}
