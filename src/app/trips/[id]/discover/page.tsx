export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { eachDayOfInterval, format } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { isOwner } from "@/lib/permissions";
import { geocode } from "@/lib/geocode";
import { db } from "@/lib/db";
import { tripWishlist, placeLikes } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { DiscoverFeed } from "@/components/discover/discover-feed";
import type { PlaceCategoryKey } from "@/components/discover/primitives";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";
import { tripPhase } from "@/lib/trip-phase";
import { getToday } from "@/lib/today-server";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}

/** Server-safe validation list — kept local so this server page never pulls a
 *  runtime value out of the "use client" primitives barrel (that import throws
 *  on the server). Must stay in sync with PLACE_CATEGORIES in primitives. */
const VALID_CATEGORIES = [
  "eat", "coffee", "sight", "nightlife", "shopping", "activity", "stay",
] as const;

/**
 * v2 Discover — standalone preview surface. Real Google places, ranked + tagged
 * by the engine, learning live as you scroll. Shipped additively (separate
 * route) so the existing Plan page testers use stays untouched until Discover
 * is proven and wired into the Plan IA.
 */
export default async function DiscoverPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { category } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  // §A1: Bookings' "to book" checklist deep-links here with ?category=stay so a
  // hotel gap lands straight on the Stay category — discovery has one home.
  const initialCategory: PlaceCategoryKey | null =
    category && (VALID_CATEGORIES as readonly string[]).includes(category)
      ? (category as PlaceCategoryKey)
      : null;

  const trip = await getTripWithMembership(id, user.id);
  const todayIso = await getToday();
  if (!trip) redirect("/dashboard");

  // §3-A: the user's saved places for this trip — hearts pre-fill from these
  // and the wishlist sheet lists them all (not just those in the current feed).
  const wishlistRows = await db.query.tripWishlist.findMany({
    where: and(eq(tripWishlist.tripId, id), eq(tripWishlist.userId, user.id)),
    orderBy: [desc(tripWishlist.createdAt)],
  });
  const savedPlaces = wishlistRows.map((w) => ({
    placeId: w.placeId,
    placeName: w.placeName,
    photoRef: w.photoRef,
    category: w.category,
    rating: w.rating,
    address: w.address,
    lat: w.lat,
    lng: w.lng,
  }));

  // §1-E: crew likes for this trip — which places the current user liked +
  // total like counts per place (across the crew).
  const likeRows = await db
    .select({ placeId: placeLikes.placeId, userId: placeLikes.userId })
    .from(placeLikes)
    .where(eq(placeLikes.tripId, id));
  const likedPlaceIds = likeRows.filter((r) => r.userId === user.id).map((r) => r.placeId);
  const likeCounts: Record<string, number> = {};
  for (const r of likeRows) likeCounts[r.placeId] = (likeCounts[r.placeId] ?? 0) + 1;

  const geo = await geocode(trip.destination).catch(() => null);
  const center: [number, number] | null = geo ? [geo.lng, geo.lat] : null;

  const days = eachDayOfInterval({
    start: parseDateOnly(trip.startDate),
    end: parseDateOnly(trip.endDate),
  }).map((d) => format(d, "yyyy-MM-dd"));

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string, p?: Record<string, string | number>) => tFromDict(dict, k, p, locale);

  return (
    <div className="sm:mx-auto sm:max-w-[680px] sm:space-y-3 lg:max-w-none lg:space-y-4">
      {/* Header — desktop framing only; mobile is full-bleed immersive.
          No mobile negative margins: the immersive trip-shell <main> has zero
          padding, so the feed sits flush at the top-left already; the old
          -mx-4 -mt-6 (meant to cancel a padded main) shifted it off-screen. */}
      <div className="hidden sm:flex items-baseline justify-between gap-3">
        <h1 className="text-2xl sm:text-[1.9rem] font-extrabold tracking-[-0.02em] leading-tight">
          {/* §5-H: during LIVE the header relabels to Nearby. */}
          {tripPhase(trip, todayIso) === "LIVE"
            ? t("nav.nearby")
            : t("discover.title", { destination: trip.destination })}
        </h1>
        {/* §10.6: was shrink-0 → the brand tagline clipped off-screen at
            1512px. Let it wrap to two lines instead; never clip brand voice. */}
        <p className="text-[13px] text-muted-foreground min-w-0 max-w-[420px] text-end">
          {t("discover.subtitle")}
        </p>
      </div>

      <DiscoverFeed
        tripId={trip.id}
        tripName={trip.name}
        destination={trip.destination}
        center={center}
        days={days}
        crewSize={trip.members.length}
        isOwner={isOwner(trip, user.id)}
        initialCategory={initialCategory}
        savedPlaces={savedPlaces}
        likedPlaceIds={likedPlaceIds}
        likeCounts={likeCounts}
        defaultMapView={tripPhase(trip, todayIso) === "LIVE"}
      />
    </div>
  );
}
