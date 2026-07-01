"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Search, X, Loader2, Compass, AlertCircle, Map as MapIcon, Sparkles, Heart, Star, MapPin, SlidersHorizontal, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toggleWishlist, removeWishlist, type WishlistPlace } from "@/lib/actions/wishlist";
import { createItineraryItemFromGooglePlace } from "@/lib/actions/itinerary";
import type { Place, PlaceFeatures } from "@/lib/places/types";
import type { ScoredPlace } from "@/lib/discovery/score";
import type { PlanMapItem } from "@/components/map/mapbox-plan-map";
import { rankFeed } from "@/lib/discovery/client/rank-feed";
import { useTasteSession } from "@/lib/discovery/client/use-taste-session";
import { useDwellTracker } from "@/lib/discovery/client/use-dwell-tracker";
import { useT } from "@/components/i18n/locale-provider";
import { GlassButton } from "@/components/ui/glass";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PlaceCard } from "./place-card";
import { PlaceCardCompact } from "./place-card-compact";
import { PlaceDetailPanel } from "./place-detail-panel";
import { PLACE_CATEGORIES, type PlaceCategoryKey } from "./primitives";

/** lg+ desktop detection (SSR-safe: mobile until mounted). Drives the two
 *  native Discover layouts — immersive stream on mobile, grid+map on desktop. */
function useIsDesktop(): boolean {
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isLg;
}

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
  stay: "discover.catStay",
};

/**
 * A2 / Hick's-Law progressive disclosure: surface the highest-intent
 * categories inline, tuck the rest behind ONE "Filters" affordance. "Eat" and
 * "Sights" are the safe travel default; everything else (incl. the evicted
 * "Stay" hotel-discovery category, per §A1) lives in the Filters sheet so the
 * inline strip never overflows off a hidden swipe. The disclosure also keeps
 * room for future refinements (price, open-now, rating) without growing the
 * rail to a dozen chips.
 */
const INLINE_CATEGORIES: PlaceCategoryKey[] = ["eat", "sight", "stay"];

type FetchState = "idle" | "loading" | "error" | "capped" | "unconfigured";

