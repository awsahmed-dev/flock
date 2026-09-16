import type { Base, BaseId, Route } from "@/lib/packages/types";
import { IBERIA, IBERIA_COORDS } from "@/lib/packages/regions/iberia";
import { BRITAIN_FRANCE, BRITAIN_FRANCE_COORDS } from "@/lib/packages/regions/britain-france";
import { BALKANS, BALKANS_COORDS } from "@/lib/packages/regions/balkans";
import { MALAYSIA, MALAYSIA_COORDS } from "@/lib/packages/regions/malaysia";
import { THAILAND, THAILAND_COORDS } from "@/lib/packages/regions/thailand";
import { INDONESIA_MALDIVES, INDONESIA_MALDIVES_COORDS } from "@/lib/packages/regions/indonesia-maldives";
import { GULF, GULF_COORDS } from "@/lib/packages/regions/gulf";
import { EGYPT, EGYPT_COORDS } from "@/lib/packages/regions/egypt";

/**
 * A curated region: the places you can sleep in, and the routes through
 * them. Regions are separate modules so the corpus can grow a destination
 * at a time without every addition rewriting one enormous file — and so
 * two people can add two countries without colliding.
 */
export interface Region {
  bases: Record<BaseId, Base>;
  routes: Route[];
}

/** Every region we curate. Add a module, import it, list it here. */
export const REGIONS: Region[] = [
  IBERIA,
  BRITAIN_FRANCE,
  BALKANS,
  MALAYSIA,
  THAILAND,
  INDONESIA_MALDIVES,
  GULF,
  EGYPT,
];

/**
 * Coordinates for the places those regions name. Kept beside the content
 * rather than in the central table for the same reason the content is:
 * a new destination should be one new file, not an edit to three.
 */
export const REGION_COORDS: Record<string, readonly [number, number]> = {
  ...IBERIA_COORDS,
  ...BRITAIN_FRANCE_COORDS,
  ...BALKANS_COORDS,
  ...MALAYSIA_COORDS,
  ...THAILAND_COORDS,
  ...INDONESIA_MALDIVES_COORDS,
  ...GULF_COORDS,
  ...EGYPT_COORDS,
};
