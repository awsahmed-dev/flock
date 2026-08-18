"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MagnifyingGlass as Search, X, CircleNotch as Loader2, Compass, WarningCircle as AlertCircle, MapTrifold as MapIcon, Sparkle as Sparkles, Heart, Star, MapPin, SlidersHorizontal, Check, Trash as Trash2, CaretLeft as ChevronLeft } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { toggleWishlist, removeWishlist, type WishlistPlace } from "@/lib/actions/wishlist";
import { togglePlaceLike } from "@/lib/actions/place-likes";
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
import { shortLocality } from "@/lib/places/short-locality";
import { useTheme } from "next-themes";
// Phase 6 §5 — the Taste Engine layer.
import { recordInteraction, getTasteContext, getPlaceTags } from "@/lib/actions/taste";
import { reasonChip, championFor, crewScore, type FiveDimVector } from "@/lib/taste-engine";
import { TasteOnboarding } from "./taste-onboarding";

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
 * search box). Photo-first cards in a plain vertical scroll (the full-screen
 * snap stream + swipe-to-next view are gone — discover brief). Glass
 * category-filter chips + a Map toggle float on top; search is a secondary
 * affordance. The feed learns live as you dwell. Tap a card → detail bottom
 * sheet (Animate UI).
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
const INLINE_CATEGORIES: PlaceCategoryKey[] = ["eat", "sight", "stay", "activity"];

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
  tripId, tripName = "", destination, center: destinationCenter, days, crewSize = 1, isOwner = false, initialCategory = null,
  savedPlaces = [], likedPlaceIds = [], likeCounts = {}, defaultMapView = false, live = false,
}: {
  tripId: string;
  /** §2: shown in the floating back-to-dashboard header on the mobile feed. */
  tripName?: string;
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
  /** §1-E: place ids the current user has liked in this trip + crew like counts. */
  likedPlaceIds?: string[];
  likeCounts?: Record<string, number>;
  /** Phase 7 §3-B: LIVE "Nearby" opens in map view — on the ground you need
   *  the map, not a list. */
  defaultMapView?: boolean;
  /** LIVE: Discover becomes "around you" — the device's location centers the
   *  map and the feed is a 3km circle, not the whole destination. */
  live?: boolean;
}) {
  const t = useT();
  // Sprint 9 FIX-2B: the search hint names YOUR city, not a KL food ref.
  const destCity = (destination || "").split(",")[0].trim();
  const searchPlaceholder = destCity
    ? t("discover.searchPlaceholderIn", { city: destCity })
    : t("discover.searchPlaceholder");
  const { vector, emit } = useTasteSession(tripId);
  // §10.1: basemap matches the app theme — no more beige streets-v12 flash
  // against the dark feed (design vision §1.3).
  const { resolvedTheme } = useTheme();
  const themedMapStyle = resolvedTheme === "light" ? "light-v11" : "dark-v11";

  const [category, setCategory] = useState<PlaceCategoryKey | null>(initialCategory);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [candidates, setCandidates] = useState<Place[]>([]);
  const [state, setState] = useState<FetchState>("loading");
  const [saved, setSaved] = useState<Set<string>>(() => new Set(savedPlaces.map((p) => p.placeId)));
  const [savedItems, setSavedItems] = useState<SavedPlace[]>(savedPlaces);
  const [added, setAdded] = useState<Set<string>>(new Set());
  // §1-E: like state (optimistic).
  const [liked, setLiked] = useState<Set<string>>(() => new Set(likedPlaceIds));
  const [likeCountMap, setLikeCountMap] = useState<Record<string, number>>(likeCounts);
  const [openPlace, setOpenPlace] = useState<ScoredPlace | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [view, setView] = useState<"stream" | "map">(defaultMapView ? "map" : "stream");
  // Phone video (LIVE Discover): "there is no location of where I am — it shows
  // the whole country." During LIVE, ask the device once; while we wait (or if
  // denied) fall back to the destination center.
  const [here, setHere] = useState<[number, number] | null>(null);
  useEffect(() => {
    if (!live || typeof navigator === "undefined" || !navigator.geolocation) return;
    let alive = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => { if (alive) setHere([pos.coords.longitude, pos.coords.latitude]); },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
    return () => { alive = false; };
  }, [live]);
  const center = here ?? destinationCenter;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // ── Phase 6 §5: taste state ───────────────────────────────────────────────
  const [tasteCtx, setTasteCtx] = useState<Awaited<ReturnType<typeof getTasteContext>> | null>(null);
  const [placeTags, setPlaceTags] = useState<Record<string, FiveDimVector>>({});
  const [onboardDismissed, setOnboardDismissed] = useState(false);
  const [whySheetFor, setWhySheetFor] = useState<ScoredPlace | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [specialFilter, setSpecialFilter] = useState<"crew" | "saved" | null>(null);
  const smarterToastFired = useRef(false);

  useEffect(() => {
    getTasteContext(tripId).then(setTasteCtx).catch(() => {});
  }, [tripId]);

  // Batch-load 5-dim tags for the loaded candidates; fire-and-forget tagging
  // for the top untagged ones (§5-C ingest).
  useEffect(() => {
    if (!candidates.length) return;
    const ids = candidates.map((p) => p.placeId);
    getPlaceTags(ids)
      .then((tags) => {
        setPlaceTags((prev) => ({ ...prev, ...tags }));
        const untagged = candidates.filter((p) => !tags[p.placeId]).slice(0, 12);
        for (const p of untagged) {
          void fetch("/api/taste/tag-place", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              place_id: p.placeId,
              name: p.name,
              types: p.placeTypes ?? [],
              price_level: p.priceLevel ?? null,
              editorial_summary: p.topTip ?? null,
            }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [candidates]);

  // §5-D: durable signal recorder + the "smarter" toast at interaction 10.
  const record = useCallback(
    (placeId: string, signal: "heart" | "add_to_plan" | "bookmark" | "dwell_4s" | "skip" | "not_interested", reason?: "too_pricey" | "too_touristy" | "not_my_thing") => {
      recordInteraction({ tripId, placeId, signal, reason })
        .then(({ interactionCount }) => {
          if (interactionCount === 10 && !smarterToastFired.current) {
            smarterToastFired.current = true;
            toast("Your Discover feed just got smarter ✨", { duration: 3000 });
          }
        })
        .catch(() => {});
    },
    [tripId],
  );

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

  // Phase 6 §5-E: blend the crew's 5-dim taste over the session ranking —
  // champion picks surface every ~8 cards, 15% ride as wild cards.
  const { crewRanked, reasonChips } = useMemo(() => {
    const chips: Record<string, string> = {};
    const members = tasteCtx?.crewVectors ?? [];
    const withMe = tasteCtx?.userVector
      ? [...members.map((m) => m.vector), tasteCtx.userVector]
      : members.map((m) => m.vector);

    const scored = ranked.map((s, i) => {
      const tags = placeTags[s.place.placeId] ?? null;
      const champ = tags ? championFor(tags, members) : null;
      // Stable pseudo-random 15% exploration set.
      const isExploration = hashPct(s.place.placeId) < 15 && i > 3;
      const chip = reasonChip({
        placeTags: tags,
        userVector: tasteCtx?.userVector ?? null,
        championName: champ?.name ?? null,
        crewHeartsOnSimilar: tasteCtx?.crewHeartCount ?? 0,
        isExploration,
      });
      chips[s.place.placeId] = t(chip.key, chip.params);
      const crew = tags && withMe.length ? crewScore(tags, withMe) : 0.5;
      return { s, crew, champ, isExploration };
    });

    // Champion injection: pull the top champion pick to every ~8th slot.
    const base = [...scored].sort((a, b) => {
      // keep the session order dominant; crew score is a tiebreak nudge
      const ai = scored.indexOf(a);
      const bi = scored.indexOf(b);
      return ai - bi || b.crew - a.crew;
    });
    const champs = scored.filter((x) => x.champ).slice(0, 3);
    for (let n = 0; n < champs.length; n++) {
      const target = 7 + n * 8;
      const from = base.indexOf(champs[n]);
      if (from > target && target < base.length) {
        base.splice(from, 1);
        base.splice(target, 0, champs[n]);
      }
    }
    return { crewRanked: base.map((x) => x.s), reasonChips: chips };
  }, [ranked, placeTags, tasteCtx, t]);

  // §3-C: the toolbar search is a LOCAL filter over the already-loaded cards
  // (name contains) — never a new API call. §5-G: "not interested" hides;
  // §5-H: Crew picks / Saved special chips filter here.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = crewRanked.filter((s) => !hidden.has(s.place.placeId));
    if (specialFilter === "crew") {
      list = list
        .filter((s) => (likeCountMap[s.place.placeId] ?? 0) > 0)
        .sort((a, b) => (likeCountMap[b.place.placeId] ?? 0) - (likeCountMap[a.place.placeId] ?? 0));
    } else if (specialFilter === "saved") {
      list = list.filter((s) => saved.has(s.place.placeId));
    }
    if (!q) return list;
    return list.filter((s) => s.place.name.toLowerCase().includes(q));
  }, [crewRanked, query, hidden, specialFilter, likeCountMap, saved]);

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
      // §5-D/G durable signals: ≥4s attention = +1, a 0.5–4s pass = skip (−1).
      if (dwellMs >= 4000) record(placeId, "dwell_4s");
      else if (dwellMs >= 500) record(placeId, "skip");
    },
    [emit, record],
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
          if (here) p.set("near", "1");
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
    [center, here, destination],
  );

  useEffect(() => {
    if (searching) return;
    void fetchFeed("", category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, here]);

  // §9: the dynamic bottom nav (a sibling route component) drives the Saved
  // sheet + Search input via window events, and reads the wishlist count for
  // its badge.
  useEffect(() => {
    const openWishlist = () => setWishlistOpen(true);
    const toggleSearch = () => setSearchOpen((v) => !v);
    const sendCount = () =>
      window.dispatchEvent(new CustomEvent("discover:savedCount", { detail: saved.size }));
    window.addEventListener("discover:openWishlist", openWishlist);
    window.addEventListener("discover:toggleSearch", toggleSearch);
    window.addEventListener("discover:requestCount", sendCount);
    return () => {
      window.removeEventListener("discover:openWishlist", openWishlist);
      window.removeEventListener("discover:toggleSearch", toggleSearch);
      window.removeEventListener("discover:requestCount", sendCount);
    };
  }, [saved.size]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("discover:savedCount", { detail: saved.size }));
  }, [saved.size]);

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
      record(placeId, "add_to_plan");
    },
    [emit, record],
  );
  // §10.7: toast Undo reverts the card's "In plan" state.
  const onUndone = useCallback((placeId: string) => {
    setAdded((prev) => {
      const next = new Set(prev);
      next.delete(placeId);
      return next;
    });
  }, []);
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
        record(id, "bookmark");
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
    [emit, saved, tripId, record],
  );

  // §1-E: optimistic like toggle (heart) — persists to place_likes.
  // Phase 6 §5-D: a fresh heart is also a +3 taste signal.
  const onLike = useCallback(
    (s: ScoredPlace) => {
      const id = s.place.placeId;
      const wasLiked = liked.has(id);
      if (!wasLiked) record(id, "heart");
      setLiked((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(id);
        else next.add(id);
        return next;
      });
      setLikeCountMap((prev) => ({
        ...prev,
        [id]: Math.max(0, (prev[id] ?? 0) + (wasLiked ? -1 : 1)),
      }));
      void togglePlaceLike(tripId, id).catch(() => {
        // revert on failure
        setLiked((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(id);
          else next.delete(id);
          return next;
        });
        setLikeCountMap((prev) => ({
          ...prev,
          [id]: Math.max(0, (prev[id] ?? 0) + (wasLiked ? 1 : -1)),
        }));
      });
    },
    [liked, tripId, record],
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
                specialFilter={specialFilter}
                onSpecialFilter={setSpecialFilter}
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
                  placeholder={searchPlaceholder}
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
                <p className="mt-5 text-center text-[12px] text-muted-foreground">
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
              destinationZoom={here ? 14 : 12}
              userLocation={here}
              focusedDay={DISCOVER_DAY}
              highlightedItemId={highlightedId}
              onItemClick={(id) => { const s = ranked.find((r) => r.place.placeId === id); if (s) onOpen(s); }}
              days={[DISCOVER_DAY]}
              showRoutes={false}
              pinColor="#f97316"
              numbered={false}
              mapStyle={themedMapStyle}
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
          onUndone={onUndone}
        />
      </>
    );
  }

  return (
    /* Sprint 7.1 FIX-1: the stage used to stop 60px short of the bottom
       (sized for the retired docked nav), exposing a strip of the page
       background under the hardcoded-dark feed — the "band" behind the
       floating nav. The immersive feed now runs to the viewport bottom and
       content clears the floating nav via list padding instead. */
    <div className="relative h-[calc(100dvh-56px-env(safe-area-inset-top))] rounded-none ring-0 sm:rounded-[2rem] sm:ring-1 sm:ring-white/10 bg-neutral-950 overflow-hidden">
      {/* §4-A: floating gradient top header, overlaid on the feed (not in the
          content flow). Fixed to the viewport, hidden only on desktop (xl),
          pointer-events none except the back link. */}
      {/* Floating controls — the glass control layer (Paxawa Control Language,
          §4). Glass-on-dark chips + buttons float over the cinematic photo.
          §4: pushed below the 52px floating header so it doesn't overlap the
          back link. */}
      <div className="absolute inset-x-0 top-0 z-20 p-3 sm:p-4 bg-gradient-to-b from-black/60 to-transparent">
        {searchOpen ? (
          /* Fix 4 / §9-E: the search bar slides in when tapped from the nav's
             Search slot; the ✕ restores the category strip. */
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-full glass-dark text-white placeholder:text-white/50 ps-9 pe-8 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white" aria-label={t("common.clear")}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setQuery(""); setSearchOpen(false); }}
              aria-label={t("common.close")}
              className="shrink-0 w-9 h-9 rounded-full glass-dark text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Phase 7 §3-B: chips + a Map/List toggle. */
          <div className="flex items-center gap-2">
            <CategoryStrip
              tone="glass"
              category={category}
              searching={false}
              activeFilterCount={0}
              onSelect={selectCategory}
              onOpenFilters={() => {}}
              showFilters={false}
              className="flex-1 min-w-0 overflow-x-auto scrollbar-none"
            />
            <button
              type="button"
              onClick={() => setView((v) => (v === "map" ? "stream" : "map"))}
              aria-label={view === "map" ? "List view" : "Map view"}
              className="shrink-0 w-9 h-9 rounded-full glass-dark text-white flex items-center justify-center"
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Notices */}
      {state !== "idle" && state !== "loading" && (
        <div className="absolute inset-x-0 top-[116px] z-20 px-4">
          <Notice text={t(state === "unconfigured" ? "discover.unconfigured" : state === "capped" ? "discover.capped" : "discover.error")} />
        </div>
      )}

      {/* Map view — pins + a floating card carousel synced to them */}
      {view === "map" ? (
        <div className="relative h-full">
          <MapboxPlanMap
            items={mapItems} destinationCenter={center} destinationZoom={here ? 14 : 12} userLocation={here} focusedDay={DISCOVER_DAY}
            highlightedItemId={highlightedId} onItemClick={focusCarousel} days={[DISCOVER_DAY]}
            showRoutes={false} pinColor="#f97316" numbered={false} mapStyle={themedMapStyle}
          />
          {ranked.length > 0 && (
            <div
              ref={mapCarouselRef}
              onScroll={onCarouselScroll}
              className="absolute inset-x-0 z-10 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none px-[11%]"
              style={{ bottom: "calc(env(safe-area-inset-bottom) + 96px)" }}
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
                    {/* Sprint 9 FIX-3: shimmer skeleton while the photo
                        loads — never a black box where a photo should be. */}
                    <div className="relative aspect-[16/9] bg-neutral-800 overflow-hidden">
                      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-neutral-800 via-neutral-700/70 to-neutral-800 animate-pulse" />
                      {photo && <FeedPhoto src={photo} alt={s.place.name} />}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSave(s); }}
                        aria-label={t("discover.save")}
                        className="absolute top-2 end-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white before:content-[''] before:absolute before:-inset-1.5"
                      >
                        <Heart className={`w-4 h-4 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
                      </button>
                      {s.place.rating != null && (
                        <span className="absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-white text-xs font-bold">
                          <Star className="w-4 h-4 fill-amber-300 text-amber-300" />{s.place.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-white text-[15px] line-clamp-1">{s.place.name}</p>
                      <p className="text-white/60 text-xs mt-1 inline-flex items-center gap-1 max-w-full">
                        <MapPin className="w-4 h-4 shrink-0" />
                        {/* §10.6: derived locality, never the raw address. */}
                        <span className="line-clamp-1">
                          {[shortLocality(s.place.address), t(CAT_KEY[s.place.category] ?? CAT_KEY.eat)]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
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
        /* Discover-fix brief: a plain vertical scroll of photo-first cards —
           the full-screen snap stream and swipe-up-to-next are gone. Cards are
           tall (4:5) so the photo still leads; tap opens the detail bottom
           sheet. Top padding clears the floating chip strip. */
        <div
          ref={containerRef}
          className="h-full overflow-y-auto scrollbar-none px-3 pt-[68px] space-y-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 96px)" }}
        >
          {/* §5-F: vibe onboarding lives inside the feed for cold users. */}
          {tasteCtx && !tasteCtx.onboarded && tasteCtx.interactionCount < 3 && !onboardDismissed && (
            <div className="px-1">
              <TasteOnboarding
                onDone={() => {
                  setOnboardDismissed(true);
                  getTasteContext(tripId).then(setTasteCtx).catch(() => {});
                }}
              />
            </div>
          )}
          {visible.length === 0 && query.trim() ? (
            <div className="h-full flex items-center justify-center text-white/60 text-sm px-8 text-center">
              {t("discover.noMatches")}
            </div>
          ) : (
            visible.map((s) => (
              <div key={s.place.placeId} className="w-full aspect-[4/5] rounded-3xl overflow-hidden">
                <PlaceCard
                  scored={s} center={center}
                  saved={saved.has(s.place.placeId)}
                  liked={liked.has(s.place.placeId)}
                  likeCount={likeCountMap[s.place.placeId] ?? 0}
                  added={added.has(s.place.placeId)}
                  reason={reasonChips[s.place.placeId]}
                  onOpen={() => onOpen(s)}
                  onSave={onSave} onLike={onLike} onHover={setHighlightedId}
                  onLongPress={(sp) => setWhySheetFor(sp)}
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
        onUndone={onUndone}
      />

      {/* §5-G: "Not interested" why sheet — the answer becomes a −5 signal. */}
      <BottomSheet
        open={whySheetFor !== null}
        onClose={() => setWhySheetFor(null)}
        title={whySheetFor?.place.name ?? ""}
        size="sm"
      >
        <div className="divide-y divide-border/60 pb-1">
          {(
            [
              { key: "too_pricey", label: "Too pricey" },
              { key: "too_touristy", label: "Too touristy" },
              { key: "not_my_thing", label: "Not my thing" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                const s = whySheetFor;
                setWhySheetFor(null);
                if (!s) return;
                setHidden((prev) => new Set(prev).add(s.place.placeId));
                record(s.place.placeId, "not_interested", opt.key);
                toast("Got it — fewer of these");
              }}
              className="w-full h-13 py-3.5 text-start text-[15px] font-semibold"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </BottomSheet>

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
  showFilters = true,
  specialFilter = null,
  onSpecialFilter,
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
  /** Fix 4: hide the "Filters" disclosure pill (mobile shows a clean 5-chip
   *  strip — Saved/Search moved to the nav; the rare categories aren't worth
   *  the clutter). */
  showFilters?: boolean;
  /** Phase 6 §5-H: Crew picks / Saved special chips. */
  specialFilter?: "crew" | "saved" | null;
  onSpecialFilter?: (f: "crew" | "saved" | null) => void;
}) {
  const t = useT();
  const inline: (PlaceCategoryKey | null)[] = [null, ...INLINE_CATEGORIES];
  const isGlass = tone === "glass";

  const baseChip = "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
  // Master color brief: selected/curated = dune, not white/purple.
  const activeChip = "";
  const duneStyle: React.CSSProperties = {
    background: "var(--clr-dune-dim)",
    color: "var(--clr-dune)",
    border: "1px solid rgba(224, 178, 82, 0.3)",
  };
  const restChip = isGlass
    ? "glass-dark text-white/90"
    : "glass-light text-muted-foreground hover:text-foreground";

  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto scrollbar-none ${className ?? ""}`}>
      {onSpecialFilter &&
        (["crew", "saved"] as const).map((f) => {
          const active = specialFilter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => onSpecialFilter(active ? null : f)}
              aria-pressed={active}
              className={`${baseChip} ${active ? activeChip : restChip}`}
              style={active ? duneStyle : undefined}
            >
              {f === "crew" ? t("discover.crewPicks") : t("discover.savedTitle")}
            </button>
          );
        })}
      {inline.map((c) => {
        const active = category === c && !searching;
        return (
          <button
            key={c ?? "all"}
            type="button"
            onClick={() => onSelect(c)}
            aria-pressed={active}
            className={`${baseChip} ${active ? activeChip : restChip}`}
            style={active ? duneStyle : undefined}
          >
            {c === null ? t("discover.catAll") : t(CAT_KEY[c])}
          </button>
        );
      })}
      {/* The ONE disclosure affordance — opens the rest of the categories. */}
      {showFilters && (
        <button
          type="button"
          onClick={onOpenFilters}
          aria-haspopup="dialog"
          aria-label={activeFilterCount > 0 ? t("discover.filtersWithCount", { count: activeFilterCount }) : t("discover.filters")}
          className={`${baseChip} inline-flex items-center gap-1.5 ${
            activeFilterCount > 0 ? activeChip : restChip
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{t("discover.filters")}</span>
          {activeFilterCount > 0 && (
            <span className={`inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-black leading-none ${
              isGlass ? "bg-neutral-900 text-white" : "bg-background text-foreground"
            }`}>
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
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
          className="text-sm font-bold shrink-0 max-w-[120px] disabled:opacity-50"
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

/** Phase 6 §5-E: stable 0–99 hash for the 15% wild-card exploration mix. */
function hashPct(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 100;
}

/* Sprint 9 FIX-3: card photo that fades in over the shimmer skeleton once
   the browser has actually decoded it. */
function FeedPhoto({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}
