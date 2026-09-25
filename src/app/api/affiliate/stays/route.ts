import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { checkLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { affiliateClicks, stayBookings } from "@/lib/db/schema";
import { affiliateMode } from "@/lib/affiliate/partners";
import { stayFromParam } from "@/lib/packages/stay-key";
import { loadTripStays } from "@/lib/stays-server";
import { bookingSearchUrl, defaultRooms, outboundUrl, stayRef } from "@/lib/stays";

/**
 * The Stays button points HERE, never at the partner.
 *
 *   /api/affiliate/stays?trip=<id>&stay=<stayParam>&rooms=<n>&lang=ar
 *
 * 1. checks the person belongs to the trip and the stay is real and still
 *    needs a bed;
 * 2. logs the tap in affiliate_clicks, so it can be matched to the network's
 *    report by its sid;
 * 3. marks the stay "looking" for the crew — "Aws is checking stays" —
 *    which is also what makes the app ask "did you book it?" on return;
 * 4. redirects: straight to the Booking.com search in preview, through the
 *    network's tracking link when live.
 *
 * The network ids never appear in a page, so they can't be copied out of
 * one, and a click is on record before it leaves.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tripId = searchParams.get("trip") ?? "";
  const back = (q = "") => NextResponse.redirect(`${origin}/trips/${tripId}/stays${q}`);

  const user = await getCurrentUser(request);
  if (!user) return NextResponse.redirect(`${origin}/auth/login`);

  const mode = affiliateMode();
  if (mode === "off") return back();

  const limit = checkLimit(`aff:stays:${user.id}`, { capacity: 20, refillPerSec: 0.2 });
  if (!limit.ok) return back("?e=busy");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) return NextResponse.redirect(`${origin}/dashboard`);

  const stayKey = stayFromParam(searchParams.get("stay") ?? "");
  const { stays, crew } = await loadTripStays(tripId, user.id);
  const stay = stays.find((s) => s.key === stayKey);
  if (!stay || stay.coveredBy) return back();

  const roomsAsked = Number(searchParams.get("rooms"));
  const rooms = Number.isInteger(roomsAsked) && roomsAsked >= 1 && roomsAsked <= 10 ? roomsAsked : defaultRooms(crew);
  const lang = searchParams.get("lang") === "ar" ? "ar" : "en";

  const sid = stayRef("stays", tripId);
  const searchUrl = bookingSearchUrl({
    // Booking's search matches English city names most reliably; a city we
    // only know in Arabic is searched in Arabic, which Booking also handles.
    city: stay.name,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    adults: crew,
    rooms,
    currency: trip.currency,
    lang,
  });
  const target = outboundUrl({ mode, searchUrl, sid, template: process.env.BOOKING_LINK_TEMPLATE });
  // Live without a template would send a click we believe is earning and
  // isn't. Refuse loudly instead.
  if (!target) {
    console.error("[affiliate/stays] AFFILIATE_MODE=live but BOOKING_LINK_TEMPLATE is missing or has no {url}");
    return back("?e=notlive");
  }

  await db.insert(affiliateClicks).values({
    tripId,
    stayKey: stay.key,
    userId: user.id,
    partner: "booking",
    surface: "stays",
    mode,
    sid,
  });
  await db
    .insert(stayBookings)
    .values({ tripId, stayKey: stay.key, checkIn: stay.checkIn, userId: user.id, status: "looking" })
    .onConflictDoUpdate({
      target: [stayBookings.tripId, stayBookings.stayKey, stayBookings.checkIn, stayBookings.userId],
      // Tapping again means "still looking" — so ask again on return.
      set: { status: "looking", promptDismissedAt: null, updatedAt: new Date() },
    });

  return NextResponse.redirect(target, 302);
}
