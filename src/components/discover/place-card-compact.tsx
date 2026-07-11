"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Star, MapPin, Check } from "lucide-react";
import type { ScoredPlace } from "@/lib/discovery/score";
import { useT } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { shortLocality } from "@/lib/places/short-locality";

const CAT_KEY: Record<string, string> = {
  eat: "discover.catEat", coffee: "discover.catCoffee", sight: "discover.catSight",
  nightlife: "discover.catNightlife", shopping: "discover.catShopping", activity: "discover.catActivity",
};

/**
 * Paxawa v2 — the DESKTOP compact place card (design §4.1 / §5: desktop Discover
 * is a card grid beside the map, not a stretched phone). The immersive full-bleed
 * `PlaceCard` stays the mobile design; this is its calm, light grid-cell sibling:
 * photo · save · rating · name · price/area, tap → the same detail panel. Pure
 * presentational — all signals flow through the parent's handlers.
 */
export function PlaceCardCompact({
  scored, saved, added, onOpen, onSave, onHover,
}: {
  scored: ScoredPlace;
  saved: boolean;
  added: boolean;
  onOpen: (s: ScoredPlace) => void;
  onSave: (s: ScoredPlace) => void;
  onHover: (id: string | null) => void;
}) {
  const t = useT();
  const [imgLoaded, setImgLoaded] = useState(false);
  // Cached images complete before React attaches onLoad — check on mount.
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setImgLoaded(true);
  }, []);
  const p = scored.place;
  const photo = p.photoRef ? `/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=500` : null;
  const price = p.priceLevel != null && p.priceLevel > 0 ? "$".repeat(p.priceLevel) : null;

  return (
    <button
      type="button"
      onClick={() => onOpen(scored)}
      onMouseEnter={() => onHover(p.placeId)}
      onMouseLeave={() => onHover(null)}
      className="group text-start rounded-2xl ring-1 ring-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:ring-border transition-all"
    >
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {photo ? (
          <>
            {/* Branded shimmer skeleton until the photo decodes — never a flat
                gray box (brief §4.5). The image fades in over it on load. */}
            {!imgLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/60 to-muted" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={photo}
              alt={p.name}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105",
                imgLoaded ? "opacity-100" : "opacity-0",
              )}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/10 text-3xl font-bold text-primary/40">
            {p.name.charAt(0)}
          </div>
        )}
        {/* Fix 2 (pass 2): editorial "AI pick" badge removed for consistency
            with the immersive card — no editorial label on cards. */}
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); onSave(scored); }}
          aria-label={t("discover.save")}
          className="absolute top-2 end-2 w-9 h-9 rounded-full bg-black/45 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <Heart className={cn("w-4 h-4", saved && "fill-rose-500 text-rose-500")} />
        </span>
        {p.rating != null && (
          <span className="absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-white text-xs font-bold tabular-nums">
            <Star className="w-3 h-3 fill-amber-300 text-amber-300" />{p.rating.toFixed(1)}
          </span>
        )}
        {added && (
          <span className="absolute bottom-2 end-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white" aria-label={t("discover.save")}>
            <Check className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-bold text-sm leading-snug line-clamp-1">{p.name}</p>
        <div className="mt-1 flex items-center gap-x-2 text-xs text-muted-foreground min-w-0">
          {price && <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">{price}</span>}
          <span className="inline-flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            {/* §10.6: derived "{locality} · {type}" — never the raw Google
                address string. Full address lives in the detail drawer. */}
            <span className="line-clamp-1">
              {[shortLocality(p.address), t(CAT_KEY[p.category] ?? CAT_KEY.eat)]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}
