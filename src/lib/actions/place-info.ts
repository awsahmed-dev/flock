"use server";

import { details, photoMediaUrl, PlacesNotConfiguredError } from "@/lib/places/google";

/**
 * Everything Google knows about one place, for the card you just tapped.
 *
 * "We travellers like places based on images and rating and reviews." All
 * three come from the Places API we already pay for — none of it is
 * authored here, and when the API is not configured this returns null and
 * the sheet says so rather than showing a plausible blank.
 */
export interface PlaceInfo {
  placeId: string;
  name: string;
  rating: number | null;
  ratingCount: number | null;
  address: string | null;
  openNow: string | null;
  summary: string | null;
  mapsUrl: string | null;
  /** proxied, so Google's bytes and our key never reach the browser */
  photos: string[];
  reviews: { author: string; rating: number | null; text: string; when: string | null }[];
}

export async function placeInfo(placeId: string, locale?: string): Promise<PlaceInfo | null> {
  if (!placeId) return null;
  try {
    const p = await details(placeId, {
      profile: "detail",
      languageCode: locale === "ar" ? "ar" : "en",
    });
    const raw = p as unknown as {
      reviews?: {
        authorAttribution?: { displayName?: string };
        rating?: number;
        text?: { text?: string };
        relativePublishTimeDescription?: string;
      }[];
      googleMapsUri?: string;
    };
    return {
      placeId: p.placeId,
      name: p.name,
      rating: p.rating,
      ratingCount: p.userRatingsTotal,
      address: p.address,
      openNow: p.hoursSummary,
      summary: p.topTip,
      mapsUrl: raw.googleMapsUri ?? null,
      photos: (p.photoRefs ?? [])
        .slice(0, 6)
        .map((ref) => `/api/discover/photo?ref=${encodeURIComponent(ref)}&w=800`),
      reviews: (raw.reviews ?? [])
        .slice(0, 4)
        .map((r) => ({
          author: r.authorAttribution?.displayName ?? "",
          rating: r.rating ?? null,
          text: r.text?.text ?? "",
          when: r.relativePublishTimeDescription ?? null,
        }))
        .filter((r) => r.text),
    };
  } catch (err) {
    // No key, or Google is down. The caller shows what it already had.
    if (err instanceof PlacesNotConfiguredError) return null;
    return null;
  }
}

/** Kept beside the action so the photo proxy has one owner. */
export async function placePhotoUrl(ref: string, w = 800): Promise<string | null> {
  try {
    return photoMediaUrl(ref, w);
  } catch {
    return null;
  }
}
