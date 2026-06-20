"use client";

import { Heart, Check, MapPin, Plus } from "lucide-react";
import type { ScoredPlace } from "@/lib/discovery/score";
import { distanceKm } from "@/lib/discovery/score";
import { useT } from "@/components/i18n/locale-provider";
import { RatingPill, PriceLevel, TagChips } from "./primitives";

/**
 * Paxawa v2 — the canonical place card (design §4.1), editorial-airy language.
 *
 * Image-forward and confident: a large rounded photo hero with floating glass
 * controls, then a calm text block — name, rating, price, category, distance.
 * Soft elevation that lifts on hover (not V1's flat border). `data-place-id` is
 * read by the dwell tracker; hovering pulses the matching map pin.
 */
const CAT_KEY: Record<string, string> = {
  eat: "discover.catEat",
  coffee: "discover.catCoffee",
  sight: "discover.catSight",
  nightlife: "discover.catNightlife",
  shopping: "discover.catShopping",
  activity: "discover.catActivity",
  stay: "discover.catStay",
  other: "discover.catOther",
};

export function PlaceCard({
  scored,
  center,
  saved,
  added = false,
  onOpen,
  onSave,
  onAdd,
  onHover,
}: {
  scored: ScoredPlace;
  center: [number, number] | null;
  saved: boolean;
  added?: boolean;
  onOpen: (s: ScoredPlace) => void;
  onSave: (s: ScoredPlace) => void;
  onAdd?: (s: ScoredPlace) => void;
  onHover?: (placeId: string | null) => void;
}) {
  const t = useT();
  const p = scored.place;
  const photo = p.photoRef
    ? `/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=800`
    : null;
  const dist = center ? distanceKm(p.coords, center) : null;

  return (
    <article
      data-place-id={p.placeId}
      onClick={() => onOpen(scored)}
      onMouseEnter={() => onHover?.(p.placeId)}
      onMouseLeave={() => onHover?.(null)}
      className="group cursor-pointer rounded-3xl bg-card ring-1 ring-border/50 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/[0.06] hover:-translate-y-1 hover:ring-border transition-all duration-300"
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={p.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-[600ms] ease-out"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-violet-500/15 flex items-center justify-center text-4xl font-bold text-primary/30">
            {p.name.charAt(0)}
          </div>
        )}

        {/* Tags (top-start) */}
        <TagChips tags={scored.tags} className="absolute top-3 start-3" />

        {/* Glass controls (top-end) */}
        <div className="absolute top-3 end-3 flex items-center gap-1.5">
          {added ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white ps-2 pe-2.5 py-1 text-[11px] font-bold shadow-sm">
              <Check className="w-3.5 h-3.5" />
              {t("discover.addedBadge")}
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSave(scored);
              }}
              aria-label={t("discover.save")}
              className="w-9 h-9 rounded-full bg-white/85 dark:bg-black/55 backdrop-blur-md flex items-center justify-center text-foreground/80 shadow-sm hover:bg-white dark:hover:bg-black/70 hover:scale-105 transition-all"
            >
              <Heart className={`w-[18px] h-[18px] ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Calm text block */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 flex-1 tracking-[-0.01em]">
            {p.name}
          </h3>
          <RatingPill rating={p.rating} showReviews={false} className="shrink-0 mt-0.5" />
        </div>

        <div className="mt-2 flex items-center gap-x-2 gap-y-1 flex-wrap text-[12.5px] text-muted-foreground">
          <span className="font-medium text-foreground/70">{t(CAT_KEY[p.category] ?? CAT_KEY.other)}</span>
          {p.priceLevel != null && p.priceLevel > 0 && (
            <>
              <Dot />
              <PriceLevel level={p.priceLevel} className="text-[12.5px]" />
            </>
          )}
          {p.userRatingsTotal != null && (
            <>
              <Dot />
              <span className="tabular-nums">{compact(p.userRatingsTotal)}</span>
            </>
          )}
          {dist != null && (
            <>
              <Dot />
              <span className="inline-flex items-center gap-0.5 tabular-nums">
                <MapPin className="w-3.5 h-3.5" />
                {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
              </span>
            </>
          )}
        </div>

        {onAdd && !added && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdd(scored);
            }}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground/[0.04] hover:bg-primary/10 hover:text-primary text-foreground/80 font-semibold text-[13px] py-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("itinerary.addToDay")}
          </button>
        )}
      </div>
    </article>
  );
}

function Dot() {
  return <span className="text-border" aria-hidden>·</span>;
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
