import { NextResponse } from "next/server";
import { nearby } from "@/lib/places/google";
import { warmCache } from "@/lib/places/cache";
import { isOverCap } from "@/lib/places/meter";
import { getLocale } from "@/lib/i18n";
import { requireUser, placesError, num } from "../_helpers";

/**
 * Browse-by-category around a point — "coffee near the hotel". Maps our coarse
 * category to Google included types. Used by the Discover category chips.
 */
const CATEGORY_TYPES: Record<string, string[]> = {
  eat: ["restaurant"],
  coffee: ["cafe", "coffee_shop"],
  sight: ["tourist_attraction", "museum", "park"],
  nightlife: ["bar", "night_club"],
  shopping: ["shopping_mall", "store"],
  activity: ["amusement_park", "spa", "zoo"],
};

export async function GET(request: Request) {
  const { error } = await requireUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const lat = num(searchParams.get("lat"));
  const lng = num(searchParams.get("lng"));
  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  if (isOverCap()) return NextResponse.json({ places: [], capped: true });

  const category = searchParams.get("category") ?? "eat";
  try {
    const locale = await getLocale();
    const places = await nearby({
      lat,
      lng,
      radius: num(searchParams.get("radius")) ?? 2500,
      includedTypes: CATEGORY_TYPES[category],
      languageCode: locale === "ar" ? "ar" : "en",
    });
    void warmCache(places);
    return NextResponse.json({ places });
  } catch (err) {
    return placesError(err);
  }
}
