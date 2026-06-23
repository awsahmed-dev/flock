"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "./trips";
import { geocode } from "@/lib/geocode";
import { buildSeedFeed } from "@/lib/discovery/seed";
import { isOverCap } from "@/lib/places/meter";
import { quality } from "@/lib/discovery/score";
import { getLocale } from "@/lib/i18n";

/**
 * Paxawa v2 — P6 "spread the pattern": real Stays discovery on the Bookings
 * page. Same engine as Discover — real Google places, cached per destination
 * via `buildSeedFeed` (so it's ~free after the first hit), ranked by quality
 * (rating × log-reviews). The "one brain" reaching the booking surface: AI
 * surfaces real hotels, never invents them.
 */

export interface StayCard {
  placeId: string;
  name: string;
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  photoRef: string | null;
  address: string | null;
  coords: [number, number];
}

export async function discoverStays(tripId: string): Promise<{ stays: StayCard[] }> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  const geo = await geocode(trip.destination).catch(() => null);
  const center: [number, number] | null = geo ? [geo.lng, geo.lat] : null;
  const locale = (await getLocale()) as "en" | "ar";

  const places = await buildSeedFeed({
    destination: trip.destination,
    center,
    category: "stay",
    languageCode: locale,
    cacheOnly: await isOverCap(), // honor the global spend kill-switch
  }).catch(() => []);

  const stays = [...places]
    .sort((a, b) => quality(b) - quality(a))
    .slice(0, 12)
    .map((p) => ({
      placeId: p.placeId,
      name: p.name,
      rating: p.rating,
      userRatingsTotal: p.userRatingsTotal,
      priceLevel: p.priceLevel,
      photoRef: p.photoRef,
      address: p.address,
      coords: p.coords,
    }));

  return { stays };
}
