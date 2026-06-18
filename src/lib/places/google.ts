/**
 * Paxawa v2 — Google Places API (New) client.
 *
 * The single place that talks to `places.googleapis.com/v1`. Everything else
 * consumes the normalized `Place` / `PlacePrediction` contract from ./types.
 *
 * Cost discipline (docs/v2-discovery-planning.md §5):
 *   - Field masks per surface — `list` (cheap) vs `detail` (rich). We never
 *     pull review/atmosphere fields on a list request.
 *   - Session tokens thread autocomplete → details so they bill as one session.
 *   - Every real call is metered (./meter) and the proxy caches in front of us.
 *
 * IMPORTANT (setup): this uses the **New** Places API, a different SKU/product
 * from the legacy `maps.googleapis.com/maps/api/place/*` the hotels route uses.
 * The same GOOGLE_MAPS_API_KEY works once **"Places API (New)" is enabled** on
 * the Google Cloud project. If it isn't, calls 403 — we surface a clear error.
 */

import "server-only";
import type {
  Place,
  PlacePrediction,
  PriceLevel,
  FieldMaskProfile,
} from "./types";
import { toCategory } from "./features";
import { trackCall } from "./meter";

// Re-export so existing importers of extractFeatures from "./google" keep working.
export { extractFeatures } from "./features";

const BASE = "https://places.googleapis.com/v1";
const KEY = process.env.GOOGLE_MAPS_API_KEY;

export class PlacesNotConfiguredError extends Error {
  constructor() {
    super(
      "Google Places (New) is not configured. Set GOOGLE_MAPS_API_KEY and enable " +
        "the 'Places API (New)' product on the Google Cloud project.",
    );
    this.name = "PlacesNotConfiguredError";
  }
}

/* ── Field masks (the cost lever) ──────────────────────────────────────── */

const LIST_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.photos",
  "places.formattedAddress",
].join(",");

// Detail adds hours + editorial + a couple of reviews. Pricier SKU tier — only
// fetched when a card is opened.
const DETAIL_MASK = [
  "id",
  "displayName",
  "location",
  "types",
  "rating",
  "userRatingCount",
  "priceLevel",
  "photos",
  "formattedAddress",
  "regularOpeningHours",
  "editorialSummary",
].join(",");

const AUTOCOMPLETE_MASK = [
  "suggestions.placePrediction.placeId",
  "suggestions.placePrediction.structuredFormat",
  "suggestions.placePrediction.types",
].join(",");

/* ── Low-level fetch ───────────────────────────────────────────────────── */

async function googleFetch<T>(
  path: string,
  fieldMask: string,
  body?: unknown,
  method: "GET" | "POST" = "POST",
): Promise<T> {
  if (!KEY) throw new PlacesNotConfiguredError();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": fieldMask,
    },
    body: body ? JSON.stringify(body) : undefined,
    // Server-to-server; never cache at the fetch layer (we cache in our layer).
    cache: "no-store",
  });

  if (res.status === 403) {
    // Most likely the New API isn't enabled on the project (or key restricted).
    await res.text().catch(() => "");
    throw new PlacesNotConfiguredError();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Places ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/* ── Normalization: Google → our contract ──────────────────────────────── */

const PRICE_MAP: Record<string, PriceLevel> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

interface GPlace {
  id: string;
  displayName?: { text?: string };
  location?: { latitude: number; longitude: number };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  photos?: { name: string }[];
  formattedAddress?: string;
  regularOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  editorialSummary?: { text?: string };
}

function normalize(g: GPlace): Place {
  const types = g.types ?? [];
  return {
    placeId: g.id,
    provider: "google",
    name: g.displayName?.text ?? "Unnamed place",
    category: toCategory(types),
    placeTypes: types,
    rating: g.rating ?? null,
    userRatingsTotal: g.userRatingCount ?? null,
    priceLevel: g.priceLevel ? PRICE_MAP[g.priceLevel] ?? null : null,
    coords: g.location
      ? [g.location.longitude, g.location.latitude]
      : [0, 0],
    address: g.formattedAddress ?? null,
    photoRef: g.photos?.[0]?.name ?? null,
    hoursSummary: g.regularOpeningHours?.openNow != null
      ? g.regularOpeningHours.openNow
        ? "Open now"
        : "Closed now"
      : null,
    topTip: g.editorialSummary?.text ?? null,
  };
}

/* ── Public API ────────────────────────────────────────────────────────── */

/** Autocomplete predictions. Pass a stable sessionToken across keystrokes +
 *  the eventual details() call so the whole session bills as one. */
export async function autocomplete(
  input: string,
  opts: {
    sessionToken?: string;
    lat?: number;
    lng?: number;
    /** bias radius in meters around lat/lng */
    radius?: number;
    languageCode?: string;
  } = {},
): Promise<PlacePrediction[]> {
  if (input.trim().length < 2) return [];
  const body: Record<string, unknown> = { input };
  if (opts.sessionToken) body.sessionToken = opts.sessionToken;
  if (opts.languageCode) body.languageCode = opts.languageCode;
  if (opts.lat != null && opts.lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: opts.lat, longitude: opts.lng },
        radius: opts.radius ?? 30_000,
      },
    };
  }
  const data = await googleFetch<{ suggestions?: Array<{ placePrediction?: GPrediction }> }>(
    "/places:autocomplete",
    AUTOCOMPLETE_MASK,
    body,
  );
  trackCall("autocomplete");
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is GPrediction => !!p)
    .map((p) => ({
      placeId: p.placeId,
      primary: p.structuredFormat?.mainText?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
      placeTypes: p.types ?? [],
    }));
}

