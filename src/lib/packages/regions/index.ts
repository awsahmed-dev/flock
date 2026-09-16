import type { Base, BaseId, Route } from "@/lib/packages/types";

/**
 * A curated region: the places you can sleep in, and the routes through
 * them. Regions are separate modules so the corpus can grow a destination
 * at a time without every addition rewriting one enormous file.
 */
export interface Region {
  bases: Record<BaseId, Base>;
  routes: Route[];
}

/** Every region we curate. Add a module and list it here. */
export const REGIONS: Region[] = [];
