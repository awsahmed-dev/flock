import { NextResponse } from "next/server";
import { autocomplete } from "@/lib/places/google";
import { isOverCap } from "@/lib/places/meter";
import { getLocale } from "@/lib/i18n";
import { requireUser, placesError, num } from "../_helpers";

/**
 * Session-tokened autocomplete. The client generates one sessionToken per
 * search session and threads it here + into /details, so the whole session
 * bills as one (cost lever). Biased to the trip's location when lat/lng given.
 */
export async function GET(request: Request) {
  const { error } = await requireUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const input = searchParams.get("q")?.trim() ?? "";
  if (input.length < 2) return NextResponse.json({ predictions: [] });

  // Autocomplete is the cheapest SKU but still counts toward the daily cap.
  if (await isOverCap()) return NextResponse.json({ predictions: [], capped: true });

  try {
    const locale = await getLocale();
    const predictions = await autocomplete(input, {
      sessionToken: searchParams.get("session") ?? undefined,
      lat: num(searchParams.get("lat")),
      lng: num(searchParams.get("lng")),
      languageCode: locale === "ar" ? "ar" : "en",
    });
    return NextResponse.json({ predictions });
  } catch (err) {
    return placesError(err);
  }
}
