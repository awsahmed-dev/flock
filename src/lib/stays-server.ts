import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, itineraryItems, placeLikes, profiles, stayBookings, tripMembers, tripSegments } from "@/lib/db/schema";
import { getBase } from "@/lib/packages/library";
import { staysOf, type LngLat, type Stay } from "@/lib/stays";

/**
 * A trip's stays with everything the screens need, read in one place so the
 * Stays page, the NOW cockpit and the redirect route can't drift apart.
 * Membership must already be checked by the caller.
 */
export interface StayView extends Stay {
  /** Someone in the crew is sorting this one out (most recent first). */
  looking: { userId: string; name: string; mine: boolean } | null;
  /** Ask ME "did you book it?" — I tapped, it's still not covered, I haven't said "not yet". */
  askMe: boolean;
  /** The hotel I last opened on Booking.com for this stay, so the question
   *  on return can name it. Null after a plain city search. */
  myHotel: string | null;
  /** Middle of the city, for the hotel search. */
  center: LngLat | null;
  /** The plan's stops during these nights — what the hotels are ranked against. */
  stops: LngLat[];
}

/** Who in the crew hearted which place, for the hotel rows. */
export type CrewLikes = Record<string, { userId: string; name: string }[]>;

function cityCenter(seg: { baseId: string; customLat: number | null; customLng: number | null }): LngLat | null {
  if (seg.baseId.startsWith("custom:")) {
    return seg.customLat != null && seg.customLng != null ? [seg.customLng, seg.customLat] : null;
  }
  const b = getBase(seg.baseId as never);
  return b ? [b.lng, b.lat] : null;
}

function cityNames(seg: { baseId: string; customName: string | null; customNameAr: string | null }) {
  if (seg.baseId.startsWith("custom:")) {
    const raw = seg.baseId.slice("custom:".length);
    return { name: seg.customName || raw, nameAr: seg.customNameAr || seg.customName || raw };
  }
  const b = getBase(seg.baseId as never);
  return { name: b?.name ?? seg.baseId, nameAr: b?.nameAr ?? b?.name ?? seg.baseId };
}

export async function loadTripStays(
  tripId: string,
  viewerId: string,
): Promise<{ stays: StayView[]; crew: number; likes: CrewLikes }> {
  const [segs, lodgingRows, rows, crewRows, stopRows, likeRows] = await Promise.all([
    db
      .select({
        baseId: tripSegments.baseId,
        checkIn: tripSegments.checkIn,
        checkOut: tripSegments.checkOut,
        customName: tripSegments.customName,
        customNameAr: tripSegments.customNameAr,
        customLat: tripSegments.customLat,
        customLng: tripSegments.customLng,
      })
      .from(tripSegments)
      .where(eq(tripSegments.tripId, tripId))
      .orderBy(tripSegments.sortOrder),
    // Hotels on the plan: booked stay anchors (with nights) and plain
    // accommodation stops (one night each).
    db
      .select({ dayDate: itineraryItems.dayDate, title: itineraryItems.title, nights: bookings.nights })
      .from(itineraryItems)
      .leftJoin(bookings, eq(bookings.stopId, itineraryItems.id))
      .where(
        and(
          eq(itineraryItems.tripId, tripId),
          or(eq(itineraryItems.stopType, "booking_stay"), eq(itineraryItems.type, "accommodation")),
        ),
      ),
    db.select().from(stayBookings).where(eq(stayBookings.tripId, tripId)),
    db.select({ id: tripMembers.userId }).from(tripMembers).where(eq(tripMembers.tripId, tripId)),
    db
      .select({
        dayDate: itineraryItems.dayDate,
        lat: itineraryItems.locationLat,
        lng: itineraryItems.locationLng,
        type: itineraryItems.type,
        stopType: itineraryItems.stopType,
      })
      .from(itineraryItems)
      .where(eq(itineraryItems.tripId, tripId)),
    db.select({ placeId: placeLikes.placeId, userId: placeLikes.userId }).from(placeLikes).where(eq(placeLikes.tripId, tripId)),
  ]);

  const stays = staysOf(
    segs
      .filter((s) => s.checkIn && s.checkOut)
      .map((s) => ({ baseId: s.baseId, checkIn: String(s.checkIn), checkOut: String(s.checkOut), ...cityNames(s) })),
    lodgingRows.map((l) => ({ dayDate: String(l.dayDate), title: l.title, nights: l.nights })),
  );

  // Where you're actually going: located stops that aren't hotels or travel.
  const places = stopRows.filter(
    (r) => r.lat != null && r.lng != null && r.type !== "accommodation" && r.type !== "transport" && r.stopType !== "booking_stay",
  );

  const lookerIds = [...new Set([...rows.map((r) => r.userId), ...likeRows.map((r) => r.userId)])];
  const names = lookerIds.length
    ? new Map(
        (await db.select({ id: profiles.id, name: profiles.displayName }).from(profiles).where(inArray(profiles.id, lookerIds)))
          .map((p) => [p.id, p.name ?? ""]),
      )
    : new Map<string, string>();

  const likes: CrewLikes = {};
  for (const l of likeRows) (likes[l.placeId] ??= []).push({ userId: l.userId, name: names.get(l.userId) ?? "" });

  return {
    crew: crewRows.length,
    likes,
    stays: stays.map((s) => {
      const seg = segs.find((g) => g.baseId === s.baseId && String(g.checkIn) === s.checkIn);
      // A row counts only if it still points at THIS visit: keys are
      // positional, so after a reorder the check-in is what proves it.
      const mine = rows.filter((r) => r.stayKey === s.key && String(r.checkIn) === s.checkIn);
      const covered = s.coveredBy != null;
      const lookingRow = covered
        ? null
        : mine.filter((r) => r.status === "looking").sort((a, b) => +b.updatedAt - +a.updatedAt)[0] ?? null;
      const myRow = mine.find((r) => r.userId === viewerId);
      return {
        ...s,
        looking: lookingRow
          ? { userId: lookingRow.userId, name: names.get(lookingRow.userId) ?? "", mine: lookingRow.userId === viewerId }
          : null,
        askMe: !covered && myRow?.status === "looking" && !myRow.promptDismissedAt,
        myHotel: myRow?.status === "looking" ? myRow.hotelName : null,
        center: seg ? cityCenter(seg) : null,
        stops: places
          .filter((p) => String(p.dayDate) >= s.checkIn && String(p.dayDate) < s.checkOut)
          .map((p) => [p.lng as number, p.lat as number] as LngLat),
      };
    }),
  };
}
