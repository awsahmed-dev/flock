import { NextResponse } from "next/server";
import { checkLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/get-user";
import { searchPlaces } from "@/lib/foursquare";
import { getLocale } from "@/lib/i18n";

/**
 * B5: Foursquare-backed place autocomplete for the Plan page's "Add by
 * search" affordance. Bias toward the trip destination so "ramen" in a
 * Tokyo trip returns Tokyo ramen, not Brooklyn.
 *
 * Auth required — these calls cost FSQ quota.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Launch audit §18: every route that spends money is rate-limited per user.
  {
    const r = checkLimit(`places:${user.id}`, { capacity: 30, refillPerSec: 0.5 });
    if (!r.ok) return NextResponse.json({ error: "Slow down" }, { status: 429, headers: { "Retry-After": String(r.retryAfter) } });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const near = searchParams.get("near")?.trim() ?? undefined;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    // B15: pass the viewer's locale so FSQ returns Arabic POI names
    // ("أبراج بتروناس التوأم") when the user has switched the app to
    // Arabic. Falls back to the canonical name when no translation
    // exists for that POI.
    const locale = await getLocale();
    const results = await searchPlaces({
      query,
      near,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      limit: 8,
      locale,
    });
    return NextResponse.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Foursquare error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
