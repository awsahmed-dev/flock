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
}

/** Props shared by all four phase cockpits (assembled by the trip page). */
export interface CockpitShared {
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
  readiness: number;
  ticker: { text: string; eventType: string } | null;
  teaser: TeaserPlace[];
  anchors: CockpitAnchor[];
  /** Phase 7 §5: open Huddle decisions — drives the ONE primary action. */
  huddleOpen: number;
}
