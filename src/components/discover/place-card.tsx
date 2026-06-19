"use client";

import { Star, Heart, Sparkles, MapPin, Check } from "lucide-react";
import type { ScoredPlace } from "@/lib/discovery/score";
import { distanceKm } from "@/lib/discovery/score";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Paxawa v2 — the Discover place card (design-system §4.1).
 *
 * Real photo · name · rating + review count · price · category · distance,
 * with contextual tags (✨ AI pick / Hidden gem / Crew favorite). `data-place-id`
 * is read by the dwell tracker. Hover lifts + scales the photo.
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
}: {
  scored: ScoredPlace;
  center: [number, number] | null;
  saved: boolean;
  added?: boolean;
  onOpen: (s: ScoredPlace) => void;
  onSave: (s: ScoredPlace) => void;
}) {
  const t = useT();
  const p = scored.place;
  const photo = p.photoRef
    ? `/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=600`
    : null;
  const dist = center ? distanceKm(p.coords, center) : null;
  const price = p.priceLevel != null && p.priceLevel > 0 ? "$".repeat(p.priceLevel) : null;

  return (
    <article
      data-place-id={p.placeId}
      onClick={() => onOpen(scored)}
      className="group cursor-pointer rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 transition-all"
    >
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={p.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center text-3xl font-bold text-primary/40">
            {p.name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        {/* Tags (top-start) */}
        <div className="absolute top-2.5 start-2.5 flex flex-col items-start gap-1">
          {added && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-bold shadow">
              <Check className="w-3 h-3" />
              {t("discover.addedBadge")}
            </span>
          )}
          {scored.tags.includes("ai_pick") && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-violet-600 text-white px-2 py-0.5 text-[10px] font-bold shadow">
              <Sparkles className="w-3 h-3" />
              {t("discover.tagAiPick")}
            </span>
          )}
          {scored.tags.includes("hidden_gem") && (
            <span className="rounded-full bg-amber-500/90 backdrop-blur text-white px-2 py-0.5 text-[10px] font-bold">
              {t("discover.tagHiddenGem")}
            </span>
          )}
          {scored.tags.includes("crew_favorite") && (
            <span className="rounded-full bg-cyan-500/90 backdrop-blur text-white px-2 py-0.5 text-[10px] font-bold">
              {t("discover.tagCrewFav")}
            </span>
          )}
        </div>

        {/* Save (top-end) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSave(scored);
          }}
          className="absolute top-2.5 end-2.5 w-8 h-8 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-black/45 transition-colors"
          aria-label={t("discover.save")}
        >
          <Heart className={`w-4 h-4 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-sm leading-snug line-clamp-2 flex-1">{p.name}</p>
          {p.rating != null && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-bold tabular-nums">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {p.rating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap mt-1 text-[11px] text-muted-foreground">
          <span className="font-medium">{t(CAT_KEY[p.category] ?? CAT_KEY.other)}</span>
          {price && (
            <>
              <span>·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{price}</span>
            </>
          )}
          {p.userRatingsTotal != null && (
            <>
              <span>·</span>
              <span className="tabular-nums">{compact(p.userRatingsTotal)}</span>
            </>
          )}
          {dist != null && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5 tabular-nums">
                <MapPin className="w-3 h-3" />
                {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
