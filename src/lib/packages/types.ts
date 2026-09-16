/**
 * Planning v3 types — bases, routes, segments.
 *
 * See docs/planning-city-first.md. The inversion that matters: curated
 * content belongs to a BASE (a place you sleep, plus what you can reach from
 * it and return the same evening), not to a route. A route is only an
 * ordering and a set of ratios. That is what makes "add a base" bring real
 * content with it instead of a blank day.
 */

export type PlaceCategory = "sight" | "food" | "walk" | "shop" | "nature" | "rest";
export type TransportMode = "train" | "flight" | "car" | "bus" | "ferry";

export interface CuratedPlace {
  name: string;
  nameAr: string;
  /** one human line — the reason a person can repeat out loud as their own */
  why: string;
  whyAr: string;
  category: PlaceCategory;
  rating?: number;
  /** 0 = free … 3 = expensive */
  priceBand?: 0 | 1 | 2 | 3;
  startTime?: string;
}

export interface CuratedDay {
  /** stable within its base, so a projection can be re-run without churn */
  key: string;
  title: string;
  titleAr: string;
  places: CuratedPlace[];
}

export type BaseId = string;

export interface Base {
  id: BaseId;
  name: string;
  nameAr: string;
  /** ISO-3166 alpha-2 */
  country: string;
  lat: number;
  lng: number;
  /** what to ask Google for when fetching the card photo */
  photoQuery: string;
  /** destination-string fragments that should resolve to this base */
  match: string[];

  typicalNights: number;
  /**
   * The useful ceiling. Linear ratio scaling put 13 nights in Tokyo on a
   * 30-night trip, which is visibly wrong to anyone who has been and takes
   * the whole "curated = trustworthy" positioning down with it. Past this,
   * we offer more bases instead of inflating this one.
   */
  maxNights: number;

  /** bases reachable as a day trip from here */
  reachable: BaseId[];
  /** suggestion rail for "add a base" */
  pairsWith: BaseId[];

  /** day shapes for when you are BASED here */
  days: CuratedDay[];
  /** the single-day shape for when this place is visited AS a day trip */
  dayTrip?: CuratedDay;
}

export interface RouteLeg {
  baseId: BaseId;
  /**
   * Relative weight, not an absolute. Scaled against the trip's real length
   * and clamped by the base's maxNights.
   */
  nightsRatio: number;
}

export interface Route {
  id: string;
  match: string[];
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  /** the honest provenance line — why this route is trustworthy */
  provenance: string;
  provenanceAr: string;
  /** what differentiates this card from the others for the same destination */
  forWho: string;
  forWhoAr: string;
  legs: RouteLeg[];
  transport: { from: BaseId; to: BaseId; mode: TransportMode; minutes: number }[];
  /** below this the route cannot be honoured and we say so */
  minNights: number;
}

/* ── the trip's own shape ─────────────────────────────────────────────── */

export interface Segment {
  baseId: BaseId;
  order: number;
  /** YYYY-MM-DD, inclusive */
  checkIn: string;
  /** YYYY-MM-DD, exclusive of the night — equals the next base's checkIn */
  checkOut: string;
  transportInMode: TransportMode | null;
  transportInMinutes: number | null;
  /** bases visited as day trips from this one */
  dayTrips: BaseId[];
  lockedBy: "flight" | "hotel" | null;
  /** set only for a city we do not curate — see trip_segments */
  customName?: string | null;
  customNameAr?: string | null;
  customLat?: number | null;
  customLng?: number | null;
}

/** One projected day of the itinerary. */
export interface ProjectedDay {
  date: string;
  index: number;
  baseId: BaseId;
  title: string;
  titleAr: string;
  /** a day that starts on a train/plane and therefore holds fewer stops */
  travel: boolean;
  /** visiting another base for the day */
  dayTripTo: BaseId | null;
  /** the final day — morning only */
  departure: boolean;
  places: CuratedPlace[];
}
