import type { NowItem } from "@/components/trips/now-cockpit";

/** Phase 6 §3: crew member as rendered in cockpit strips + awards. */
export interface CockpitCrew {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

/** §6: a booking-anchor stop with its booking details, for the Departure
 *  Board and travel-day sheet modes. */
export interface CockpitAnchor {
  id: string;
  dayDate: string;
  title: string;
  stopType: string; // booking_flight | booking_stay | booking_other
  startTime: string | null;
  confirmationNumber: string | null;
  providerName: string | null;
  pdfUrl: string | null;
  nights: number | null;
}

/** Crew-hearted place for the Discover teaser / free-day ideas. */
export interface TeaserPlace {
  placeId: string;
  name: string;
  photoRef: string | null;
  rating: number | null;
  hearts: number;
  /** Enough of the cached snapshot to add the place to today in one tap. */
  category?: string;
  placeTypes?: string[];
  coords?: [number, number] | null;
  address?: string | null;
  priceLevel?: number | null;
  userRatingsTotal?: number | null;
  hoursSummary?: string | null;
  topTip?: string | null;
}

/** Props shared by all four phase cockpits (assembled by the trip page). */
export interface CockpitShared {
  /**
   * fix/tz: today ("YYYY-MM-DD") as the server resolved it in the traveller's
   * zone. Every cockpit is a client component rendered from a server page, so
   * anything that computes "today" itself flips on hydration.
   */
  todayIso: string;
  tripId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  heroImageUrl: string | null;
  currency: string;
  budgetTotal: number | null;
  days: string[];
  items: NowItem[];
  crew: CockpitCrew[];
  packing: { packed: number; total: number };
  spent: number;
  ticker: { text: string; eventType: string } | null;
  teaser: TeaserPlace[];
  /** Sprint 5: documents replaced booking anchors on every cockpit. */
  documents: { id: string; title: string; type: string | null; url: string; dayDate: string | null }[];
  /** Phase 7 §5: open Huddle decisions — drives the ONE primary action. */
  huddleOpen: number;
  /** Step 4 deck facts (soft, may be null). */
  weather: { tempMax: number; tempMin: number | null; key: string; sunset: string | null; isTripDay: boolean } | null;
  fx: { local: string; symbol: string; perUnit: number; base: string } | null;
}
