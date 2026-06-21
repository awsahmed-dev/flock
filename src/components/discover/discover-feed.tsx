"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Search, X, Loader2, Compass, AlertCircle, Map as MapIcon, Sparkles, Heart, Star, MapPin } from "lucide-react";
import type { Place, PlaceFeatures } from "@/lib/places/types";
import type { ScoredPlace } from "@/lib/discovery/score";
import type { PlanMapItem } from "@/components/map/mapbox-plan-map";
import { rankFeed } from "@/lib/discovery/client/rank-feed";
import { useTasteSession } from "@/lib/discovery/client/use-taste-session";
import { useDwellTracker } from "@/lib/discovery/client/use-dwell-tracker";
import { useT } from "@/components/i18n/locale-provider";
import { PlaceCard } from "./place-card";
import { PlaceDetailPanel } from "./place-detail-panel";
import { PLACE_CATEGORIES, type PlaceCategoryKey } from "./primitives";

/**
 * Paxawa v2 — Discover, cinematic/immersive (TikTok-Reels language).
 *
 * A dark cinematic stage. Opens FULL on the cold-start seed (never a blank
 * search box). Full-bleed photo cards in a vertical stream — one place fills the
 * view, the next peeks. Glass category-filter chips + a Map toggle float on top;
 * search is a secondary affordance. The feed learns live as you dwell. A bold
 * departure from V1 — the photo is the experience.
 */
