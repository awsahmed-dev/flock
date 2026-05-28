/**
 * B5: Foursquare Places client. Used by /api/places/search (autocomplete
 * for "Add a place by name") and /api/places/details (rich card with
 * photos, hours, rating, top tip).
 *
 * API key is server-side only. Free tier ~99,500 calls/mo — enough for
 * alpha/beta. We trim responses to the minimum the UI needs so we don't
 * pump a fat JSON payload over the wire.
 */

const BASE = "https://api.foursquare.com/v3/places";

function authHeaders() {
  const key = process.env.FOURSQUARE_API_KEY;
  if (!key) throw new Error("FOURSQUARE_API_KEY not configured");
  return {
    Accept: "application/json",
    Authorization: key,
  };
}

export interface FsqSearchHit {
  fsqId: string;
  name: string;
  category: string | null;
  /** Top category icon URL — null when missing. */
  categoryIcon: string | null;
  /** Human-readable address (formatted). */
  address: string | null;
  lat: number | null;
  lng: number | null;
  /** Foursquare's distance in metres from the search center, when biased. */
  distance: number | null;
}

/**
 * Place autocomplete. Biased toward `near` (free text, e.g. "Tokyo")
 * with optional lat/lng for a ranking boost.
 */
export async function searchPlaces({
  query,
  near,
  lat,
  lng,
  limit = 8,
}: {
  query: string;
  near?: string;
  lat?: number;
  lng?: number;
  limit?: number;
}): Promise<FsqSearchHit[]> {
  const params = new URLSearchParams();
  params.set("query", query);
  params.set("limit", String(limit));
  if (lat != null && lng != null) {
    params.set("ll", `${lat},${lng}`);
  } else if (near) {
    params.set("near", near);
  }

  const res = await fetch(`${BASE}/search?${params.toString()}`, {
    headers: authHeaders(),
    // Cache short — autocomplete is bursty, don't burn quota repeating
    // identical keystrokes.
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Foursquare search failed: ${res.status}`);
  }
  const data = (await res.json()) as { results?: FsqRawResult[] };
  return (data.results ?? []).map(simplify);
}

export interface FsqDetails extends FsqSearchHit {
  /** A primary photo URL we host-fetched from Foursquare's CDN. */
  photoUrl: string | null;
  /** 0–10 numeric rating. */
  rating: number | null;
  /** 1–4 price tier. */
  priceLevel: number | null;
  /** Friendly status like "Open until 22:00" or "Closed". */
  hoursSummary: string | null;
  /** A single top tip extracted from the tips endpoint. */
  topTip: string | null;
}

/**
 * Full place card. One details + one photos + one tips call. Failures
 * in the secondary calls degrade gracefully — we always return at least
 * the base data so the UI can render something.
 */
export async function getPlaceDetails(fsqId: string): Promise<FsqDetails> {
  const detailsRes = await fetch(
    `${BASE}/${encodeURIComponent(fsqId)}?fields=fsq_id,name,categories,location,geocodes,distance,rating,price,hours`,
    { headers: authHeaders(), next: { revalidate: 3600 } },
  );
  if (!detailsRes.ok) {
    throw new Error(`Foursquare details failed: ${detailsRes.status}`);
  }
  const detailsRaw = (await detailsRes.json()) as FsqRawDetailedResult;

  // Photos + tips in parallel, both optional.
  const [photoUrl, topTip] = await Promise.all([
    fetchTopPhoto(fsqId).catch(() => null),
    fetchTopTip(fsqId).catch(() => null),
  ]);

  return {
    ...simplify(detailsRaw),
    photoUrl,
    rating: typeof detailsRaw.rating === "number" ? detailsRaw.rating : null,
    priceLevel: typeof detailsRaw.price === "number" ? detailsRaw.price : null,
    hoursSummary: summarizeHours(detailsRaw.hours),
    topTip,
  };
}

async function fetchTopPhoto(fsqId: string): Promise<string | null> {
  const res = await fetch(`${BASE}/${encodeURIComponent(fsqId)}/photos?limit=1`, {
    headers: authHeaders(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as FsqPhoto[];
  const first = data[0];
  if (!first?.prefix || !first?.suffix) return null;
  return `${first.prefix}600x400${first.suffix}`;
}

async function fetchTopTip(fsqId: string): Promise<string | null> {
  const res = await fetch(`${BASE}/${encodeURIComponent(fsqId)}/tips?limit=1`, {
    headers: authHeaders(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as FsqTip[];
  return data[0]?.text ?? null;
}

/* ─── helpers ─────────────────────────────────────────────────────────── */

interface FsqRawResult {
  fsq_id: string;
  name?: string;
  categories?: { id: number; name: string; icon?: { prefix?: string; suffix?: string } }[];
  location?: { formatted_address?: string; locality?: string; country?: string };
  geocodes?: { main?: { latitude?: number; longitude?: number } };
  distance?: number;
}

interface FsqRawDetailedResult extends FsqRawResult {
  rating?: number;
  price?: number;
  hours?: FsqHours;
}

interface FsqPhoto { prefix?: string; suffix?: string; width?: number; height?: number; }
interface FsqTip { text?: string; }
interface FsqHours {
  display?: string;
  open_now?: boolean;
  regular?: { day: number; open: string; close: string }[];
}

function simplify(r: FsqRawResult): FsqSearchHit {
  const cat = r.categories?.[0];
  const icon = cat?.icon?.prefix && cat?.icon?.suffix
    ? `${cat.icon.prefix}64${cat.icon.suffix}`
    : null;
  return {
    fsqId: r.fsq_id,
    name: r.name ?? "",
    category: cat?.name ?? null,
    categoryIcon: icon,
    address: r.location?.formatted_address ?? null,
    lat: r.geocodes?.main?.latitude ?? null,
    lng: r.geocodes?.main?.longitude ?? null,
    distance: typeof r.distance === "number" ? r.distance : null,
  };
}

function summarizeHours(hours: FsqHours | undefined): string | null {
  if (!hours) return null;
  if (hours.display) return hours.display;
  if (typeof hours.open_now === "boolean") {
    return hours.open_now ? "Open now" : "Closed";
  }
  return null;
}
