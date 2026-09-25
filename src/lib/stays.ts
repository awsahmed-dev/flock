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
