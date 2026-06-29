"use client";

import { Heart, Star, MapPin, Sparkles } from "lucide-react";
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
  onOpen,
  onSave,
  onHover,
}: {
  scored: ScoredPlace;
  center: [number, number] | null;
  saved: boolean;
  onOpen: (s: ScoredPlace) => void;
  onSave: (s: ScoredPlace) => void;
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
      className="group relative w-full h-full overflow-hidden cursor-pointer bg-neutral-900 select-none"
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

      {/* Save — the only on-card action (the side rail was removed so nothing
          blocks the photo). Add-to-day / Suggest-to-crew live in the detail
          sheet, opened by tapping the card. 44×44 tap target, white icon. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSave(scored); }}
        aria-label={t("discover.save")}
        className="absolute top-4 end-4 z-10 w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center ring-1 ring-white/15 active:scale-90 transition-transform"
      >
        <Heart className={`w-6 h-6 ${saved ? "fill-rose-500 text-rose-500" : "text-white"}`} />
      </button>

      {/* Powered-by-Google attribution — inside the card overlay, bottom-end. */}
      <span className="absolute bottom-1.5 end-3 z-10 text-[10px] text-white/45 pointer-events-none">
        {t("discover.poweredBy")} <span className="font-semibold">Google</span>
      </span>

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 ps-5 pe-5 pt-5 pb-7">
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