export interface SavedPlace {
  placeId: string;
  placeName: string;
  photoRef: string | null;
  category: string | null;
  rating: number | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export function DiscoverFeed({
  tripId, destination, center, days, crewSize = 1, isOwner = false, initialCategory = null,
  savedPlaces = [],
}: {
  tripId: string;
  destination: string;
  center: [number, number] | null;
  days: string[];
  crewSize?: number;
  isOwner?: boolean;
  /** §A1: deep-link entry point (e.g. Bookings' "Find on Discover →" for a
   *  hotel gap lands on the Stay category). */
  initialCategory?: PlaceCategoryKey | null;
  /** §3-A: the user's persisted wishlist for this trip (hearts pre-fill from
   *  these; the wishlist sheet lists them all). */
  savedPlaces?: SavedPlace[];
}) {
  const t = useT();
  const { vector, emit } = useTasteSession(tripId);

  const [category, setCategory] = useState<PlaceCategoryKey | null>(initialCategory);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [candidates, setCandidates] = useState<Place[]>([]);
  const [state, setState] = useState<FetchState>("loading");
  const [saved, setSaved] = useState<Set<string>>(() => new Set(savedPlaces.map((p) => p.placeId)));
  const [savedItems, setSavedItems] = useState<SavedPlace[]>(savedPlaces);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [openPlace, setOpenPlace] = useState<ScoredPlace | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [view, setView] = useState<"stream" | "map">("stream");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // §3-C: search is a LOCAL filter over already-loaded cards (see `visible`),
  // not an API round-trip — so ranking/category stay in browse mode.
  const searching = false;

  // A2: a non-"All" category counts as one active filter, so the Filters pill
  // can carry a visible active-count badge (Visibility of System Status). When
  // the active category is one of the inline chips it's already visible, so it
  // doesn't count toward the badge — the badge only flags filters hidden in the
  // disclosure.
  const activeFilterCount = category && !INLINE_CATEGORIES.includes(category) ? 1 : 0;
  const selectCategory = useCallback((c: PlaceCategoryKey | null) => {
    setQuery("");
    setSearchOpen(false);
    setCategory(c);
  }, []);

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

  // §3-C: the toolbar search is a LOCAL filter over the already-loaded cards
  // (name contains) — never a new API call.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter((s) => s.place.name.toLowerCase().includes(q));
  }, [ranked, query]);

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

  // §3-C: no query→API effect — typing filters the loaded cards locally
  // (see `visible`); only category changes refetch (effect above).

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
  // §3-A: heart toggle now PERSISTS to trip_wishlist (optimistic + revert on
  // failure) and keeps the full wishlist list in sync for the Saved sheet.
  const onSave = useCallback(
    (s: ScoredPlace) => {
      const id = s.place.placeId;
      const wasSaved = saved.has(id);
      setSaved((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(id);
        else next.add(id);
        return next;
      });
      if (wasSaved) {
        setSavedItems((prev) => prev.filter((p) => p.placeId !== id));
      } else {
        emit("place_save", { placeId: id, features: s.features });
        setSavedItems((prev) =>
          prev.some((p) => p.placeId === id)
            ? prev
            : [
                {
                  placeId: id,
                  placeName: s.place.name,
                  photoRef: s.place.photoRef ?? null,
                  category: s.place.category,
                  rating: s.place.rating ?? null,
                  address: s.place.address ?? null,
                  lat: s.place.coords[1],
                  lng: s.place.coords[0],
                },
                ...prev,
              ],
        );
      }
      const payload: WishlistPlace = {
        placeId: id,
        placeName: s.place.name,
        photoRef: s.place.photoRef ?? null,
        category: s.place.category,
        rating: s.place.rating ?? null,
        address: s.place.address ?? null,
        lat: s.place.coords[1],
        lng: s.place.coords[0],
      };
      void toggleWishlist(tripId, payload).catch(() => {
        setSaved((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(id);
          else next.delete(id);
          return next;
        });
      });
    },
    [emit, saved, tripId],
  );

  const removeSaved = useCallback(
    (placeId: string) => {
      setSaved((prev) => {
        const next = new Set(prev);
        next.delete(placeId);
        return next;
      });
      setSavedItems((prev) => prev.filter((p) => p.placeId !== placeId));
      void removeWishlist(tripId, placeId).catch(() => {});
    },
    [tripId],
  );

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

  // ── Desktop (lg+): card grid beside a persistent map (design §4.1/§5). The
  // immersive stream below is the mobile design; only one mounts at a time so
  // there's a single Mapbox instance and no doubled DOM.
  if (isDesktop) {
    return (
      <>
        <div className="grid grid-cols-[1fr_minmax(0,480px)] xl:grid-cols-[1fr_minmax(0,540px)] gap-5 items-start">
          {/* Left — filter chips + search + card grid */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-4">
              {/* A2: progressive disclosure — inline top categories + one
                  Filters affordance (with active-count badge) for the rest.
                  No more horizontal rail you must scroll to discover hidden
                  filters. Solid tone here (desktop is a light content surface,
                  not a photo backdrop). */}
              <CategoryStrip
                tone="glassLight"
                category={category}
                searching={searching}
                activeFilterCount={activeFilterCount}
                onSelect={selectCategory}
                onOpenFilters={() => setFiltersOpen(true)}
                className="flex-1 min-w-0"
              />
              <div className="relative shrink-0 w-56">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("discover.searchPlaceholder")}
                  className="w-full rounded-full bg-muted/50 ring-1 ring-border/60 ps-9 pe-8 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label={t("common.clear")}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {state !== "idle" && state !== "loading" && (
              <div className="mb-4 flex items-start gap-2 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 text-amber-700 dark:text-amber-300 p-3 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t(state === "unconfigured" ? "discover.unconfigured" : state === "capped" ? "discover.capped" : "discover.error")}</span>
              </div>
            )}

            {state === "loading" && candidates.length === 0 ? (
              <div className="h-[55vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Sparkles className="w-7 h-7 animate-pulse text-primary" />
                  <p className="text-sm">{t("discover.curating")}</p>
                </div>
              </div>
            ) : ranked.length === 0 && state === "idle" ? (
              <div className="h-[45vh] flex flex-col items-center justify-center gap-2 text-center px-8">
                <Compass className="w-8 h-8 text-muted-foreground" />
                <p className="font-semibold">{t("discover.emptyTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("discover.emptySub")}</p>
              </div>
            ) : (
              <>
                {/* B2: photo-first feed, not a dense matte grid. One soul on
                    both breakpoints — the cinematic photo IS the experience on
                    desktop too. A roomy 1-up (→2-up only on very wide screens)
                    keeps each card's hero photo large and dominant beside the
                    persistent map. */}
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                  {visible.map((s) => (
                    <PlaceCardCompact
                      key={s.place.placeId}
                      scored={s}
                      saved={saved.has(s.place.placeId)}
                      added={added.has(s.place.placeId)}
                      onOpen={onOpen}
                      onSave={onSave}
                      onHover={setHighlightedId}
                    />
                  ))}
                  {visible.length === 0 && query.trim() && (
                    <p className="col-span-full py-10 text-center text-sm text-muted-foreground">{t("discover.noMatches")}</p>
                  )}
                </div>
                {state === "loading" && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                <p className="mt-5 text-center text-[11px] text-muted-foreground">
                  {t("discover.poweredBy")} <span className="font-semibold">Google</span>
                </p>
              </>
            )}
          </div>

          {/* Right — persistent live map, sticky as the grid scrolls */}
          <div className="sticky top-4 h-[calc(100dvh-8.5rem)] rounded-3xl overflow-hidden ring-1 ring-border/60 shadow-sm bg-muted">
            <MapboxPlanMap
              items={mapItems}
              destinationCenter={center}
              focusedDay={DISCOVER_DAY}
              highlightedItemId={highlightedId}
              onItemClick={(id) => { const s = ranked.find((r) => r.place.placeId === id); if (s) onOpen(s); }}
              days={[DISCOVER_DAY]}
              showRoutes={false}
              pinColor="#f97316"
              numbered={false}
            />
          </div>
        </div>

        <FiltersSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          category={category}
          searching={searching}
          onSelect={selectCategory}
        />

        <PlaceDetailPanel
          scored={openPlace} open={openPlace !== null} tripId={tripId} days={days} center={center}
          saved={openPlace ? saved.has(openPlace.place.placeId) : false}
          crewSize={crewSize} isOwner={isOwner}
          onClose={() => setOpenPlace(null)} onSave={() => openPlace && onSave(openPlace)} onAdded={onAdded}
        />
      </>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-60px-env(safe-area-inset-bottom))] rounded-none ring-0 sm:rounded-[2rem] sm:ring-1 sm:ring-white/10 bg-neutral-950 overflow-hidden">
      {/* Floating controls — the glass control layer (Paxawa Control Language,
          §4). Glass-on-dark chips + buttons float over the cinematic photo. */}
      <div className="absolute inset-x-0 top-0 z-20 p-3 sm:p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          {/* A2: top categories inline + one glass Filters pill (badge when
              active) — every category reachable without a hidden swipe. */}
          <CategoryStrip
            tone="glass"
            category={category}
            searching={searching}
            activeFilterCount={activeFilterCount}
            onSelect={selectCategory}
            onOpenFilters={() => setFiltersOpen(true)}
            className="flex-1 min-w-0"
          />

          {searchOpen || searching ? (
            <div className="relative shrink-0 w-32 sm:w-56">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => !query && setSearchOpen(false)}
                placeholder={t("discover.searchPlaceholder")}
                className="w-full rounded-full glass-dark text-white placeholder:text-white/50 ps-9 pe-8 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(""); setSearchOpen(false); }}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white" aria-label={t("common.clear")}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <GlassButton iconOnly onClick={() => setSearchOpen(true)} aria-label={t("discover.searchPlaceholder")}>
              <Search className="w-[18px] h-[18px]" />
            </GlassButton>
          )}
          <GlassButton iconOnly active={view === "map"} onClick={() => setView((v) => (v === "stream" ? "map" : "stream"))} aria-label={t(view === "stream" ? "discover.viewMap" : "discover.viewList")}>
            <MapIcon className="w-[18px] h-[18px]" />
          </GlassButton>
          {/* Wishlist — heart with a saved-count badge, opens the saved sheet. */}
          <GlassButton iconOnly active={wishlistOpen} onClick={() => setWishlistOpen(true)} aria-label={t("discover.savedTitle")}>
            <span className="relative inline-flex">
              <Heart className={`w-[18px] h-[18px] ${saved.size > 0 ? "fill-rose-500 text-rose-500" : ""}`} />
              {saved.size > 0 && (
                <span className="absolute -top-2.5 -end-2.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                  {saved.size}
                </span>
              )}
            </span>
          </GlassButton>
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
        <div className="relative h-full">
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
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-white/70">
            <Sparkles className="w-7 h-7 animate-pulse" />
            <p className="text-sm">{t("discover.curating")}</p>
          </div>
        </div>
      ) : ranked.length === 0 && state === "idle" ? (
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-white/70 text-center px-8">
            <Compass className="w-8 h-8" />
            <p className="font-semibold">{t("discover.emptyTitle")}</p>
            <p className="text-sm text-white/50">{t("discover.emptySub")}</p>
          </div>
        </div>
      ) : (
        /* Immersive stream — each card fills the viewport minus the tab bar;
           snap-scroll shows one place at a time, the next peeks below. */
        <div
          ref={containerRef}
          className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-none"
        >
          {visible.length === 0 && query.trim() ? (
            <div className="h-full flex items-center justify-center text-white/60 text-sm px-8 text-center">
              {t("discover.noMatches")}
            </div>
          ) : (
            visible.map((s) => (
              <div key={s.place.placeId} className="w-full h-full shrink-0 snap-start snap-always">
                <PlaceCard
                  scored={s} center={center}
                  saved={saved.has(s.place.placeId)}
                  onOpen={onOpen} onSave={onSave} onHover={setHighlightedId}
                />
              </div>
            ))
          )}
          {state === "loading" && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-white/60" />
            </div>
          )}
        </div>
      )}

      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        category={category}
        searching={searching}
        onSelect={selectCategory}
      />

      <PlaceDetailPanel
        scored={openPlace} open={openPlace !== null} tripId={tripId} days={days} center={center}
        saved={openPlace ? saved.has(openPlace.place.placeId) : false}
        crewSize={crewSize} isOwner={isOwner}
        onClose={() => setOpenPlace(null)} onSave={() => openPlace && onSave(openPlace)} onAdded={onAdded}
      />

      {/* Wishlist — saved places in a bottom sheet (heart badge in the top bar). */}
      <BottomSheet
        open={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
        title={t("discover.savedTitle")}
        subtitle={t("discover.savedCount", { count: saved.size })}
        size="md"
      >
        {savedItems.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">{t("discover.savedEmpty")}</div>
        ) : (
          <ul className="space-y-2 pb-1">
            {savedItems.map((p) => (
              <WishlistCard
                key={p.placeId}
                place={p}
                tripId={tripId}
                days={days}
                onRemove={() => removeSaved(p.placeId)}
              />
            ))}
          </ul>
        )}
      </BottomSheet>
    </div>
  );
}

