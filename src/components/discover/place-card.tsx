"use client";

import { Heart, Plus, Check, Star, MapPin, Sparkles, Info } from "lucide-react";
import type { ScoredPlace } from "@/lib/discovery/score";
import { distanceKm } from "@/lib/discovery/score";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Paxawa v2 — the immersive place card (cinematic / TikTok-Reels language).
 *
 * The photo IS the card: full-bleed, with a bottom scrim carrying a big bold
 * name and glass meta pills, a TikTok-style right action rail (save / add), and
 * floating tags. Built to fill the viewport in a vertical snap-scroll stream
 * (the next card peeks below). `data-place-id` is read by the dwell tracker.
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
    ? `/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=1000`
    : null;
  const dist = center ? distanceKm(p.coords, center) : null;
  const price = p.priceLevel != null && p.priceLevel > 0 ? "$".repeat(p.priceLevel) : null;

  return (
    <article
      data-place-id={p.placeId}
      onClick={() => onOpen(scored)}
      onMouseEnter={() => onHover?.(p.placeId)}
      onMouseLeave={() => onHover?.(null)}
      className="group relative snap-start snap-always shrink-0 w-full h-[78vh] sm:h-[80vh] rounded-[1.75rem] overflow-hidden cursor-pointer ring-1 ring-white/10 bg-neutral-900 select-none"
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={p.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-violet-700/40 flex items-center justify-center text-7xl font-bold text-white/30">
          {p.name.charAt(0)}
        </div>
      )}

      {/* Cinematic scrim — strong at bottom, faint at top for tag legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/35 pointer-events-none" />

      {/* Tags (top-start) */}
      <div className="absolute top-4 start-4 flex flex-wrap gap-1.5">
        {scored.tags.includes("ai_pick") && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md text-white px-3 py-1.5 text-xs font-bold ring-1 ring-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            {t("discover.tagAiPick")}
          </span>
        )}
        {scored.tags.includes("hidden_gem") && (
          <span className="rounded-full bg-amber-400/90 backdrop-blur-md text-amber-950 px-3 py-1.5 text-xs font-bold">
            {t("discover.tagHiddenGem")}
          </span>
        )}
        {scored.tags.includes("crew_favorite") && (
          <span className="rounded-full bg-cyan-400/90 backdrop-blur-md text-cyan-950 px-3 py-1.5 text-xs font-bold">
            {t("discover.tagCrewFav")}
          </span>
        )}
      </div>

      {/* Right action rail (TikTok-style) */}
      <div className="absolute end-3.5 bottom-32 sm:bottom-28 flex flex-col items-center gap-3.5">
        <RailButton
          onClick={(e) => { e.stopPropagation(); onSave(scored); }}
          label={t("discover.save")}
          active={saved}
        >
          <Heart className={`w-6 h-6 ${saved ? "fill-rose-500 text-rose-500" : "text-white"}`} />
        </RailButton>
        {onAdd && (
          <RailButton
            onClick={(e) => { e.stopPropagation(); if (!added) onAdd(scored); }}
            label={added ? t("discover.addedBadge") : t("itinerary.addToDay")}
            active={added}
            accent={!added}
          >
            {added ? <Check className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
          </RailButton>
        )}
        <RailButton onClick={(e) => { e.stopPropagation(); onOpen(scored); }} label={t("discover.details")}>
          <Info className="w-6 h-6 text-white" />
        </RailButton>
      </div>

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 p-5 pe-20">
        <h3 className="text-white font-bold text-2xl sm:text-[1.7rem] leading-[1.1] tracking-[-0.02em] drop-shadow-sm line-clamp-2">
          {p.name}
        </h3>
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          {p.rating != null && (
            <Pill>
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span className="font-bold tabular-nums">{p.rating.toFixed(1)}</span>
              {p.userRatingsTotal != null && (
                <span className="text-white/60">· {compact(p.userRatingsTotal)}</span>
              )}
            </Pill>
          )}
          <Pill>{t(CAT_KEY[p.category] ?? CAT_KEY.other)}</Pill>
          {price && <Pill><span className="text-emerald-300 font-bold">{price}</span></Pill>}
          {dist != null && dist < 60 && (
            <Pill>
              <MapPin className="w-3.5 h-3.5" />
              <span className="tabular-nums">{dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}</span>
            </Pill>
          )}
        </div>
        {p.topTip && (
          <p className="mt-2.5 text-[13px] text-white/80 leading-snug line-clamp-2 max-w-md italic">
            “{p.topTip}”
          </p>
        )}
      </div>
    </article>
  );
}

function RailButton({
  children,
  onClick,
  label,
  active = false,
  accent = false,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  active?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`w-12 h-12 rounded-full backdrop-blur-xl flex items-center justify-center shadow-lg ring-1 transition-all hover:scale-110 active:scale-95 ${
        accent
          ? "bg-gradient-to-br from-primary to-violet-600 ring-white/20"
          : active
            ? "bg-white/25 ring-white/30"
            : "bg-black/35 ring-white/15 hover:bg-black/50"
      }`}
    >
      {children}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md text-white px-2.5 py-1 text-[12.5px] ring-1 ring-white/15">
      {children}
    </span>
  );
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
