import { findBaseByText, findRoutes, BASES } from "@/lib/packages/library";
import type { Base } from "@/lib/packages/types";

/**
 * Which city a destination string means.
 *
 * Written for the backfill that gave every pre-existing trip a shape — 42
 * of them, created before any of this existed, whose owners opened the app
 * after the release and correctly saw nothing new. A trip with no
 * `trip_segments` row has no shape, no city screen and no gateways, so the
 * whole rebuild was invisible to everyone who already had a trip.
 *
 * Destinations in the wild are messy: "Tokyo, Japan", "ماليزيا", "Tbilisi
 * International Airport, تبلّيسي، جورجيا", "Kuching, Sarawak, Malaysia",
 * and — genuinely — "Potato". The order below is the part that matters.
 */
export interface DestinationMatch {
  /** a curated base, when we have one */
  base: Base | null;
  /** otherwise the city the user typed, kept verbatim */
  customName: string;
  /** how we got there, for reporting */
  how: "city" | "route" | "typed";
}

export function baseForDestination(destination: string): DestinationMatch {
  // The city the user typed comes FIRST, and only the first part counts.
  //
  // Matching the whole string put a Kuching trip in Kuala Lumpur — a
  // different island, 1,600km away — because "Malaysia" matched. The head
  // of the string is what the person actually chose; everything after the
  // comma is the region and country that came with the autocomplete.
  const head = (destination || "").split(",")[0].trim();
  if (!head) return { base: null, customName: "", how: "typed" };

  const city = findBaseByText(head);
  if (city) return { base: city, customName: head, how: "city" };

  // A country-level destination ("Japan") has no base of its own, but its
  // curated route knows where a trip there opens. Only the head is used
  // here too, so a city inside a curated country does not get swallowed
  // by that country's route.
  const route = findRoutes(head)[0];
  const first = route ? BASES[route.legs[0].baseId] : undefined;
  if (first) return { base: first, customName: head, how: "route" };

  // Somewhere we do not curate. It is still a city you can sleep in.
  return { base: null, customName: head, how: "typed" };
}

/** The `custom:` id a typed city gets, matching what editShape writes. */
export function customBaseId(name: string): string {
  return (
    "custom:" +
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9؀-ۿ]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40)
  );
}