const MapboxPlanMap = dynamic(
  () => import("@/components/map/mapbox-plan-map").then((m) => m.MapboxPlanMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-neutral-800 animate-pulse" /> },
);

const DISCOVER_DAY = "discover";
const CAT_KEY: Record<string, string> = {
  eat: "discover.catEat", coffee: "discover.catCoffee", sight: "discover.catSight",
  nightlife: "discover.catNightlife", shopping: "discover.catShopping", activity: "discover.catActivity",
};

type FetchState = "idle" | "loading" | "error" | "capped" | "unconfigured";

export function DiscoverFeed({
  tripId, destination, center, days,
}: {
  tripId: string;
  destination: string;
  center: [number, number] | null;
  days: string[];
}) {
  const t = useT();
  const { vector, emit } = useTasteSession(tripId);

  const [category, setCategory] = useState<PlaceCategoryKey | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [candidates, setCandidates] = useState<Place[]>([]);
  const [state, setState] = useState<FetchState>("loading");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [openPlace, setOpenPlace] = useState<ScoredPlace | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [view, setView] = useState<"stream" | "map">("stream");

  const searching = query.trim().length >= 2;

  const [rankVector, setRankVector] = useState(vector);
  useEffect(() => {
    const id = setTimeout(() => setRankVector(vector), 600);
    return () => clearTimeout(id);
  }, [vector]);

  const seenRef = useRef<Set<string>>(new Set());
  const lastOrderRef = useRef<string[]>([]);

  const ranked = useMemo<ScoredPlace[]>(() => {
    const r = rankFeed(candidates, {
      vector: rankVector,
      mode: searching ? "search" : "browse",
      ref: center,
      frozenIds: seenRef.current,
      priorOrder: lastOrderRef.current,
    });
    lastOrderRef.current = r.map((s) => s.place.placeId);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, rankVector, searching, center]);

  const featuresRef = useRef<Map<string, PlaceFeatures>>(new Map());
  featuresRef.current = useMemo(
    () => new Map(ranked.map((s) => [s.place.placeId, s.features])),
    [ranked],
  );

  const handleDwell = useCallback(
    (placeId: string, dwellMs: number) => {
      seenRef.current.add(placeId);
      const f = featuresRef.current.get(placeId);
      if (f) emit("card_dwell", { placeId, features: f, payload: { dwellMs } });
    },
    [emit],
  );
  const { containerRef } = useDwellTracker(handleDwell);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchFeed = useCallback(
    async (q: string, cat: PlaceCategoryKey | null) => {
      setState("loading");
      seenRef.current = new Set();
      lastOrderRef.current = [];
      try {
        let url: string;
        if (q.trim().length >= 2) {
          const p = new URLSearchParams({ q });
          if (center) { p.set("lng", String(center[0])); p.set("lat", String(center[1])); }
          url = `/api/discover/search?${p}`;
        } else {
          const p = new URLSearchParams({ destination });
          if (cat) p.set("category", cat);
          if (center) { p.set("lng", String(center[0])); p.set("lat", String(center[1])); }
          url = `/api/discover/feed?${p}`;
        }
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (res.status === 503 && data?.code === "places_not_configured") {
          setState("unconfigured"); setCandidates([]); return;
        }
        if (!res.ok) { setState("error"); return; }
        setCandidates(data.places ?? []);
        setState(data.capped ? "capped" : "idle");
      } catch {
        setState("error");
      }
    },
    [center, destination],
  );

  useEffect(() => {
    if (searching) return;
    void fetchFeed("", category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    if (!searching) {
      if (query.trim().length === 0) void fetchFeed("", category);
      return;
    }
    const id = setTimeout(() => void fetchFeed(query, category), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ── Signals ────────────────────────────────────────────────────────────────
  const onOpen = useCallback(
    (s: ScoredPlace) => { emit("card_open", { placeId: s.place.placeId, features: s.features }); setOpenPlace(s); },
    [emit],
  );
  const onAdded = useCallback(
    (placeId: string) => {
      setAdded((prev) => new Set(prev).add(placeId));
      const f = featuresRef.current.get(placeId);
      if (f) emit("place_add", { placeId, features: f });
    },
    [emit],
  );
  const onSave = useCallback(
    (s: ScoredPlace) => {
      setSaved((prev) => {
        const next = new Set(prev);
        if (next.has(s.place.placeId)) next.delete(s.place.placeId);
        else { next.add(s.place.placeId); emit("place_save", { placeId: s.place.placeId, features: s.features }); }
        return next;
      });
    },
    [emit],
  );
  // Quick-add from the card rail: lands on day 1 (the detail panel lets you pick).
  const onQuickAdd = useCallback((s: ScoredPlace) => onOpen(s), [onOpen]);

  // ── Map adapter ──────────────────────────────────────────────────────────
  const mapItems = useMemo<PlanMapItem[]>(
    () =>
      ranked
        .filter((s) => Number.isFinite(s.place.coords[1]) && Number.isFinite(s.place.coords[0]))
        .map((s) => ({
          id: s.place.placeId, title: s.place.name, type: s.place.category,
          status: added.has(s.place.placeId) ? "confirmed" : "proposed",
          dayDate: DISCOVER_DAY, startTime: null, costEstimate: null, bookingUrl: null,
          locationName: s.place.address, lat: s.place.coords[1], lng: s.place.coords[0],
          photoUrl: s.place.photoRef ? `/api/discover/photo?ref=${encodeURIComponent(s.place.photoRef)}&w=400` : null,
          rating: s.place.rating, fsqCategory: s.place.category,
        })),
    [ranked, added],
  );
  // Map carousel: a card strip floats over the map, synced to the pins. Tapping
  // a pin focuses its card; swiping the strip highlights the matching pin.
  const mapCarouselRef = useRef<HTMLDivElement>(null);
  const focusCarousel = useCallback(
    (placeId: string) => {
      const idx = ranked.findIndex((r) => r.place.placeId === placeId);
      if (idx < 0) return;
      setHighlightedId(placeId);
      (mapCarouselRef.current?.children[idx] as HTMLElement | undefined)?.scrollIntoView({
        behavior: "smooth", inline: "center", block: "nearest",
      });
    },
    [ranked],
  );
  const onCarouselScroll = useCallback(() => {
    const el = mapCarouselRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = (child as HTMLElement).offsetLeft + (child as HTMLElement).clientWidth / 2;
      const d = Math.abs(c - center);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    const id = ranked[best]?.place.placeId;
    if (id) setHighlightedId(id);
  }, [ranked]);

  const chips: (PlaceCategoryKey | null)[] = [null, ...PLACE_CATEGORIES];

  return (
    <div className="relative rounded-none ring-0 sm:rounded-[2rem] sm:ring-1 sm:ring-white/10 bg-neutral-950 overflow-hidden">
      {/* Floating controls */}
      <div className="absolute inset-x-0 top-0 z-20 p-3 sm:p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 -mx-1 px-1 overflow-x-auto scrollbar-none">
            <div className="inline-flex items-center gap-1.5">
              {chips.map((c) => {
                const active = category === c && !searching;
                return (
                  <button
                    key={c ?? "all"}
                    type="button"
                    onClick={() => { setQuery(""); setSearchOpen(false); setCategory(c); }}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ring-1 ${
                      active
                        ? "bg-white text-neutral-900 ring-white"
                        : "bg-white/10 text-white/90 ring-white/15 backdrop-blur-md hover:bg-white/20"
                    }`}
                  >
                    {c === null ? t("discover.catAll") : t(CAT_KEY[c])}
                  </button>
                );
              })}
            </div>
          </div>

          {searchOpen || searching ? (
            <div className="relative shrink-0 w-40 sm:w-56">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => !query && setSearchOpen(false)}
                placeholder={t("discover.searchPlaceholder")}
                className="w-full rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15 text-white placeholder:text-white/50 ps-9 pe-8 py-2 text-sm outline-none focus:ring-white/40"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(""); setSearchOpen(false); }}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white" aria-label={t("common.clear")}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <GlassBtn onClick={() => setSearchOpen(true)} label={t("discover.searchPlaceholder")}>
              <Search className="w-4.5 h-4.5" />
            </GlassBtn>
          )}
          <GlassBtn onClick={() => setView((v) => (v === "stream" ? "map" : "stream"))} label={t(view === "stream" ? "discover.viewMap" : "discover.viewList")} active={view === "map"}>
            <MapIcon className="w-4.5 h-4.5" />
          </GlassBtn>
        </div>
      </div>

      {/* Notices */}
      {state !== "idle" && state !== "loading" && (
        <div className="absolute inset-x-0 top-16 z-20 px-4">
          <Notice text={t(state === "unconfigured" ? "discover.unconfigured" : state === "capped" ? "discover.capped" : "discover.error")} />
        </div>
      )}

      {/* Map view — pins + a floating card carousel synced to them */}
      {view === "map" ? (
        <div className="relative h-[80svh] sm:h-[72svh]">
          <MapboxPlanMap
            items={mapItems} destinationCenter={center} focusedDay={DISCOVER_DAY}
            highlightedItemId={highlightedId} onItemClick={focusCarousel} days={[DISCOVER_DAY]}
            showRoutes={false} pinColor="#f97316" numbered={false}
          />
          {ranked.length > 0 && (
            <div
              ref={mapCarouselRef}
              onScroll={onCarouselScroll}
              className="absolute inset-x-0 bottom-4 z-10 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none px-[11%]"
            >
              {ranked.map((s) => {
                const photo = s.place.photoRef
                  ? `/api/discover/photo?ref=${encodeURIComponent(s.place.photoRef)}&w=500`
                  : null;
                const isSaved = saved.has(s.place.placeId);
                const focused = highlightedId === s.place.placeId;
                return (
                  <button
                    key={s.place.placeId}
                    type="button"
                    onClick={() => onOpen(s)}
                    className={`snap-center shrink-0 w-[78%] sm:w-[300px] rounded-2xl bg-neutral-900/85 backdrop-blur-md overflow-hidden text-start shadow-xl ring-1 transition-all ${focused ? "ring-white/50" : "ring-white/10"}`}
                  >
                    <div className="relative aspect-[16/9] bg-neutral-800">
                      {photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={s.place.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSave(s); }}
                        aria-label={t("discover.save")}
                        className="absolute top-2 end-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
                      >
                        <Heart className={`w-4 h-4 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
                      </button>
                      {s.place.rating != null && (
                        <span className="absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-white text-xs font-bold">
                          <Star className="w-3 h-3 fill-amber-300 text-amber-300" />{s.place.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-white text-[15px] line-clamp-1">{s.place.name}</p>
                      <p className="text-white/60 text-xs mt-1 inline-flex items-center gap-1 max-w-full">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="line-clamp-1">{s.place.address ?? t(CAT_KEY[s.place.category] ?? CAT_KEY.eat)}</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : state === "loading" && candidates.length === 0 ? (
        <div className="h-[80svh] sm:h-[72svh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-white/70">
            <Sparkles className="w-7 h-7 animate-pulse" />
            <p className="text-sm">{t("discover.curating")}</p>
          </div>
        </div>
      ) : ranked.length === 0 && state === "idle" ? (
        <div className="h-[80svh] sm:h-[72svh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-white/70 text-center px-8">
            <Compass className="w-8 h-8" />
            <p className="font-semibold">{t("discover.emptyTitle")}</p>
            <p className="text-sm text-white/50">{t("discover.emptySub")}</p>
          </div>
        </div>
      ) : (
        /* Immersive stream */
        <div
          ref={containerRef}
          className="h-[80svh] sm:h-[72svh] overflow-y-auto snap-y snap-mandatory scrollbar-none px-3 pt-16 pb-6 space-y-3 flex flex-col items-center"
        >
          {ranked.map((s) => (
            <div key={s.place.placeId} className="w-full">
              <PlaceCard
                scored={s} center={center}
                saved={saved.has(s.place.placeId)} added={added.has(s.place.placeId)}
                onOpen={onOpen} onSave={onSave} onAdd={onQuickAdd} onHover={setHighlightedId}
              />
            </div>
          ))}
          {state === "loading" && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-white/60" />
            </div>
          )}
        </div>
      )}

      {/* Required attribution (dark) */}
      {view === "stream" && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none z-10">
          <span className="text-[10px] text-white/40">
            {t("discover.poweredBy")} <span className="font-semibold">Google</span>
          </span>
        </div>
      )}

      <PlaceDetailPanel
        scored={openPlace} open={openPlace !== null} tripId={tripId} days={days} center={center}
        saved={openPlace ? saved.has(openPlace.place.placeId) : false}
        onClose={() => setOpenPlace(null)} onSave={() => openPlace && onSave(openPlace)} onAdded={onAdded}
      />
    </div>
  );
}

function GlassBtn({
  children, onClick, label, active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ring-1 backdrop-blur-md transition-all hover:scale-105 ${
        active ? "bg-white text-neutral-900 ring-white" : "bg-white/10 text-white ring-white/15 hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-amber-500/20 backdrop-blur-md ring-1 ring-amber-400/30 text-amber-100 p-3 text-xs">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}
