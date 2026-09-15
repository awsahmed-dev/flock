"use server";

import { db } from "@/lib/db";
import {
  tripPackages,
  packageReactions,
  savedPlaces,
  tripMembers,
  trips,
  itineraryItems,
} from "@/lib/db/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { findCanonical, type CanonPackage } from "@/lib/packages/canonical";
import { distributeDays } from "@/lib/packages/distribute";
import { parseOr } from "@/lib/actions/validate";
import { z } from "zod";

/**
 * «الباقة» — the ready plan a trip opens with.
 *
 * Design (docs/planning-ux-audit.md parts 3–5):
 *  · Zero questions. Destination + dates is all we need, and the trip
 *    already has both — the 21-question wizard is gone.
 *  · Canon owns the skeleton, the crew owns the texture: the classic route
 *    supplies days and anchors, the group's own saves are slotted in on top
 *    with provenance. One save in the tray flips the framing from "the
 *    famous route" to "built from your saves".
 *  · The result is stored as a draft, so closing the screen can never
 *    destroy it again (audit B3), and so the crew can react before adoption.
 */

export type PackageTier = "canonical" | "cached" | "assembled";

export interface PackagePlace {
  /** stable within the package so reactions/vetoes can address it */
  key: string;
  name: string;
  why: string;
  category: string;
  rating?: number | null;
  priceBand?: number | null;
  startTime?: string | null;
  lat?: number | null;
  lng?: number | null;
  photoRef?: string | null;
  /** set when the place came from the crew's saves */
  fromSaveId?: string | null;
  fromLabel?: string | null;
  pinned?: boolean;
}

export interface PackageDay {
  index: number;
  date: string;
  title: string;
  city: string;
  places: PackagePlace[];
}

export interface PackagePayload {
  tier: PackageTier;
  /** the language the day titles and "why" lines were written in */
  locale?: "ar" | "en";
  provenance: string;
  cities: { name: string; nights: number }[];
  days: PackageDay[];
  /** saves that fit no day — the tray keeps them visible, never silently dropped */
  unplaced: { saveId: string; name: string }[];
}

export interface PackageRecord {
  id: string;
  title: string;
  subtitle: string | null;
  tier: PackageTier;
  status: string;
  payload: PackagePayload;
  reactions: { userId: string; dayIndex: number; reaction: string; vetoPlaceId: string | null }[];
}

/**
 * The payload is client-supplied and written straight to jsonb, so it is
 * validated like any other untrusted input (audit: it was not). An
 * unchecked payload could permanently 500 the package page for the whole
 * crew, or push a malformed startTime into a Postgres `time` column.
 */
const zPlace = z.object({
  key: z.string().max(120),
  name: z.string().trim().min(1).max(200),
  why: z.string().max(600).default(""),
  category: z.string().max(40).default("sight"),
  rating: z.number().finite().min(0).max(5).nullish(),
  priceBand: z.number().int().min(0).max(4).nullish(),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "bad time").nullish(),
  lat: z.number().finite().min(-90).max(90).nullish(),
  lng: z.number().finite().min(-180).max(180).nullish(),
  photoRef: z.string().max(2000).nullish(),
  fromSaveId: z.string().uuid().nullish(),
  fromLabel: z.string().max(80).nullish(),
  pinned: z.boolean().optional(),
});
const zPayload = z.object({
  tier: z.enum(["canonical", "cached", "assembled"]),
  locale: z.enum(["ar", "en"]).optional(),
  provenance: z.string().max(400),
  cities: z.array(z.object({ name: z.string().max(120), nights: z.number().int().min(0).max(365) })).max(40),
  days: z.array(z.object({
    index: z.number().int().min(0).max(400),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    title: z.string().max(200),
    city: z.string().max(120),
    places: z.array(zPlace).max(20),
  })).max(400),
  unplaced: z.array(z.object({ saveId: z.string().uuid(), name: z.string().max(200) })).max(200),
});

async function requireMember(tripId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const member = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)),
  });
  if (!member) throw new Error("Not a trip member");
  return user;
}

/**
 * Trip-wide destructive operations are owner-only here, matching the rest
 * of the repo (trip-settings, documents, votes, bookings). Generating,
 * adopting or sharing rewrites what the whole crew sees.
 */
async function requireOwner(tripId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const member = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)),
  });
  if (!member) throw new Error("Not a trip member");
  if (member.role !== "owner") throw new Error("Only the trip owner can change the plan");
  return user;
}

