import { db } from "@/lib/db";
import { placeFacts, cityIdeas as cityIdeasTable } from "@/lib/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { textSearch, nearby, PlacesNotConfiguredError } from "@/lib/places/google";
import { coordsFor } from "@/lib/packages/coords";

/**
 * What Google knows about the places we curate.
 *
 * The corpus used to carry a rating for every place and every one was
 * authored. Discover has been querying Google Places the whole time; the
 * plan simply never asked it anything — so the fix is not a new integration,
 * it is pointing the curated side at the one we already pay for.
 *
 * Two rules keep this honest:
 *
 *  1. A MATCH HAS TO BE NEAR OUR OWN PIN. We hold a hand-checked coordinate
 *     for nearly every place. Google's answer is only accepted if it lands
 *     within `MAX_OFFSET_M` of it. Name matching alone is what once put
 *     Sensō-ji in Okayama.
 *  2. A MISS IS A RESULT. When nothing matches we record that, and the plan
 *     shows no rating — rather than retrying forever, or worse, filling the
 *     gap with something plausible.
 */

/** Past this, Google is describing a different place with a similar name. */
const MAX_OFFSET_M = 3_000;

/** Ratings drift, but not fast. */
const STALE_DAYS = 30;

export interface PlaceFact {
  rating: number | null;
  /** the number a rating is meaningless without */
  ratingCount: number | null;
  photoRef: string | null;
  address: string | null;
  googlePlaceId: string | null;
}

function metres(a: readonly [number, number], b: readonly [number, number]): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Facts we already hold, for the names asked about. Never hits the network. */
export async function factsFor(names: string[]): Promise<Map<string, PlaceFact>> {
  const out = new Map<string, PlaceFact>();
  if (!names.length) return out;
  const rows = await db
    .select()
    .from(placeFacts)
    .where(inArray(placeFacts.name, [...new Set(names)]));
  for (const r of rows) {
    if (r.missing) continue;
    out.set(r.name, {
      rating: r.rating,
      ratingCount: r.ratingCount,
      photoRef: r.photoRef,
      address: r.formattedAddress,
      googlePlaceId: r.googlePlaceId,
    });
  }
  return out;
}

/** Names we have never looked up, or looked up too long ago. */
export async function staleNames(names: string[]): Promise<string[]> {
  const unique = [...new Set(names)];
  if (!unique.length) return [];
  const rows = await db
    .select({ name: placeFacts.name, fetchedAt: placeFacts.fetchedAt })
    .from(placeFacts)
    .where(inArray(placeFacts.name, unique));
  const seen = new Map(rows.map((r) => [r.name, r.fetchedAt]));
  const cutoff = Date.now() - STALE_DAYS * 86_400_000;
  return unique.filter((n) => {
    const at = seen.get(n);
    return !at || at.getTime() < cutoff;
  });
}

/**
 * Ask Google about one place and cache the answer, hit or miss.
 *
 * Returns false when the API key is absent, so a caller can stop rather
 * than hammer a service that isn't configured.
 */
export async function refreshFact(name: string): Promise<boolean> {
  const mine = coordsFor(name);
  try {
    const results = await textSearch(name, {
      lat: mine?.[0],
      lng: mine?.[1],
      radius: 15_000,
      max: 5,
    });

    // Nearest acceptable match: close to our pin, and recognisably the same
    // name. Without the distance check this is exactly the by-name lookup
    // that put curated places in the wrong city.
    let best: { p: (typeof results)[number]; offset: number } | null = null;
    for (const p of results) {
      // Place.coords is [lng, lat] — Mapbox order, as its own comment says.
      const [plng, plat] = p.coords ?? [];
      if (plat == null || plng == null) continue;
      const offset = mine ? metres(mine, [plat, plng]) : 0;
      if (mine && offset > MAX_OFFSET_M) continue;
      const a = norm(p.name ?? "");
      const b = norm(name);
      const alike = a.includes(b) || b.includes(a) || a.split(" ")[0] === b.split(" ")[0];
      if (!alike && mine && offset > 400) continue;
      if (!best || offset < best.offset) best = { p, offset };
    }

    const row = best
      ? {
          name,
          googlePlaceId: best.p.placeId ?? null,
          rating: best.p.rating ?? null,
          ratingCount: best.p.userRatingsTotal ?? null,
          priceLevel: null,
          photoRef: best.p.photoRef ?? null,
          formattedAddress: best.p.address ?? null,
          lat: best.p.coords?.[1] ?? null,
          lng: best.p.coords?.[0] ?? null,
          offsetM: best.offset,
          missing: false,
          fetchedAt: new Date(),
        }
      : { name, missing: true, fetchedAt: new Date() };

    await db
      .insert(placeFacts)
      .values(row)
      .onConflictDoUpdate({ target: placeFacts.name, set: { ...row, name: sql`${placeFacts.name}` } });
    return true;
  } catch (err) {
    if (err instanceof PlacesNotConfiguredError) return false;
    // A transient failure is not a miss — leave the row alone so the next
    // pass tries again rather than caching "Google has nothing".
    return true;
  }
}

/* ── the rest of the city ─────────────────────────────────────────────── */

/** A week. A city's places do not change hourly, and calls cost money. */
const IDEAS_STALE_DAYS = 7;

export interface CityIdea {
  placeId: string;
  name: string;
  category: string;
  rating: number | null;
  ratingCount: number | null;
  photoRef: string | null;
  address: string | null;
  lat: number;
  lng: number;
}

/**
 * What else there is to do in a city, from Google.
 *
 * The curated corpus is finite on purpose — Langkawi has fourteen places
 * and a five-night stay uses all fourteen. After that the screen whose job
 * is answering "what do I do here" has nothing left to say, which is
 * exactly when someone starts asking.
 *
 * So the tail of that list comes from the Places API Discover already uses.
 * Cached per city for a week: the difference between a feature and a bill.
 * Returns [] with no key, and the screen falls back to its Discover door.
 */
export async function cityIdeas(
  baseId: string,
  lat: number,
  lng: number,
): Promise<CityIdea[]> {
  const [cached] = await db
    .select()
    .from(cityIdeasTable)
    .where(eq(cityIdeasTable.baseId, baseId));

  const fresh =
    cached && cached.fetchedAt.getTime() > Date.now() - IDEAS_STALE_DAYS * 86_400_000;
  if (fresh) return (cached.places as CityIdea[]) ?? [];
  if (!lat && !lng) return (cached?.places as CityIdea[]) ?? [];

  try {
    const found = await nearby({
      lat,
      lng,
      radius: 12_000,
      includedTypes: [
        "tourist_attraction",
        "restaurant",
        "park",
        "museum",
        "shopping_mall",
        "cafe",
      ],
      max: 20,
    });
    const rows: CityIdea[] = found
      // A rating with nobody behind it is noise, not a recommendation.
      .filter((p) => p.rating != null && (p.userRatingsTotal ?? 0) >= 50)
      .map((p) => ({
        placeId: p.placeId,
        name: p.name,
        category: p.category,
        rating: p.rating,
        ratingCount: p.userRatingsTotal,
        photoRef: p.photoRef,
        address: p.address,
        lat: p.coords[1],
        lng: p.coords[0],
      }));

    await db
      .insert(cityIdeasTable)
      .values({ baseId, places: rows, fetchedAt: new Date() })
      .onConflictDoUpdate({
        target: cityIdeasTable.baseId,
        set: { places: rows, fetchedAt: new Date() },
      });
    return rows;
  } catch {
    // No key, or Google is having a day. Serve whatever we last had.
    return (cached?.places as CityIdea[]) ?? [];
  }
}
