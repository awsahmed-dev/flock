import { NextResponse } from "next/server";
import { getCachedPlace } from "@/lib/places/cache";
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