function eachDay(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const [ys, ms, ds] = startIso.split("-").map(Number);
  const [ye, me, de] = endIso.split("-").map(Number);
  for (let t = Date.UTC(ys, ms - 1, ds); t <= Date.UTC(ye, me - 1, de); t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Build the package. Canon supplies the day shapes; the crew's saves are
 * distributed across them (a save replaces the weakest canonical slot in the
 * day whose city it belongs to, else it extends the day). When saves cover
 * more than ~40% of slots the framing flips — it is their plan, not ours.
 */
function buildPayload(
  canon: CanonPackage | null,
  dates: string[],
  saves: { id: string; placeName: string; category: string | null; rating: number | null; lat: number | null; lng: number | null; photoRef: string | null; source: string }[],
  locale: "ar" | "en",
  destination: string,
): { payload: PackagePayload; title: string; subtitle: string } {
  const ar = locale === "ar";
  const days: PackageDay[] = [];
  const unplaced: { saveId: string; name: string }[] = [];

  if (canon) {
    // The allocation itself lives in lib/packages/distribute.ts and is unit
    // tested there — two earlier versions of this shipped broken (repeated
    // days, then a dropped Kyoto and 23 trailing blanks) with nothing to
    // catch either.
    distributeDays(canon, dates.length).forEach((slot, i) => {
      const date = dates[i];
      if (!slot.shape) {
        days.push({
          index: i,
          date,
          title: ar ? `يوم حر في ${slot.cityAr}` : `Free day in ${slot.city}`,
          city: ar ? slot.cityAr : slot.city,
          places: [],
        });
        return;
      }
      days.push({
        index: i,
        date,
        title: ar ? slot.shape.titleAr : slot.shape.title,
        city: ar ? slot.shape.cityAr : slot.shape.city,
        places: slot.shape.places.map((pl, k) => ({
          key: `c${i}-${k}`,
          name: ar ? pl.nameAr : pl.name,
          why: ar ? pl.whyAr : pl.why,
          category: pl.category,
          rating: pl.rating ?? null,
          priceBand: pl.priceBand ?? null,
          startTime: pl.startTime ?? null,
          photoRef: null,
          fromSaveId: null,
          fromLabel: null,
        })),
      });
    });
  } else {
    // No curated route for this destination — an honest empty skeleton the
    // crew's own saves fill. We do NOT invent a "famous route" we can't back.
    dates.forEach((date, i) => {
      days.push({
        index: i,
        date,
        title: ar ? `اليوم ${i + 1}` : `Day ${i + 1}`,
        city: destination,
        places: [],
      });
    });
  }

  // Slot the crew's saves in. Round-robin keeps them spread across the trip
  // rather than dumped on day one.
  saves.forEach((s) => {
    if (!days.length) {
      unplaced.push({ saveId: s.id, name: s.placeName });
      return;
    }
    // Emptiest day first (earliest wins ties). Round-robin ignored the free
    // days the allocation just created and piled saves onto full ones.
    let target = days[0];
    for (const d of days) if (d.places.length < target.places.length) target = d;
    const place: PackagePlace = {
      key: `s-${s.id}`,
      name: s.placeName,
      why: ar ? "من محفوظاتكم" : "From your saves",
      category: s.category ?? "sight",
      rating: s.rating,
      priceBand: null,
      startTime: null,
      lat: s.lat,
      lng: s.lng,
      photoRef: s.photoRef,
      fromSaveId: s.id,
      fromLabel: s.source === "reel" ? (ar ? "من ريل" : "From a reel") : ar ? "من محفوظاتكم" : "Saved by the crew",
      pinned: true,
    };
    // Replace the weakest canonical slot (lowest rating, not pinned) if the
    // day is already full; otherwise just add.
    if (target.places.length >= 5) {
      let weakest = -1;
      let weakestRating = Infinity;
      target.places.forEach((p, idx) => {
        if (p.pinned) return;
        const r = p.rating ?? 0;
        if (r < weakestRating) {
          weakestRating = r;
          weakest = idx;
        }
      });
      if (weakest >= 0) target.places[weakest] = place;
      else unplaced.push({ saveId: s.id, name: s.placeName });
    } else {
      target.places.push(place);
    }
  });

  const slots = days.reduce((n, d) => n + d.places.length, 0) || 1;
  const fromSaves = days.reduce((n, d) => n + d.places.filter((p) => p.fromSaveId).length, 0);
  const savesLed = fromSaves / slots > 0.4;

  const tier: PackageTier = canon ? "canonical" : "assembled";
  const title = savesLed
    ? ar ? "خطتكم — من محفوظاتكم" : "Your plan — from your saves"
    : canon ? (ar ? canon.titleAr : canon.title)
            : ar ? `خطة ${destination}` : `${destination} plan`;
  const subtitle = canon ? (ar ? canon.subtitleAr : canon.subtitle) : "";
  const provenance = savesLed
    ? ar ? `بنيناها حول ${fromSaves} من أماكنكم المحفوظة.` : `Built around ${fromSaves} places you saved.`
    : canon ? (ar ? canon.provenanceAr : canon.provenance)
            : ar ? "رتّبنا لكم الأيام — أضيفوا أماكنكم وتتوزّع تلقائيًا."
                 : "We laid out the days — add your places and they slot in.";

  return {
    payload: {
      tier,
      locale,
      provenance,
      cities: canon ? canon.cities.map((c) => ({ name: ar ? c.nameAr : c.name, nights: c.nights })) : [{ name: destination, nights: dates.length }],
      days,
      unplaced,
    },
    title,
    subtitle,
  };
}

/** The draft for this trip, if one exists. */
export async function getPackage(tripId: string): Promise<PackageRecord | null> {
  await requireMember(tripId);
  const row = await db.query.tripPackages.findFirst({
    where: eq(tripPackages.tripId, tripId),
    orderBy: [desc(tripPackages.createdAt)],
  });
  if (!row) return null;
  const reactions = await db
    .select({
      userId: packageReactions.userId,
      dayIndex: packageReactions.dayIndex,
      reaction: packageReactions.reaction,
      vetoPlaceId: packageReactions.vetoPlaceId,
    })
    .from(packageReactions)
    .where(eq(packageReactions.packageId, row.id));
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    tier: row.tier as PackageTier,
    status: row.status,
    payload: row.payload as PackagePayload,
    reactions,
  };
}

/**
 * Create (or rebuild) the package. Instant: no model call, no network — the
 * canonical route is data we already curated, which is exactly why «جاهزة»
 * is a promise we can keep.
 */
export async function generatePackage(tripId: string, locale: "ar" | "en" = "ar"): Promise<PackageRecord> {
  const user = await requireOwner(tripId);
  const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
  if (!trip) throw new Error("Trip not found");

  const dates = eachDay(trip.startDate, trip.endDate);
  const existing = await db.query.tripPackages.findFirst({ where: eq(tripPackages.tripId, tripId) });

  // Unwind a previous adoption FIRST, before the saves are read.
  //
  // Rebuilding after adoption is allowed — the crew changed their mind —
  // but the days this package already wrote into the itinerary have to go
  // with it, or adopting the new plan stacks a second copy on top of the
  // first. Only rows this feature created are touched: `provider` is
  // stamped "package" on adoption, so manual and Discover stops survive.
  //
  // The ordering matters. Saves consumed by the old plan are marked
  // "planned", so reading them before this ran meant the first rebuild
  // silently dropped every save the previous plan had used.
  if (existing?.status === "adopted") {
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
      // Self-heal rows left by the earlier adopt, which stamped "planned"
      // without an itemId and so could never be released.
      await tx
        .update(savedPlaces)
        .set({ status: "saved" })
        .where(
          and(
            eq(savedPlaces.tripId, tripId),
            eq(savedPlaces.status, "planned"),
            isNull(savedPlaces.itemId),
          ),
        );
    });
  }

  const saves = await db
    .select({
      id: savedPlaces.id,
      placeName: savedPlaces.placeName,
      category: savedPlaces.category,
      rating: savedPlaces.rating,
      lat: savedPlaces.lat,
      lng: savedPlaces.lng,
      photoRef: savedPlaces.photoRef,
      source: savedPlaces.source,
    })
    .from(savedPlaces)
    .where(and(eq(savedPlaces.tripId, tripId), eq(savedPlaces.status, "saved")));

  const canon = findCanonical(`${trip.destination ?? ""} ${trip.name ?? ""}`);
  const { payload, title, subtitle } = buildPayload(canon, dates, saves, locale, trip.destination ?? trip.name ?? "");

  if (existing) {
    await db
      .update(tripPackages)
      .set({ title, subtitle, tier: payload.tier, payload, status: "draft", updatedAt: new Date() })
      .where(eq(tripPackages.id, existing.id));
  } else {
    await db.insert(tripPackages).values({
      tripId,
      title,
      subtitle,
      tier: payload.tier,
      payload,
      createdBy: user.id,
    });
  }
  revalidatePath(`/trips/${tripId}/package`);
  revalidatePath(`/trips/${tripId}/itinerary`);
  return (await getPackage(tripId))!;
}

