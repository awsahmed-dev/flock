/**
 * Geocode a place name. First tries Nominatim (free, OSM-backed); if it
 * misses — which is common for hyper-specific venue names like "Pavilion
 * KL Food Court" or partial chain names — falls back to Mapbox, which has
 * much better recall on POIs but costs per request. We always pass the
 * trip's destination as context so a "Central Market" search in a KL
 * trip doesn't land in London.
 */
export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
  /** A sensible map zoom for this result's extent — a country ≈ 5, a city ≈ 11,
   *  a venue ≈ 14. Undefined when the provider gave no extent. */
  zoom?: number;
};

/** Zoom that frames a bbox (degrees) at roughly one screen. */
function zoomForExtent(latSpan: number, lngSpan: number): number {
  const span = Math.max(latSpan, lngSpan, 0.0005);
  return Math.max(3, Math.min(15, Math.round(Math.log2(360 / span) - 0.5)));
}

export async function geocode(
  query: string,
  contextCity?: string
): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;

  // 1) Try Nominatim — free and good for well-known landmarks.
  const nom = await geocodeNominatim(query, contextCity);
  if (nom) return nom;

  // 2) Mapbox fallback — better POI recall, especially for venues with
  //    descriptors ("X Food Court", "Y Restaurant"). Requires the public
  //    token, which is already in the runtime env.
  return geocodeMapbox(query, contextCity);
}

const COUNTRY_NAME: Record<string, string> = {
  my: "Malaysia", sa: "Saudi Arabia", jp: "Japan", ae: "United Arab Emirates", tr: "Turkey",
  us: "United States", th: "Thailand", id: "Indonesia", eg: "Egypt", gb: "United Kingdom",
  it: "Italy", fr: "France", es: "Spain", de: "Germany", nl: "Netherlands",
};

/**
 * Geocode a TRIP DESTINATION for framing a map — a place, not a venue.
 * The create-trip box accepts free text, so this must survive
 * "الاتنصثقمثsaudi arabia": Nominatim (country-restricted) → Mapbox limited
 * to place-level types → the guessed country itself, framed. Never a street.
 */
export async function geocodeDestination(destination: string): Promise<GeocodeResult | null> {
  if (!destination.trim()) return null;
  const nom = await geocodeNominatim(destination, destination);
  if (nom) return nom;
  const mb = await geocodeMapbox(destination, destination, "country,region,place,locality");
  if (mb) return mb;
  const cc = guessCountryCode(destination);
  const name = cc ? COUNTRY_NAME[cc] : null;
  return name ? geocodeNominatim(name) : null;
}

async function geocodeNominatim(
  query: string,
  contextCity?: string,
): Promise<GeocodeResult | null> {
  // Geocoding the destination itself passes it as its own context; "Japan,
  // Japan" made Nominatim return a random POI (an embassy in Tokyo, a museum
  // in Riyadh) instead of the place. Never double the query.
  const q = contextCity && !sameText(contextCity, query) ? `${query}, ${contextCity}` : query;
  const country = contextCity ? guessCountryCode(contextCity) : null;
  // B18: countrycodes restricts results to the trip's country so
  // generic names like "Pavilion KL Food Court" don't drift to a same-
  // named street in another country.
  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "1",
    addressdetails: "1",
  });
  if (country) params.set("countrycodes", country);
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
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
    const bb: string[] | undefined = data[0].boundingbox; // [south, north, west, east]
    const result: GeocodeResult = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
      zoom: bb && bb.length === 4
        ? zoomForExtent(Math.abs(parseFloat(bb[1]) - parseFloat(bb[0])), Math.abs(parseFloat(bb[3]) - parseFloat(bb[2])))
        : undefined,
    };
    // Verify the result is in the expected country — defends against
    // Nominatim treating countrycodes as a hint rather than a filter.
    if (country) {
      const addressCountry = data[0].address?.country_code?.toLowerCase();
      if (addressCountry && addressCountry !== country) return null;
    }
    return result;
  } catch {
    return null;
  }
}

async function geocodeMapbox(
  query: string,
  contextCity?: string,
  types = "poi,address,place,locality,neighborhood",
): Promise<GeocodeResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  // Stuff the city into the query — Mapbox doesn't have a city-context
  // param, but appending the city name reliably anchors the search.
  // Geocoding the destination itself passes it as its own context; "Japan,
  // Japan" made Nominatim return a random POI (an embassy in Tokyo, a museum
  // in Riyadh) instead of the place. Never double the query.
  const q = contextCity && !sameText(contextCity, query) ? `${query}, ${contextCity}` : query;

  // B18: anchor by country when we can detect it from the context — this
  // is the fix for the "Pavilion KL Food Court → coords in Northern
  // Ireland" class of bug. If the AI emits PLACE in the form
  // "Venue, City" (which we now mandate in the prompt) we infer the
  // country from a tiny lookup. Restricting `country=` narrows Mapbox's
  // search to that country's data only.
  const country = contextCity ? guessCountryCode(contextCity) : null;
  const params = new URLSearchParams({
    access_token: token,
    limit: "1",
    language: "en",
    types,
  });
  if (country) params.set("country", country);
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{ place_name?: string; center?: [number, number]; bbox?: number[]; place_type?: string[] }>;
    };
    const f = data.features?.[0];
    if (!f?.center || f.center.length !== 2) return null;
    const pt = f.place_type?.[0];
    const zoom = f.bbox && f.bbox.length === 4
      ? zoomForExtent(Math.abs(f.bbox[3] - f.bbox[1]), Math.abs(f.bbox[2] - f.bbox[0]))
      : pt === "country" ? 5 : pt === "region" ? 7 : pt === "place" ? 11 : 14;
    return {
      lat: f.center[1],
      lng: f.center[0],
      displayName: f.place_name ?? query,
      zoom,
    };
  } catch {
    return null;
  }
}

