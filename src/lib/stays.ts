import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { stayKeys } from "@/lib/packages/stay-key";

/**
 * Stays — which nights of a trip still need a bed. Pure, so it's tested.
 *
 * A stay is one visit to a city on the route, with its own check-in and
 * check-out. Whether it's COVERED is never stored: it's read off the plan's
 * hotel stops, so the Stays card, the NOW ticket and the Horizon can't
 * disagree with what's actually booked.
 */

export interface StaySegment {
  baseId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD, exclusive — the morning you leave
  name: string;
  nameAr: string;
}

/** A hotel on the plan: a booked stay anchor (with nights) or a plain accommodation stop. */
export interface Lodging {
  dayDate: string;
  nights: number | null;
  title: string;
}

export interface Stay {
  key: string;
  baseId: string;
  name: string;
  nameAr: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  /** How many of those nights a hotel on the plan already covers. */
  coveredNights: number;
  /** The hotel covering the first night, when the whole stay is covered. */
  coveredBy: string | null;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Every night a hotel on the plan covers. */
function coveredNightSet(lodgings: Lodging[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const l of lodgings) {
    const n = l.nights && l.nights > 0 ? l.nights : 1;
    for (let i = 0; i < n; i++) {
      const night = iso(addDays(parseISO(l.dayDate), i));
      if (!out.has(night)) out.set(night, l.title);
    }
  }
  return out;
}

/**
 * The trip's stays, in route order. A visit with no night in it (arrive and
 * leave the same day — the fly-home morning) isn't a stay: there's no bed
 * to find, so it gets no card.
 */
export function staysOf(segments: StaySegment[], lodgings: Lodging[]): Stay[] {
  const keys = stayKeys(segments.map((s) => s.baseId));
  const covered = coveredNightSet(lodgings);
  return segments
    .map((s, i) => {
      const nights = Math.max(0, differenceInCalendarDays(parseISO(s.checkOut), parseISO(s.checkIn)));
      const dates = Array.from({ length: nights }, (_, k) => iso(addDays(parseISO(s.checkIn), k)));
      const coveredNights = dates.filter((d) => covered.has(d)).length;
      return {
        key: keys[i],
        baseId: s.baseId,
        name: s.name,
        nameAr: s.nameAr,
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        nights,
        coveredNights,
        coveredBy: nights > 0 && coveredNights === nights ? covered.get(dates[0]) ?? null : null,
      };
    })
    .filter((s) => s.nights > 0);
}

/**
 * Where Stays lives: the Bookings tab of Discover. One place to reach it
 * later, not only from the NOW ticket. `extra` is appended as more query
 * (e.g. "e=busy").
 */
export function staysHref(tripId: string, extra = ""): string {
  return `/trips/${tripId}/discover?tab=bookings${extra ? `&${extra}` : ""}`;
}

/** Half the crew, rounded up — two to a room. At least one. */
export function defaultRooms(crew: number): number {
  return Math.max(1, Math.ceil(Math.max(1, crew) / 2));
}

/**
 * Sawia's reference for one tap — the partner's `label`, or a network's
 * `sid`. It's the only thread tying a partner report back to a trip, so it
 * carries no name or email: which button, and the first 8 characters of the
 * trip id. Kept well under the 64-character limits these fields have.
 */
export function stayRef(surface: string, tripId: string): string {
  return `sawia-${surface}-${tripId.replace(/-/g, "").slice(0, 8)}`;
}

/** The Booking.com search, filled in from the stay. No affiliate id here. */
export function bookingSearchUrl(args: {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  currency?: string | null;
  lang: "en" | "ar";
}): string {
  const p = new URLSearchParams({
    ss: args.city,
    checkin: args.checkIn,
    checkout: args.checkOut,
    group_adults: String(Math.max(1, args.adults)),
    no_rooms: String(Math.min(10, Math.max(1, args.rooms))),
    group_children: "0",
  });
  if (args.currency) p.set("selected_currency", args.currency);
  p.set("lang", args.lang === "ar" ? "ar" : "en-gb");
  return `https://www.booking.com/searchresults.html?${p.toString()}`;
}

export type AffiliateMode = "off" | "preview" | "live";

/**
 * Where the tap actually goes.
 *
 * preview — straight to the search: no tracking, no commission. For testing.
 * live    — through the network. The programme was approved through CJ, so
 *           attribution is CJ's redirect and its `sid`; Booking's own `aid`
 *           and `label` aren't ours to set. The template is whatever CJ's
 *           deep-link format turns out to be, with {url} and {sid} in it —
 *           so going live is a setting, not a rewrite.
 *
 * Returns null when a live link can't be built (no template) — the caller
 * must not silently send an untracked click it thinks is earning.
 */
export function outboundUrl(args: {
  mode: AffiliateMode;
  searchUrl: string;
  sid: string;
  template?: string | null;
}): string | null {
  if (args.mode === "off") return null;
  if (args.mode === "preview") return args.searchUrl;
  const t = args.template?.trim();
  if (!t || !t.includes("{url}")) return null;
  return t.replace("{url}", encodeURIComponent(args.searchUrl)).replace("{sid}", encodeURIComponent(args.sid));
}

/* ── Hotels in a stay's card ─────────────────────────────────────────────
 * Until Booking.com's own API is open to us, the hotels come from Google
 * Places (the same search Discover's Stay chip uses). What only Sawia can
 * add is where they sit against YOUR plan — so that's the ranking.
 */

/** [lng, lat] — Mapbox order, as Place.coords. */
export type LngLat = [number, number];

export interface HotelLite {
  placeId: string;
  name: string;
  rating: number | null;
  userRatingsTotal: number | null;
  coords: LngLat;
  placeTypes: string[];
}

export interface RankedHotel<H extends HotelLite = HotelLite> {
  hotel: H;
  /** Plan stops within NEAR_KM of it. */
  near: number;
  /** Distance to the closest plan stop, km; null when the stay has no stops. */
  nearestKm: number | null;
}

/** "Close to your plan" — about a 25-minute walk, or a short ride. */
export const NEAR_KM = 2;

const LODGING = /lodging|hotel|resort|inn|motel|hostel|guest_house|bed_and_breakfast|apartment|campground/;

/** A search for "hotels" still returns the odd restaurant or mall. */
export function isLodging(h: Pick<HotelLite, "placeTypes">): boolean {
  return h.placeTypes.some((t) => LODGING.test(t));
}

export function distanceKm(a: LngLat, b: LngLat): number {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Rating weighed by how many people gave it: a 4.9 from 12 isn't a 4.6 from 3,000. */
function quality(h: HotelLite): number {
  return (h.rating ?? 0) * Math.log10((h.userRatingsTotal ?? 0) + 10);
}

/**
 * Lodging only; with plan stops, the ones near the most stops first, then
 * the closest (to the kilometre), then the best-rated. With no stops yet, best-rated first.
 * Places with fewer than 20 ratings are dropped — too few to trust.
 */
export function rankHotels<H extends HotelLite>(hotels: H[], stops: LngLat[]): RankedHotel<H>[] {
  const pool = hotels.filter((h) => isLodging(h) && (h.userRatingsTotal ?? 0) >= 20);
  const ranked = pool.map((hotel) => {
    const ds = stops.map((s) => distanceKm(hotel.coords, s));
    return {
      hotel,
      near: ds.filter((d) => d <= NEAR_KM).length,
      nearestKm: ds.length ? Math.min(...ds) : null,
    };
  });
  // Distance counts in whole kilometres: 300 m either way shouldn't beat a
  // much better-rated hotel.
  const km = (r: RankedHotel<H>) => (r.nearestKm == null ? 0 : Math.round(r.nearestKm));
  return ranked.sort((a, b) => b.near - a.near || km(a) - km(b) || quality(b.hotel) - quality(a.hotel));
}
