/**
 * Paxawa v2 — canonical place primitives (design §7).
 *
 * One version each of the small building blocks, so cards/panels/decision-cards
 * stop re-inventing them. Import from here everywhere a place renders:
 *   import { RatingPill, PriceLevel, TagChips, CategoryChips } from "@/components/discover/primitives";
 */
export { RatingPill, compactCount } from "./rating-pill";
export { PriceLevel } from "./price-level";
export { TagChip, TagChips, type PlaceTag } from "./tag-chip";
export {
  CategoryChips,
  PLACE_CATEGORIES,
  type PlaceCategoryKey,
} from "./category-chips";
export { SkeletonCard, SkeletonGrid } from "./skeleton-card";
export { EmptyState } from "./empty-state";
export { PoweredByGoogle } from "./powered-by-google";
