/**
 * Shared helpers for the v2 /api/discover/* proxy routes.
 *
 * Every Google Places call in v2 goes through these routes — the API key is
 * server-only, calls are auth-gated + metered, and the daily kill-switch can
 * degrade us to cache-only. The Foursquare /api/places/* routes are untouched
 * (the current app still uses them); this is an additive, parallel namespace.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { PlacesNotConfiguredError } from "@/lib/places/google";

/** Auth gate — every discover call costs Google quota. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, error: null as null };
}

/** Map a thrown error to a clean JSON response. Surfaces the "enable Places API
 *  (New)" case as a clear 503 so setup problems are obvious in testing. */
export function placesError(err: unknown): NextResponse {
  if (err instanceof PlacesNotConfiguredError) {
    return NextResponse.json({ error: err.message, code: "places_not_configured" }, { status: 503 });
  }
  const msg = err instanceof Error ? err.message : "Places error";
  return NextResponse.json({ error: msg }, { status: 502 });
}

export function num(v: string | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