interface GPrediction {
  placeId: string;
  structuredFormat?: {
    mainText?: { text?: string };
    secondaryText?: { text?: string };
  };
  types?: string[];
}

/** Text search — "ramen near Asakusa". The Discover query engine. */
export async function textSearch(
  query: string,
  opts: { lat?: number; lng?: number; radius?: number; languageCode?: string; max?: number } = {},
): Promise<Place[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: opts.max ?? 20,
  };
  if (opts.languageCode) body.languageCode = opts.languageCode;
  if (opts.lat != null && opts.lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: opts.lat, longitude: opts.lng },
        radius: opts.radius ?? 20_000,
      },
    };
  }
  const data = await googleFetch<{ places?: GPlace[] }>("/places:searchText", LIST_MASK, body);
  trackCall("text_search");
  return (data.places ?? []).map(normalize);
}

/** Nearby search by category around a point — "browse coffee around the hotel". */
export async function nearby(
  opts: {
    lat: number;
    lng: number;
    radius?: number;
    includedTypes?: string[];
    languageCode?: string;
    max?: number;
  },
): Promise<Place[]> {
  const body: Record<string, unknown> = {
    maxResultCount: opts.max ?? 20,
    locationRestriction: {
      circle: {
        center: { latitude: opts.lat, longitude: opts.lng },
        radius: opts.radius ?? 2_000,
      },
    },
  };
  if (opts.includedTypes?.length) body.includedTypes = opts.includedTypes;
  if (opts.languageCode) body.languageCode = opts.languageCode;
  const data = await googleFetch<{ places?: GPlace[] }>("/places:searchNearby", LIST_MASK, body);
  trackCall("nearby_search");
  return (data.places ?? []).map(normalize);
}

/** Full details for one place. `profile: "detail"` pulls the pricier fields. */
export async function details(
  placeId: string,
  opts: { profile?: FieldMaskProfile; sessionToken?: string; languageCode?: string } = {},
): Promise<Place> {
  const mask = opts.profile === "detail" ? DETAIL_MASK : LIST_MASK.replaceAll("places.", "");
  const qs = new URLSearchParams();
  if (opts.languageCode) qs.set("languageCode", opts.languageCode);
  if (opts.sessionToken) qs.set("sessionToken", opts.sessionToken);
  const suffix = qs.toString() ? `?${qs}` : "";
  const data = await googleFetch<GPlace>(`/places/${placeId}${suffix}`, mask, undefined, "GET");
  trackCall(opts.profile === "detail" ? "details_full" : "details_list");
  return normalize(data);
}

/** Resolve a Google photo resource name to a fetchable media URL. The proxy
 *  streams this server-side so the key + Google bytes never hit the client. */
export function photoMediaUrl(photoRef: string, maxWidthPx = 800): string {
  if (!KEY) throw new PlacesNotConfiguredError();
  return `${BASE}/${photoRef}/media?maxWidthPx=${maxWidthPx}&key=${KEY}`;
}
