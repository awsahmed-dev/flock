"use server";

import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDestinationHero } from "@/lib/unsplash";

/**
 * B19: lazy hero-image filler. If a trip doesn't yet have a hero image
 * URL persisted, fetch one from Unsplash and save it. Subsequent reads
 * skip the network. Safe to call from any server component that renders
 * a trip — it returns the hero data so the caller can render in the
 * same paint.
 *
 * Returns null if Unsplash isn't configured (no env key) or the search
 * returned no results — caller falls back to the existing gradient.
 */
export async function ensureTripHeroImage(args: {
  tripId: string;
  destination: string;
  /** Pre-fetched values from the trips row, if the caller already has
   *  them — avoids a re-fetch when called from the trip page that just
   *  selected the row. */
  existingUrl?: string | null;
  existingCreditName?: string | null;
  existingCreditLink?: string | null;
}): Promise<{
  url: string;
  creditName: string;
  creditLink: string;
} | null> {
  if (args.existingUrl && args.existingCreditName && args.existingCreditLink) {
    return {
      url: args.existingUrl,
      creditName: args.existingCreditName,
      creditLink: args.existingCreditLink,
    };
  }

  const hero = await getDestinationHero(args.destination);
  if (!hero) return null;

  await db
    .update(trips)
    .set({
      heroImageUrl: hero.url,
      heroImageCreditName: hero.creditName,
      heroImageCreditLink: hero.creditLink,
    })
    .where(eq(trips.id, args.tripId))
    .catch(() => {});

  return hero;
}