/**
 * A2 — the progressive-disclosure category strip. Renders the inline top
 * categories (`All · Eat · Sights`) + ONE Filters pill that opens the sheet
 * holding the rest. The Filters pill carries an active-count badge so a hidden
 * filter is always visible (Visibility of System Status). Two tones:
 *   - "glass" — over the mobile photo stream (Paxawa Control Language).
 *   - "solid" — over the desktop light content surface.
 */
function CategoryStrip({
  tone,
  category,
  searching,
  activeFilterCount,
  onSelect,
  onOpenFilters,
  className,
}: {
  /** "glass" = glass-on-dark (mobile, over the photo stream); "glassLight" =
   *  glass-on-light (desktop, over the light page); both share the material +
   *  reduced-transparency fallback. */
  tone: "glass" | "glassLight";
  category: PlaceCategoryKey | null;
  searching: boolean;
  activeFilterCount: number;
  onSelect: (c: PlaceCategoryKey | null) => void;
  onOpenFilters: () => void;
  className?: string;
}) {
  const t = useT();
  const inline: (PlaceCategoryKey | null)[] = [null, ...INLINE_CATEGORIES];
  const isGlass = tone === "glass";

  const baseChip = "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
  const activeChip = isGlass ? "bg-white text-neutral-900" : "bg-foreground text-background";
  const restChip = isGlass
    ? "glass-dark text-white/90"
    : "glass-light text-muted-foreground hover:text-foreground";

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      {inline.map((c) => {
        const active = category === c && !searching;
        return (
          <button
            key={c ?? "all"}
            type="button"
            onClick={() => onSelect(c)}
            aria-pressed={active}
            className={`${baseChip} ${active ? activeChip : restChip}`}
          >
            {c === null ? t("discover.catAll") : t(CAT_KEY[c])}
          </button>
        );
      })}
      {/* The ONE disclosure affordance — opens the rest of the categories. */}
      <button
        type="button"
        onClick={onOpenFilters}
        aria-haspopup="dialog"
        aria-label={activeFilterCount > 0 ? t("discover.filtersWithCount", { count: activeFilterCount }) : t("discover.filters")}
        className={`${baseChip} inline-flex items-center gap-1.5 ${
          activeFilterCount > 0 ? activeChip : restChip
        }`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>{t("discover.filters")}</span>
        {activeFilterCount > 0 && (
          <span className={`inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-black leading-none ${
            isGlass ? "bg-neutral-900 text-white" : "bg-background text-foreground"
          }`}>
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
}

/**
 * A2 — the Filters disclosure. A compact sheet (mobile) / centered popover
 * (desktop, via BottomSheet's ≥sm behavior) holding the full category set plus
 * room for future refinements. Picking a category applies it and closes; it
 * never navigates away or fully covers the feed on desktop.
 */
function FiltersSheet({
  open,
  onClose,
  category,
  searching,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  category: PlaceCategoryKey | null;
  searching: boolean;
  onSelect: (c: PlaceCategoryKey | null) => void;
}) {
  const t = useT();
  const all: (PlaceCategoryKey | null)[] = [null, ...PLACE_CATEGORIES];
  return (
    <BottomSheet open={open} onClose={onClose} title={t("discover.filtersTitle")} subtitle={t("discover.filtersSubtitle")} size="sm">
      <div className="grid grid-cols-2 gap-2 pb-1">
        {all.map((c) => {
          const active = category === c && !searching;
          return (
            <button
              key={c ?? "all"}
              type="button"
              onClick={() => { onSelect(c); onClose(); }}
              aria-pressed={active}
              className={`flex items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                active
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-foreground hover:bg-muted"
              }`}
            >
              <span>{c === null ? t("discover.catAll") : t(CAT_KEY[c])}</span>
              {active && <Check className="w-4 h-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </BottomSheet>
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

/**
 * §3-A: a saved-place row in the wishlist sheet — photo + name + an "Add to
 * Day N" dropdown (creates the itinerary item) + a Remove (trash) button.
 */
function WishlistCard({
  place,
  tripId,
  days,
  onRemove,
}: {
  place: SavedPlace;
  tripId: string;
  days: string[];
  onRemove: () => void;
}) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [addedDay, setAddedDay] = useState<string | null>(null);
  const photo = place.photoRef
    ? `/api/discover/photo?ref=${encodeURIComponent(place.photoRef)}&w=200`
    : null;

  async function addToDay(dayDate: string) {
    if (!dayDate || adding) return;
    setAdding(true);
    try {
      await createItineraryItemFromGooglePlace({
        tripId,
        dayDate,
        place: {
          placeId: place.placeId,
          name: place.placeName,
          category: place.category ?? "other",
          placeTypes: [],
          rating: place.rating,
          userRatingsTotal: null,
          priceLevel: null,
          coords: [place.lng ?? 0, place.lat ?? 0],
          address: place.address,
          photoRef: place.photoRef,
          hoursSummary: null,
          topTip: null,
        },
      });
      setAddedDay(dayDate);
      toast.success(t("discover.addedToast", { name: place.placeName, day: t("itinerary.dayN", { n: days.indexOf(dayDate) + 1 }) }));
    } catch {
      toast.error(t("discover.addError"));
    } finally {
      setAdding(false);
    }
  }

  return (
    <li className="flex items-center gap-2.5 rounded-2xl bg-muted/50 p-2">
      <span className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={place.placeName} className="w-full h-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-sm truncate">{place.placeName}</span>
        {place.rating != null && (
          <span className="block text-xs text-muted-foreground tabular-nums">★ {place.rating.toFixed(1)}</span>
        )}
      </span>
      {addedDay ? (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-1 shrink-0">
          <Check className="w-4 h-4" />
        </span>
      ) : (
        <select
          disabled={adding}
          defaultValue=""
          onChange={(e) => addToDay(e.target.value)}
          aria-label={t("itinerary.addToDay")}
          className="rounded-lg bg-card ring-1 ring-border text-xs font-bold px-2 h-9 shrink-0 max-w-[96px] disabled:opacity-50"
        >
          <option value="" disabled>{t("itinerary.addToDay")}</option>
          {days.map((d, i) => (
            <option key={d} value={d}>{t("itinerary.dayN", { n: i + 1 })}</option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("common.remove")}
        className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0 active:scale-90 transition-transform"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}
