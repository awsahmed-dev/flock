"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Search, X, Loader2, Compass, AlertCircle, Map as MapIcon, LayoutGrid } from "lucide-react";
import type { Place, PlaceFeatures } from "@/lib/places/types";
import type { ScoredPlace } from "@/lib/discovery/score";
import type { PlanMapItem } from "@/components/map/mapbox-plan-map";
import { rankFeed } from "@/lib/discovery/client/rank-feed";
import { useTasteSession } from "@/lib/discovery/client/use-taste-session";
import { useDwellTracker } from "@/lib/discovery/client/use-dwell-tracker";
import { useT } from "@/components/i18n/locale-provider";
import { PlaceCard } from "./place-card";
import { PlaceDetailPanel } from "./place-detail-panel";
import { CategoryChips, SkeletonGrid, EmptyState, PoweredByGoogle, type PlaceCategoryKey } from "./primitives";

/**
 * Paxawa v2 — Discover, feed-first (planning §3, design §4.1/§4.4).
 *
 * Opens FULL on the cold-start seed (never a blank search box): a diverse,
 * high-quality set for the destination. Category chips are *filters* over that
 * live feed — never a precondition. Search is a secondary, explicit-intent
 * override. The feed sits beside a live Mapbox map; hovering a card pulses its
 * pin, tapping a pin opens the card. Editorial-airy: big imagery, calm type,
 * soft elevation — a different language from V1.
 */
const MapboxPlanMap = dynamic(
  () => import("@/components/map/mapbox-plan-map").then((m) => m.MapboxPlanMap),
  { ssr: false, loading: () => <MapSkeleton /> },
);

const DISCOVER_DAY = "discover"; // single synthetic "day" so all pins share one hue

type FetchState = "idle" | "loading" | "error" | "capped" | "unconfigured";

