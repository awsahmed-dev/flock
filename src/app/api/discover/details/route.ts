import { NextResponse } from "next/server";
import { getCachedPlace, getCachedPlaceOnly } from "@/lib/places/cache";
import { isOverCap } from "@/lib/places/meter";
import { getLocale } from "@/lib/i18n";
import { requireUser, placesError } from "../_helpers";

/**
 * Full place details for the detail panel. Goes through the cache (LRU → shared
 * DB → Google), so most opens never touch Google. `profile=detail` pulls the
 * richer (pricier) field-mask tier; default is the cheap list mask.
 */
export async function GET(request: Request) {
  const { error } = await requireUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("id")?.trim();
  if (!placeId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    // Over cap: serve from cache only (no Google spend). Most opens are cached
    // already; a never-seen place degrades to a soft "capped" miss.
    if (await isOverCap()) {
      const cached = await getCachedPlaceOnly(placeId);
      if (cached) return NextResponse.json({ place: cached });
      return NextResponse.json({ place: null, capped: true });
    }
    const locale = await getLocale();
    const place = await getCachedPlace(placeId, {
      profile: searchParams.get("profile") === "detail" ? "detail" : "list",
      languageCode: locale === "ar" ? "ar" : "en",
    });
    return NextResponse.json({ place });
  } catch (err) {
    return placesError(err);
  }
}