/** Persist an edited payload — every verb (بدّل/احذف/ثبّت…) lands here. */
export async function savePackagePayload(tripId: string, payload: PackagePayload) {
  await requireOwner(tripId);
  const clean = parseOr(zPayload, payload, "Bad package") as PackagePayload;
  const row = await db.query.tripPackages.findFirst({ where: eq(tripPackages.tripId, tripId) });
  if (!row) throw new Error("No package");
  await db
    .update(tripPackages)
    .set({ payload: clean, updatedAt: new Date() })
    .where(eq(tripPackages.id, row.id));
  revalidatePath(`/trips/${tripId}/package`);
}

/** Share with the crew — only meaningful once there IS a crew. */
export async function sharePackage(tripId: string) {
  await requireOwner(tripId);
  const row = await db.query.tripPackages.findFirst({ where: eq(tripPackages.tripId, tripId) });
  if (!row) throw new Error("No package");
  await db.update(tripPackages).set({ status: "shared", updatedAt: new Date() }).where(eq(tripPackages.id, row.id));
  revalidatePath(`/trips/${tripId}/package`);
}

/** One tap per day; 🙂 is the default so a happy crew member submits once. */
export async function reactToDay(
  tripId: string,
  dayIndex: number,
  reaction: "love" | "ok" | "skip",
) {
  const user = await requireMember(tripId);
  const row = await db.query.tripPackages.findFirst({ where: eq(tripPackages.tripId, tripId) });
  if (!row) throw new Error("No package");
  await db
    .delete(packageReactions)
    .where(
      and(
        eq(packageReactions.packageId, row.id),
        eq(packageReactions.userId, user.id),
        eq(packageReactions.dayIndex, dayIndex),
      ),
    );
  await db.insert(packageReactions).values({
    packageId: row.id,
    userId: user.id,
    dayIndex,
    reaction,
  });
  revalidatePath(`/trips/${tripId}/package`);
}