function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Crude country-code lookup from a context string. We only need to
// recognise the destinations our users actually plan around; misses
// degrade gracefully (just no country restriction).
const CITY_TO_COUNTRY: Record<string, string> = {
  // Malaysia
  "kuala lumpur": "my", "kl": "my", "penang": "my", "georgetown": "my",
  "langkawi": "my", "ipoh": "my", "cameron highlands": "my",
  "redang": "my", "terengganu": "my", "kuantan": "my", "malacca": "my",
  "johor bahru": "my", "kota kinabalu": "my", "kuching": "my", "malaysia": "my",
  // Japan
  "tokyo": "jp", "osaka": "jp", "kyoto": "jp", "nara": "jp", "hiroshima": "jp",
  "fukuoka": "jp", "sapporo": "jp", "yokohama": "jp", "japan": "jp",
  // Saudi
  "riyadh": "sa", "jeddah": "sa", "dammam": "sa", "khobar": "sa",
  "medina": "sa", "mecca": "sa", "abha": "sa", "tabuk": "sa",
  "alula": "sa", "neom": "sa", "saudi arabia": "sa",
  // Arabic-typed destinations (the create-trip box accepts free text)
  "السعودية": "sa", "الرياض": "sa", "جدة": "sa", "مكة": "sa", "المدينة المنورة": "sa",
  "اليابان": "jp", "طوكيو": "jp", "أوساكا": "jp", "كيوتو": "jp",
  "الإمارات": "ae", "دبي": "ae", "أبوظبي": "ae", "أبو ظبي": "ae",
  "تركيا": "tr", "إسطنبول": "tr", "اسطنبول": "tr",
  "تايلاند": "th", "بانكوك": "th", "ماليزيا": "my", "كوالالمبور": "my",
  "إندونيسيا": "id", "بالي": "id", "مصر": "eg", "القاهرة": "eg",
  "لندن": "gb", "بريطانيا": "gb", "باريس": "fr", "فرنسا": "fr",
  // UAE
  "dubai": "ae", "abu dhabi": "ae", "sharjah": "ae", "ras al khaimah": "ae",
  "ajman": "ae", "fujairah": "ae", "uae": "ae", "united arab emirates": "ae",
  // Turkey
  "istanbul": "tr", "ankara": "tr", "antalya": "tr", "izmir": "tr",
  "cappadocia": "tr", "bodrum": "tr", "turkey": "tr",
  // Thailand
  "bangkok": "th", "chiang mai": "th", "phuket": "th", "krabi": "th",
  "pattaya": "th", "koh samui": "th", "thailand": "th",
  // Indonesia
  "bali": "id", "jakarta": "id", "ubud": "id", "yogyakarta": "id",
  "surabaya": "id", "lombok": "id", "indonesia": "id",
  // Egypt
  "cairo": "eg", "luxor": "eg", "alexandria": "eg", "aswan": "eg",
  "sharm el sheikh": "eg", "hurghada": "eg", "egypt": "eg",
  // Europe selection
  "london": "gb", "manchester": "gb", "edinburgh": "gb", "united kingdom": "gb", "uk": "gb",
  "paris": "fr", "nice": "fr", "lyon": "fr", "france": "fr",
  "rome": "it", "milan": "it", "florence": "it", "venice": "it", "naples": "it", "italy": "it",
  "madrid": "es", "barcelona": "es", "seville": "es", "valencia": "es", "spain": "es",
  "berlin": "de", "munich": "de", "frankfurt": "de", "hamburg": "de", "germany": "de",
  "amsterdam": "nl", "rotterdam": "nl", "netherlands": "nl",
  // Americas
  "new york": "us", "los angeles": "us", "san francisco": "us", "miami": "us",
  "chicago": "us", "las vegas": "us", "boston": "us", "usa": "us", "united states": "us",
};

function guessCountryCode(context: string): string | null {
  const lower = context.toLowerCase();
  for (const [city, code] of Object.entries(CITY_TO_COUNTRY)) {
    if (lower.includes(city)) return code;
  }
  return null;
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
