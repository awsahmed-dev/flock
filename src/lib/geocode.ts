/**
 * Geocode a place name. First tries Nominatim (free, OSM-backed); if it
 * misses — which is common for hyper-specific venue names like "Pavilion
 * KL Food Court" or partial chain names — falls back to Mapbox, which has
 * much better recall on POIs but costs per request. We always pass the
 * trip's destination as context so a "Central Market" search in a KL
 * trip doesn't land in London.
 */
export async function geocode(
  query: string,
  contextCity?: string
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  if (!query.trim()) return null;

  // 1) Try Nominatim — free and good for well-known landmarks.
  const nom = await geocodeNominatim(query, contextCity);
  if (nom) return nom;

  // 2) Mapbox fallback — better POI recall, especially for venues with
  //    descriptors ("X Food Court", "Y Restaurant"). Requires the public
  //    token, which is already in the runtime env.
  return geocodeMapbox(query, contextCity);
}

async function geocodeNominatim(
  query: string,
  contextCity?: string,
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const q = contextCity ? `${query}, ${contextCity}` : query;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=0`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Paxawa-TravelApp/1.0 (contact@flock.app)",
        "Accept-Language": "en",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

async function geocodeMapbox(
  query: string,
  contextCity?: string,
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  // Stuff the city into the query — Mapbox doesn't have a city-context
  // param, but appending the city name reliably anchors the search.
  const q = contextCity ? `${query}, ${contextCity}` : query;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&limit=1&language=en&types=poi,address,place,locality,neighborhood`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{ place_name?: string; center?: [number, number] }>;
    };
    const f = data.features?.[0];
    if (!f?.center || f.center.length !== 2) return null;
    return {
      lat: f.center[1],
      lng: f.center[0],
      displayName: f.place_name ?? query,
    };
  } catch {
    return null;
  }
}

/**
 * Save geocoded coordinates to an itinerary item (server action wrapper).
 */
export async function geocodeAndSave(
  itemId: string,
  locationName: string,
  contextCity?: string
): Promise<{ lat: number; lng: number } | null> {
  const result = await geocode(locationName, contextCity);
  if (!result) return null;
  return { lat: result.lat, lng: result.lng };
}