export function DiscoverFeed({
  tripId,
  destination,
  center,
  days,
}: {
  tripId: string;
  destination: string;
  center: [number, number] | null;
  days: string[];
}) {
  const t = useT();
  const { vector, emit } = useTasteSession(tripId);

  const [category, setCategory] = useState<PlaceCategoryKey | null>(null); // null = All
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [candidates, setCandidates] = useState<Place[]>([]);
  const [state, setState] = useState<FetchState>("loading");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [openPlace, setOpenPlace] = useState<ScoredPlace | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const searching = query.trim().length >= 2;

  // Debounce the ranking vector so rapid dwells coalesce into one smooth re-rank.
  const [rankVector, setRankVector] = useState(vector);
  useEffect(() => {
    const id = setTimeout(() => setRankVector(vector), 600);
    return () => clearTimeout(id);
  }, [vector]);

  // Seen cards freeze; only the unseen tail re-ranks.
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
          if (center) {
            p.set("lng", String(center[0]));
            p.set("lat", String(center[1]));
          }
          url = `/api/discover/search?${p}`;
        } else {
          // Feed-first: the cold-start seed for the destination (+ category filter).
          const p = new URLSearchParams({ destination });
          if (cat) p.set("category", cat);
          if (center) {
            p.set("lng", String(center[0]));
            p.set("lat", String(center[1]));
          }
          url = `/api/discover/feed?${p}`;
        }
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (res.status === 503 && data?.code === "places_not_configured") {
          setState("unconfigured");
          setCandidates([]);
          return;
        }
        if (!res.ok) {
          setState("error");
          return;
        }
        setCandidates(data.places ?? []);
        setState(data.capped ? "capped" : "idle");
      } catch {
        setState("error");
      }
    },
    [center, destination],
  );

  // Cold-start load + reload on category change (when not searching).
  useEffect(() => {
    if (searching) return;
    void fetchFeed("", category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Debounced search override.
  useEffect(() => {
    if (!searching) {
      if (query.trim().length === 0) void fetchFeed("", category); // cleared → back to seed
      return;
    }
    const id = setTimeout(() => void fetchFeed(query, category), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ── Signals ────────────────────────────────────────────────────────────────
  const onOpen = useCallback(
    (s: ScoredPlace) => {
      emit("card_open", { placeId: s.place.placeId, features: s.features });
      setOpenPlace(s);
    },
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
        else {
          next.add(s.place.placeId);
          emit("place_save", { placeId: s.place.placeId, features: s.features });
        }
        return next;
      });
    },
    [emit],
  );

  // ── Map adapter ──────────────────────────────────────────────────────────
  const mapItems = useMemo<PlanMapItem[]>(
    () =>
      ranked
        .filter((s) => Number.isFinite(s.place.coords[1]) && Number.isFinite(s.place.coords[0]))
        .map((s) => ({
          id: s.place.placeId,
          title: s.place.name,
          type: s.place.category,
          status: added.has(s.place.placeId) ? "confirmed" : "proposed",
          dayDate: DISCOVER_DAY,
          startTime: null,
          costEstimate: null,
          bookingUrl: null,
          locationName: s.place.address,
          lat: s.place.coords[1],
          lng: s.place.coords[0],
          photoUrl: s.place.photoRef
            ? `/api/discover/photo?ref=${encodeURIComponent(s.place.photoRef)}&w=400`
            : null,
          rating: s.place.rating,
          fsqCategory: s.place.category,
        })),
    [ranked, added],
  );

  const onPinClick = useCallback(
    (placeId: string) => {
      const s = ranked.find((r) => r.place.placeId === placeId);
      if (s) onOpen(s);
    },
    [ranked, onOpen],
  );

  return (
    <div className="space-y-5">
      {/* Controls — chips are the hero; search is a secondary override */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <CategoryChips value={category} onChange={(c) => { setQuery(""); setCategory(c); }} />
        </div>
        {searchOpen || searching ? (
          <div className="relative shrink-0 w-44 sm:w-60">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => !query && setSearchOpen(false)}
              placeholder={t("discover.searchPlaceholder")}
              className="w-full rounded-full border border-border bg-card ps-9 pe-8 py-2 text-sm outline-none focus:border-primary/40 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setSearchOpen(false); }}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={t("common.clear")}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={t("discover.searchPlaceholder")}
            className="shrink-0 w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            <Search className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* Mobile list/map toggle */}
      <div className="lg:hidden inline-flex rounded-full bg-muted/60 p-1">
        <Toggle active={mobileView === "list"} onClick={() => setMobileView("list")} icon={LayoutGrid} label={t("discover.viewList")} />
        <Toggle active={mobileView === "map"} onClick={() => setMobileView("map")} icon={MapIcon} label={t("discover.viewMap")} />
      </div>

      {/* Notices */}
      {state === "unconfigured" && <Notice tone="amber" text={t("discover.unconfigured")} />}
      {state === "error" && <Notice tone="red" text={t("discover.error")} />}
      {state === "capped" && <Notice tone="amber" text={t("discover.capped")} />}

      {/* Split: feed + map */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,40%)] gap-5">
        {/* Feed column */}
        <div className={mobileView === "map" ? "hidden lg:block" : ""}>
          {state === "loading" && candidates.length === 0 ? (
            <SkeletonGrid count={6} />
          ) : ranked.length === 0 && state === "idle" ? (
            <EmptyState icon={Compass} title={t("discover.emptyTitle")} description={t("discover.emptySub")} />
          ) : (
            <div ref={containerRef} className="grid grid-cols-2 gap-4">
              {ranked.map((s) => (
                <PlaceCard
                  key={s.place.placeId}
                  scored={s}
                  center={center}
                  saved={saved.has(s.place.placeId)}
                  added={added.has(s.place.placeId)}
                  onOpen={onOpen}
                  onSave={onSave}
                  onHover={setHighlightedId}
                />
              ))}
              {state === "loading" && (
                <div className="col-span-full flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <PoweredByGoogle />
          </div>
        </div>

        {/* Map column — sticky on desktop, full-height on mobile when toggled */}
        <div className={`${mobileView === "list" ? "hidden lg:block" : ""}`}>
          <div className="lg:sticky lg:top-4 rounded-3xl overflow-hidden ring-1 ring-border/50 shadow-sm h-[60vh] lg:h-[calc(100vh-7rem)]">
            <MapboxPlanMap
              items={mapItems}
              destinationCenter={center}
              focusedDay={DISCOVER_DAY}
              highlightedItemId={highlightedId}
              onItemClick={onPinClick}
              days={[DISCOVER_DAY]}
              showRoutes={false}
            />
          </div>
        </div>
      </div>

      <PlaceDetailPanel
        scored={openPlace}
        open={openPlace !== null}
        tripId={tripId}
        days={days}
        center={center}
        saved={openPlace ? saved.has(openPlace.place.placeId) : false}
        onClose={() => setOpenPlace(null)}
        onSave={() => openPlace && onSave(openPlace)}
        onAdded={onAdded}
      />
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function Notice({ tone, text }: { tone: "amber" | "red"; text: string }) {
  const cls =
    tone === "amber"
      ? "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300"
      : "border-red-500/30 bg-red-500/8 text-red-700 dark:text-red-300";
  return (
    <div className={`flex items-start gap-2 rounded-2xl border p-3 text-xs ${cls}`}>
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function MapSkeleton() {
  return <div className="w-full h-full bg-muted animate-pulse" />;
}
