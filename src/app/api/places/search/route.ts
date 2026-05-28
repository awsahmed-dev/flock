import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { searchPlaces } from "@/lib/foursquare";

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

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const near = searchParams.get("near")?.trim() ?? undefined;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchPlaces({
      query,
      near,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      limit: 8,
    });
    return NextResponse.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Foursquare error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
