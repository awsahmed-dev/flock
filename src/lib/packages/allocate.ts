import type { Base, BaseId, Route, TransportMode } from "@/lib/packages/types";

/**
 * Fitting a curated route onto a real trip length.
 *
 * Three earlier versions of this shipped broken, so the rules are written
 * down rather than implied:
 *
 *  1. Route nights are RATIOS, never absolutes.
 *  2. Every base gets at least one night while nights remain; a trip shorter
 *     than the route drops bases from the TAIL and says which.
 *  3. `maxNights` caps CURATED CONTENT, not the right to stay. Linear scaling
 *     put 13 nights in Tokyo on a 30-night trip — visibly wrong to anyone who
 *     has been, and it takes the "curated = trustworthy" positioning down
 *     with it. So curated nights stop at the ceiling.
 *  4. But every night of the trip still belongs to a base. Nights past the
 *     ceiling are spread as FREE days and reported as `overflow`, so the UI
 *     can offer to fill them or suggest another base. A tester's sixth night
 *     in Tbilisi used to belong to nothing: it existed in the day grid,
 *     showed on no city screen, and no control could reach it.
 *  5. Because `maxNights <= days.length` for every base (enforced in tests),
 *     rule 3 makes a blank day impossible at or below a route's capacity.
 */

export interface AllocatedLeg {
  baseId: BaseId;
  nights: number;
  transportInMode: TransportMode | null;
  transportInMinutes: number | null;
}

export interface Allocation {
  legs: AllocatedLeg[];
  /** bases the trip was too short to include, in route order */
  dropped: BaseId[];
  /**
   * Nights beyond the route's curated depth. They ARE allocated — every
   * night belongs to a base — but they arrive as free days, so the UI can
   * offer to fill them or suggest another base rather than pretending the
   * route is deeper than it is.
   */
  overflow: number;
}

export function allocateNights(
  route: Route,
  bases: Record<BaseId, Base>,
  tripNights: number,
): Allocation {
  if (tripNights <= 0) return { legs: [], dropped: [], overflow: 0 };

  const legs = route.legs.filter((l) => bases[l.baseId]);
  if (!legs.length) return { legs: [], dropped: [], overflow: tripNights };

  const cap = (id: BaseId) => Math.max(1, bases[id].maxNights);
  const dropped: BaseId[] = [];

  // A trip shorter than the number of bases cannot visit them all. Drop from
  // the tail so the route still opens where it is meant to open.
  const keep = legs.slice(0, Math.min(legs.length, tripNights));
  for (const l of legs.slice(keep.length)) dropped.push(l.baseId);

  const ratioSum = keep.reduce((s, l) => s + Math.max(0, l.nightsRatio), 0) || keep.length;
  const ideal = keep.map((l) => (tripNights * Math.max(0, l.nightsRatio)) / ratioSum);

  // Start everyone at one night, then hand out the rest by largest remainder,
  // never above a base's ceiling.
  const nights = keep.map(() => 1);
  let remaining = tripNights - keep.length;

  while (remaining > 0) {
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < keep.length; i++) {
      if (nights[i] >= cap(keep[i].baseId)) continue;
      const score = ideal[i] - nights[i];
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best === -1) break; // every base is at its ceiling
    nights[best] += 1;
    remaining -= 1;
  }

  const transportFor = (from: BaseId, to: BaseId) =>
    route.transport.find((t) => t.from === from && t.to === to) ?? null;

  // Every night of the trip must belong to a base.
  //
  // A tester booked 6 nights in Tbilisi, whose curated content covers 5. The
  // sixth belonged to nothing: it existed in the day grid, appeared on no
  // city screen, and no control could reach it. The ceiling is a cap on
  // CURATED CONTENT, not permission to stay — so anything left over is
  // spread across the stays as free days, which is honest and is exactly
  // what "fill the free days" is for.
  const freeNights = remaining;
  for (let i = 0; remaining > 0; i = (i + 1) % keep.length) {
    nights[i] += 1;
    remaining -= 1;
  }

  return {
    legs: keep.map((l, i) => {
      const prev = i > 0 ? keep[i - 1].baseId : null;
      const t = prev ? transportFor(prev, l.baseId) : null;
      return {
        baseId: l.baseId,
        nights: nights[i],
        // No hardcoded 120: a curated leg lost on a re-add used to come
        // back as a flat "2h" and be printed as fact, an hour adrift of the
        // real 2h50 Lisbon–Porto train. `relink` estimates from the real
        // distance instead, so leave it unset here and let it.
        transportInMode: t?.mode ?? null,
        transportInMinutes: t?.minutes ?? null,
      };
    }),
    dropped,
    overflow: freeNights,
  };
}

/**
 * The capacity of a route — how long a trip it can honestly fill. Shown on
 * the route card so a 30-night trip is told the truth up front rather than
 * being handed an inflated plan.
 */
export function routeCapacity(route: Route, bases: Record<BaseId, Base>): number {
  return route.legs.reduce((n, l) => n + (bases[l.baseId]?.maxNights ?? 0), 0);
}

/** Nights in a trip: the last day is a departure, not a night. */
export function tripNightsBetween(startIso: string, endIso: string): number {
  const a = Date.UTC(+startIso.slice(0, 4), +startIso.slice(5, 7) - 1, +startIso.slice(8, 10));
  const b = Date.UTC(+endIso.slice(0, 4), +endIso.slice(5, 7) - 1, +endIso.slice(8, 10));
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** Day strings between two YYYY-MM-DD bounds, inclusive, timezone-free. */
export function eachDate(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const a = Date.UTC(+startIso.slice(0, 4), +startIso.slice(5, 7) - 1, +startIso.slice(8, 10));
  const b = Date.UTC(+endIso.slice(0, 4), +endIso.slice(5, 7) - 1, +endIso.slice(8, 10));
  for (let t = a; t <= b; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

export function addDays(iso: string, n: number): string {
  const t = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
