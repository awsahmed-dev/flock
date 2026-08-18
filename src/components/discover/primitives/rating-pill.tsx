"use client";

import { Star } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * Canonical rating display — star + score + optional compact review count.
 * Used on the place card, the detail panel, and the chat decision card so the
 * "real rating, real proof" signal looks identical everywhere (design §7).
 */
export function RatingPill({
  rating,
  reviews,
  showReviews = true,
  className,
}: {
  rating: number | null | undefined;
  reviews?: number | null;
  showReviews?: boolean;
  className?: string;
}) {
  if (rating == null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-bold tabular-nums",
        className,
      )}
    >
      <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
      {rating.toFixed(1)}
      {showReviews && reviews != null && (
        <span className="font-normal text-muted-foreground">({compactCount(reviews)})</span>
      )}
    </span>
  );
}

/** 6432 → "6.4k", 980 → "980". */
export function compactCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