/**
 * Adopt: the package becomes the real itinerary. Saves that made it in are
 * stamped "planned" so the tray can show their fate instead of going quiet.
 */
export async function adoptPackage(tripId: string) {
  const user = await requireOwner(tripId);
  const pkg = await getPackage(tripId);
  if (!pkg) throw new Error("No package");
  // Double-tap, a slow network, or a back-then-adopt used to insert the whole
  // itinerary a second time. The status IS the guard.
  if (pkg.status === "adopted") return { added: 0, already: true as const };

  const rows: (typeof itineraryItems.$inferInsert)[] = [];
  const plannedSaves: { saveId: string; row: number }[] = [];
  for (const day of pkg.payload.days) {
    day.places.forEach((p, idx) => {
      rows.push({
        tripId,
        dayDate: day.date,
        title: p.name,
        type: "activity",
        startTime: p.startTime ?? null,
        locationName: p.name,
        locationLat: p.lat ?? null,
        locationLng: p.lng ?? null,
        photoUrl: p.photoRef ?? null,
        notes: p.why || null,
        // The "why" line is the whole reason a curated stop is trustworthy;
        // dropping it on adoption turned the package into a bare name list.
        topTip: p.why || null,
        rating: p.rating ?? null,
        priceLevel: p.priceBand ?? null,
        provider: "package",
        // Adopted stops are decisions, not proposals. Defaulting to
        // "proposed" made every item on a solo trip say "tap to vote".
        status: "confirmed",
        sortOrder: idx,
        createdBy: user.id,
      });
      // index into `rows`, so the inserted id can be paired back to the save
      if (p.fromSaveId) plannedSaves.push({ saveId: p.fromSaveId, row: rows.length - 1 });
    });
  }
  if (!rows.length) throw new Error("Nothing to adopt");

  await db.transaction(async (tx) => {
    const inserted = await tx.insert(itineraryItems).values(rows).returning({ id: itineraryItems.id });
    for (const { saveId, row } of plannedSaves) {
      // itemId, not just the status: a save marked "planned" with no link
      // to its stop can never be un-planned when the plan is rebuilt, so it
      // stayed stuck reading "In the plan" against a stop that was gone.
      await tx
        .update(savedPlaces)
        .set({ status: "planned", itemId: inserted[row]?.id ?? null })
        .where(eq(savedPlaces.id, saveId));
    }
    await tx
      .update(tripPackages)
      .set({ status: "adopted", updatedAt: new Date() })
      .where(eq(tripPackages.id, pkg.id));
  });

  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/package`);
  return { added: rows.length, already: false as const };
}
