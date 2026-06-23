"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Canonical category chips — **filters over the live feed**, not a precondition
 * for content (the feed opens on a seed; chips refine it). "All" is the default.
 * Used by the Discover feed; horizontally scrollable on mobile (design §4.1,
 * planning §3.2). The user's note: a smart list that learns, with chips as a
 * filter — never a search bar you must type into first.
 */
export const PLACE_CATEGORIES = [
  "eat",
  "coffee",
  "sight",
  "nightlife",
  "shopping",
  "activity",
  // §A1: hotel discovery is EVICTED from Bookings and lives here as a Discover
  // category, ranked by the same taste brain (server prompt "best hotels and
  // places to stay" already exists in discovery/seed.ts). Tucked in the Filters
  // disclosure, not the inline strip.
  "stay",
] as const;

export type PlaceCategoryKey = (typeof PLACE_CATEGORIES)[number];

const CAT_LABEL: Record<PlaceCategoryKey, string> = {
  eat: "discover.catEat",
  coffee: "discover.catCoffee",
  sight: "discover.catSight",
  nightlife: "discover.catNightlife",
  shopping: "discover.catShopping",
  activity: "discover.catActivity",
  stay: "discover.catStay",
};

/** `null` value = "All". */
export function CategoryChips({
  value,
  onChange,
  includeAll = true,
  className,
}: {
  value: PlaceCategoryKey | null;
  onChange: (next: PlaceCategoryKey | null) => void;
  includeAll?: boolean;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cn("-mx-1 px-1 overflow-x-auto scrollbar-none", className)}>
      <div className="inline-flex items-center gap-1.5">
        {includeAll && (
          <Chip active={value === null} onClick={() => onChange(null)} label={t("discover.catAll")} />
        )}
        {PLACE_CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            active={value === cat}
            onClick={() => onChange(cat)}
            label={t(CAT_LABEL[cat])}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
        active
          ? "bg-foreground text-background"
          : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
