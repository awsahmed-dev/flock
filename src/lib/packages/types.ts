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
  /**
   * Deliberately absent: a curated place has NO rating.
   *
   * All 530 of them used to carry one, and every one was invented. The
   * giveaway was the shape of the set — a smooth bell from 4.1 to 4.9 with
   * no 3.x and no 5.0, which no real review data has ever looked like — and
   * the proof was a single Batumi restaurant that had been entered twice
   * under two spellings of its own name and carried 4.3 on one card and 4.5
   * on the other. A sourced number cannot disagree with itself.
   *
   * They rendered as "★ 4.7" beside a place name, which reads as a review
   * score, while we told the user review counts were impossible without a
   * Google key. A real rating on a place the crew SAVED comes from Google
   * and still shows; nothing we author does.
   *
   * That real one rides here, under a name the corpus cannot plausibly
   * fill by hand, and a test asserts no curated place ever sets it.
   */
  savedRating?: number;
  /** 0 = free … 3 = expensive */
  priceBand?: 0 | 1 | 2 | 3;
  startTime?: string;
  /** the move between bases, not somewhere you go */
  leg?: boolean;
  /**
   * What we can honestly say about eating here.
   *
   * Required on every food place, "unverified" included — a tester who
   * needs halal food searched the whole app and found nothing anywhere,
   * and said plainly she would rather be told we don't know than be handed
   * four drinking alleys and have it called dinner. Silence is the one
   * answer that isn't allowed.
   *
   *  halal          — certified, or a kitchen that states it
   *  halal-friendly — no pork and no alcohol served, or seafood/veg only
   *  seafood        — a fish kitchen, which is most of the way there
   *  vegetarian     — real vegetarian mains, not a side salad
   *  vegan          — the same, without dairy or egg
   *  pork-served    — say it out loud rather than let someone find out
   *  alcohol-served — the same courtesy, for the same reason
   *  unverified     — we looked and could not confirm
   *
   * `alcohol-served` was added late, and its absence had already done
   * damage: with no way to say "this kitchen has a bar", four named
   * restaurants with full wine lists were sitting under a `halal` tag.
   *
   * A NEIGHBOURHOOD CANNOT BE HALAL. Twelve of these tags were on streets,
   * markets and promenades, which no one can certify — the tag was being
   * derived from the country rather than the kitchen. Every Turkish food
   * entry was blanket-tagged, which is exactly where the two worst errors
   * came from. Where the venue cannot carry the claim, the honest tag is
   * `unverified`, and a tester already said she would rather be told that.
   */
  dietary?: (
    | "halal"
    | "halal-friendly"
    | "seafood"
    | "vegetarian"
    | "vegan"
    | "pork-served"
    | "alcohol-served"
    | "unverified"
  )[];

  /**
   * Days of the week this place actually opens, 0 = Sunday. Omit when it
   * opens daily. A tester was scheduled into a flea market on a Thursday
   * while the card's own tip read "Tuesdays and Saturdays only" — the
   * constraint was in the prose and nothing could read it.
   */
  openDays?: number[];
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
  /**
   * We do not know where this is.
   *
   * A custom city the user typed may arrive with no coordinates. Parking it
   * at 0,0 made it *look* measurable: two such cities sit on the same point,
   * so the leg estimator confidently returned "20m" for Samarkand to
   * Tashkent. Anything that measures distance must check this first.
   */
  coordsUnknown?: boolean;

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
