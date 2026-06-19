import { NextResponse } from "next/server";
import { textSearch } from "@/lib/places/google";
import { warmCache } from "@/lib/places/cache";
import { isOverCap } from "@/lib/places/meter";
import { getLocale } from "@/lib/i18n";
import { requireUser, placesError, num } from "../_helpers";

/**
 * Text search — "ramen near Asakusa". The Discover query engine. Results are
 * warmed into the shared cache so later detail opens are free. Biased to the
 * trip location when lat/lng given.
 */
export async function GET(request: Request) {
  const { error } = await requireUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ places: [] });
  if (await isOverCap()) return NextResponse.json({ places: [], capped: true });

  try {
    const locale = await getLocale();
    const places = await textSearch(query, {
      lat: num(searchParams.get("lat")),
      lng: num(searchParams.get("lng")),
      languageCode: locale === "ar" ? "ar" : "en",
    });
    void warmCache(places); // fire-and-forget; don't block the response
    return NextResponse.json({ places });
  } catch (err) {
    return placesError(err);
  }
}
