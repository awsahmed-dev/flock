/**
 * Geocode a place name using Nominatim (OpenStreetMap) — completely free, no API key.
 * Rate limit: 1 request/second (fine for user-triggered actions).
 */
export async function geocode(
  query: string,
  contextCity?: string
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  if (!query.trim()) return null;

  const q = contextCity ? `${query}, ${contextCity}` : query;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=0`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Flock-TravelApp/1.0 (contact@flock.app)",
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
