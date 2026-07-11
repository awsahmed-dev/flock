"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Bookmark, PlusCircle, Star, MapPin } from "lucide-react";
import type { ScoredPlace } from "@/lib/discovery/score";
import { distanceKm } from "@/lib/discovery/score";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Paxawa v2 — the immersive place card (cinematic / TikTok-Reels language).
 *
 * The photo IS the card: full-bleed, bottom scrim with a big bold name + glass
 * meta pills, and a §1-C TikTok-style right-side action stack (like / save /
 * add). `data-place-id` is read by the dwell tracker.
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

const LIKE_COLOR = "#FF375F";
const ACCENT = "var(--clr-brand)";

export function PlaceCard({
  scored,
  center,
  saved,
  liked,
  likeCount,
  added = false,
  reason,
  onOpen,
  onSave,
  onLike,
  onHover,
  onLongPress,
}: {
  scored: ScoredPlace;
  center: [number, number] | null;
  saved: boolean;
  liked: boolean;
  likeCount: number;
  /** §10.7: this place is already in the itinerary this session. */
  added?: boolean;
  /** Phase 6 §5-G: the reason chip — never blank when provided. */
  reason?: string;
  onOpen: (s: ScoredPlace) => void;
  onSave: (s: ScoredPlace) => void;
  onLike: (s: ScoredPlace) => void;
  onHover?: (placeId: string | null) => void;
  /** Phase 6 §5-G: long-press → "Not interested" context sheet. */
  onLongPress?: (s: ScoredPlace) => void;
}) {
  const t = useT();
  const p = scored.place;
  // §10.6: shimmer skeleton until the photo lands, then a 250ms fade-in —
  // cards were rendering as blank dark rectangles for seconds.
  const [imgLoaded, setImgLoaded] = useState(false);
  // Cached images complete before React attaches onLoad — check on mount.
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setImgLoaded(true);
  }, []);
  // §5-G long-press detection — a held press opens the context sheet and
  // swallows the tap so the full-screen view doesn't also open.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
  function pressDown() {
    if (!onLongPress) return;
    longFired.current = false;
    pressTimer.current = setTimeout(() => {
      longFired.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
      onLongPress(scored);
    }, 450);
  }
  function pressClear() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }
  const photo = p.photoRef
    ? `/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=1000`
    : null;
  const dist = center ? distanceKm(p.coords, center) : null;
  const price = p.priceLevel != null && p.priceLevel > 0 ? "$".repeat(p.priceLevel) : null;

  return (
    <article
      data-place-id={p.placeId}
      onClick={() => {
        if (longFired.current) return;
        onOpen(scored);
      }}
      onPointerDown={pressDown}
      onPointerUp={pressClear}
      onPointerLeave={pressClear}
      onPointerCancel={pressClear}
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault();
          onLongPress(scored);
        }
      }}
      onMouseEnter={() => onHover?.(p.placeId)}
      onMouseLeave={() => onHover?.(null)}
      className="group relative w-full h-full overflow-hidden cursor-pointer bg-neutral-900 select-none"
    >
      {photo ? (
        <>
          {!imgLoaded && (
            <div className="absolute inset-0 animate-pulse" style={{ background: "var(--muted)" }} />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={photo}
            alt={p.name}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
            style={{ opacity: imgLoaded ? 1 : 0, transition: "opacity 250ms ease" }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-primary/60 flex items-center justify-center text-7xl font-bold text-white/30">
          {p.name.charAt(0)}
        </div>
      )}

      {/* Cinematic scrim — strong at bottom, faint at top. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/35 pointer-events-none" />
      {/* §1-C: left-fading gradient so the right action stack stays readable. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to left, rgba(0,0,0,0.45) 0%, transparent 45%)" }}
      />

      {/* §1-C: right-side action stack (like / save / add). */}
      <div className="absolute end-3 bottom-8 z-20 flex flex-col items-center gap-4">
        <ActionIcon
          icon={Heart}
          count={likeCount}
          active={liked}
          activeColor={LIKE_COLOR}
          label={t("discover.like")}
          onClick={(e) => { e.stopPropagation(); onLike(scored); }}
        />
        <ActionIcon
          icon={Bookmark}
          count={null}
          active={saved}
          activeColor={ACCENT}
          label={t("discover.save")}
          onClick={(e) => { e.stopPropagation(); onSave(scored); }}
        />
        <ActionIcon
          icon={PlusCircle}
          count={null}
          active={false}
          activeColor={ACCENT}
          label={t("discover.addToDay")}
          onClick={(e) => { e.stopPropagation(); onOpen(scored); }}
        />
      </div>

      {/* §10.7: "In plan" chip — the add is traceable without leaving the feed. */}
      {added && (
        <span
          className="absolute top-3 start-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold pointer-events-none"
          style={{ background: "rgba(52,199,89,0.90)", color: "#fff" }}
        >
          ✓ {t("discover.inPlan")}
        </span>
      )}

      {/* Powered-by-Google attribution. */}
      <span className="absolute bottom-1.5 start-3 z-10 text-[10px] text-white/45 pointer-events-none">
        {t("discover.poweredBy")} <span className="font-semibold">Google</span>
      </span>

      {/* Bottom content — pe-16 leaves room for the action stack on the end. */}
      <div className="absolute inset-x-0 bottom-0 ps-5 pe-16 pt-5 pb-7">
        <h3 className="text-white font-bold text-2xl sm:text-[1.7rem] leading-[1.1] tracking-[-0.02em] drop-shadow-sm line-clamp-2">
          {p.name}
        </h3>
        {/* §5-G reason chip — why this card, in one phrase. */}
        {reason && (
          <span
            className="inline-block mt-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={
              reason.startsWith("Wild card")
                ? { border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.7)" }
                : { background: "var(--clr-brand-dim)", color: "var(--clr-brand)" }
            }
          >
            {reason}
          </span>
        )}
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

function ActionIcon({
  icon: Icon,
  count,
  active,
  activeColor,
  label,
  onClick,
}: {
  icon: typeof Heart;
  count: number | null;
  active: boolean;
  activeColor: string;
  label: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
    >
      <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.40)" }}>
        <Icon size={20} color={active ? activeColor : "white"} fill={active ? activeColor : "none"} strokeWidth={1.75} />
      </span>
      {count != null && (
        <span className="text-[11px] font-semibold text-white leading-none">
          {count > 0 ? compact(count) : ""}
        </span>
      )}
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
