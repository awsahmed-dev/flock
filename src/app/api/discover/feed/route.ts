import { NextResponse } from "next/server";
import { buildSeedFeed } from "@/lib/discovery/seed";
import { isOverCap } from "@/lib/places/meter";
import { getLocale } from "@/lib/i18n";
import { requireUser, placesError, num } from "../_helpers";

/**
 * The cold-start seed feed (build-spec §A6). Discover opens on this — a diverse,
 * high-quality set for the destination (Eat/See/Do blend, or a single category
 * when a chip is active). Shared + cached per destination, so it's usually free.
 * The client re-ranks the result live against the session taste vector.
 */
export async function GET(request: Request) {
  const { error } = await requireUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const destination = searchParams.get("destination")?.trim();
  if (!destination) {
    return NextResponse.json({ error: "destination is required" }, { status: 400 });
  }
  const lat = num(searchParams.get("lat"));
  const lng = num(searchParams.get("lng"));
  const category = searchParams.get("category");
  const near = searchParams.get("near") === "1" && lat != null && lng != null;

  try {
    const locale = await getLocale();
    const capped = await isOverCap();
    const places = await buildSeedFeed({
      destination,
      center: lat != null && lng != null ? [lng, lat] : null,
      near,
      category: category || null,
      languageCode: locale === "ar" ? "ar" : "en",
      cacheOnly: capped, // over cap → serve only an already-cached seed
    });
    return NextResponse.json({ places, capped: capped && places.length === 0 });
  } catch (err) {
    return placesError(err);
  }
}
