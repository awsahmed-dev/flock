/**
 * B7: Mapbox Geocoding API — client-side autocomplete for the "Add a
 * place" flow. We use this instead of Foursquare for the primary search
 * because:
 *   - The Mapbox token is already in NEXT_PUBLIC_, no extra API route hop.
 *   - Mapbox autocomplete is fast and covers the same name+address+
 *     coords data the user needs to pin something on the map.
 *   - Foursquare stays available as an *optional* metadata enrichment
 *     after a pick (photo, rating, hours, tip) — best-effort, never
 *     blocking the add flow.
 *
 * Returns NULL on hard failure so the caller can degrade to free-text
 * entry — search is a *suggestion*, not a requirement, per tester ask.
 */

export interface GeoSuggestion {
  id: string;
  /** Primary display name — e.g. "Osaka Castle". */
  name: string;
  /** Secondary line — formatted address or context. */
  context: string | null;
  lat: number;
  lng: number;
  /** Mapbox category, when present — e.g. "tourism, attraction". */
  category: string | null;
}

const ENDPOINT = "https://api.mapbox.com/geocoding/v5/mapbox.places";

/**
 * Autocomplete a query, biased toward the trip area.
 *
 * @param query       what the user typed (≥ 2 chars expected).
 * @param proximity   [lng, lat] to rank nearby results higher.
 * @param token       NEXT_PUBLIC_MAPBOX_TOKEN — passed in so this lib stays
 *                    framework-free.
 * @param signal      abort signal so old in-flight requests can be cancelled
 *                    on each keystroke.
 */
export async function searchPlaces({
  query,
  proximity,
  token,
  signal,
  limit = 8,
  language,
}: {
  query: string;
  proximity?: [number, number];
  token: string;
  signal?: AbortSignal;
  limit?: number;
  /** B15: BCP-47 language tag (e.g. "ar", "en"). Defaults to "en".
   *  Mapbox returns place names in the requested script when
   *  available — handy for users browsing in Arabic. */
  language?: string;
}): Promise<GeoSuggestion[]> {
  if (query.trim().length < 2) return [];

  const params = new URLSearchParams();
  params.set("access_token", token);
  params.set("autocomplete", "true");
  params.set("limit", String(limit));
  // Bias toward POIs and addresses; skip whole countries / regions which
  // would polluate the list with "Japan" entries for a Japan trip.
  params.set("types", "poi,address,place,locality,neighborhood");
  // B12: force English names. Without `language`, Mapbox returns POI
  // names in the local script — Osaka Castle becomes 大阪城, which is
  // accurate but useless for English-speaking users who typed "osaka
  // castle". `worldview=us` keeps disputed-territory naming neutral.
  params.set("language", language ?? "en");
  if (proximity) {
    params.set("proximity", proximity.join(","));
    // B12-followup: proximity is only a *ranking* signal in Mapbox — a
    // search for "Petronas Towers" on a KL trip still surfaced "Petronas
    // Tower Street, South Africa" because the SA address scored higher
    // on token match alone. Pin results geographically with a tight bbox
    // (±1.5°, ~165 km) around the trip center — wide enough to cover a
    // metro area + day trips, narrow enough to exclude the next country
    // (KL→Singapore is ~3° apart, so a wider bbox surfaced a Singaporean
    // "Petronas" hit instead of the Twin Towers).
    const [lng, lat] = proximity;
    const bbox = [
      Math.max(-180, lng - 1.5),
      Math.max(-90, lat - 1.5),
      Math.min(180, lng + 1.5),
      Math.min(90, lat + 1.5),
    ];
    params.set("bbox", bbox.join(","));
  }

  try {
    const res = await fetch(
      `${ENDPOINT}/${encodeURIComponent(query.trim())}.json?${params.toString()}`,
      { signal },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: Array<{
        id?: string;
        text?: string;
        place_name?: string;
        place_type?: string[];
        center?: [number, number];
        properties?: { category?: string };
        context?: Array<{ text?: string }>;
      }>;
    };
    // Mapbox interleaves POIs and addresses by raw text score, which
    // means a generic street can outrank the actual landmark a tourist
    // is searching for. Re-rank so POIs come first, then addresses,
    // then everything else — within each tier preserve Mapbox order.
    const tier = (t?: string[]) => {
      if (!t || t.length === 0) return 9;
      if (t.includes("poi")) return 0;
      if (t.includes("address")) return 1;
      if (t.includes("place") || t.includes("locality")) return 2;
      return 3;
    };
    return (data.features ?? [])
      .filter((f) => Array.isArray(f.center) && f.center.length === 2)
      .sort((a, b) => tier(a.place_type) - tier(b.place_type))
      .map((f) => ({
        id: f.id ?? `${f.center![0]},${f.center![1]}`,
        name: f.text ?? f.place_name ?? "Place",
        context:
          // Drop the leading "{text}, " from place_name so the secondary
          // line is just the address tail.
          f.place_name && f.text
            ? f.place_name.replace(new RegExp(`^${escapeRegExp(f.text)},?\\s*`), "")
            : f.place_name ?? null,
        lat: f.center![1],
        lng: f.center![0],
        category: f.properties?.category ?? null,
      }));
  } catch {
    // Aborted, network, anything — degrade silently. Caller handles UI.
    return [];
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
