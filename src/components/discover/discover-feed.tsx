"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2, Compass, AlertCircle } from "lucide-react";
import type { Place, PlaceFeatures } from "@/lib/places/types";
import type { ScoredPlace } from "@/lib/discovery/score";
import { rankFeed } from "@/lib/discovery/client/rank-feed";
import { useTasteSession } from "@/lib/discovery/client/use-taste-session";
import { useDwellTracker } from "@/lib/discovery/client/use-dwell-tracker";
import { useT } from "@/components/i18n/locale-provider";
import { PlaceCard } from "./place-card";
import { PlaceDetailPanel } from "./place-detail-panel";

/**
 * Paxawa v2 — the Discover feed. Search + category browse over real Google
 * places, ranked + tagged by the engine, learning live as you scroll (dwell →
 * session vector → re-rank of the unseen tail). The visible payoff of Phases A+B.
 */
const CHIPS: { key: string; cat: string; label: string }[] = [
  { key: "eat", cat: "eat", label: "discover.catEat" },
  { key: "coffee", cat: "coffee", label: "discover.catCoffee" },
  { key: "sight", cat: "sight", label: "discover.catSight" },
  { key: "nightlife", cat: "nightlife", label: "discover.catNightlife" },
  { key: "activity", cat: "activity", label: "discover.catActivity" },
  { key: "shopping", cat: "shopping", label: "discover.catShopping" },
];

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

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("eat");
  const [candidates, setCandidates] = useState<Place[]>([]);
  const [state, setState] = useState<FetchState>("idle");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [openPlace, setOpenPlace] = useState<ScoredPlace | null>(null);

  // Debounce the vector that drives ranking so rapid dwells coalesce into one
  // smooth re-rank (~every 600ms) instead of churning on every signal.
  const [rankVector, setRankVector] = useState(vector);
  useEffect(() => {
    const id = setTimeout(() => setRankVector(vector), 600);
    return () => clearTimeout(id);
  }, [vector]);

  // Seen cards freeze (don't reshuffle under the user); only the unseen tail
  // re-ranks. seenRef accumulates cards that have scrolled out of view.
  const seenRef = useRef<Set<string>>(new Set());
  const lastOrderRef = useRef<string[]>([]);

  const ranked = useMemo<ScoredPlace[]>(() => {
    const r = rankFeed(candidates, {
      vector: rankVector,
      mode: query ? "search" : "browse",
      ref: center,
      frozenIds: seenRef.current,
      priorOrder: lastOrderRef.current,
    });
    lastOrderRef.current = r.map((s) => s.place.placeId);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, rankVector, query, center]);

  // placeId → features, for signal emission from the dwell tracker.
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
    async (q: string, cat: string) => {
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
        } else if (center) {
          const p = new URLSearchParams({ category: cat, lat: String(center[1]), lng: String(center[0]) });
          url = `/api/discover/nearby?${p}`;
        } else {
          // no coords + no query → search the destination name for a cold start.
          url = `/api/discover/search?q=${encodeURIComponent(`top rated ${cat} in ${destination}`)}`;
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
        if (data.capped) {
          setState("capped");
          setCandidates(data.places ?? []);
          return;
        }
        setCandidates(data.places ?? []);
        setState("idle");
      } catch {
        setState("error");
      }
    },
    [center, destination],
  );

  // Cold-start load + reload on category change (when not searching).
  useEffect(() => {
    if (query.trim().length >= 2) return;
    void fetchFeed("", category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Debounced search.
  useEffect(() => {
    if (query.trim().length < 2) return;
    const id = setTimeout(() => void fetchFeed(query, category), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const onOpen = useCallback(
    (s: ScoredPlace) => {
      emit("card_open", { placeId: s.place.placeId, features: s.features });
      setOpenPlace(s);
    },
    [emit],
  );
  // Strongest positive signal: the place actually made it onto a day.
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

  return (
    <div className="space-y-4">
      {/* Search + chips */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("discover.searchPlaceholder")}
            className="w-full rounded-xl border border-border bg-card ps-9 pe-3 py-2.5 text-sm outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <div className="-mx-1 px-1 overflow-x-auto scrollbar-none">
          <div className="inline-flex items-center gap-1.5">
            {CHIPS.map((c) => {
              const active = !query && category === c.cat;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory(c.cat);
                  }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(c.label)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* States */}
      {state === "unconfigured" && (
        <Notice icon={AlertCircle} tone="amber" text={t("discover.unconfigured")} />
      )}
      {state === "error" && <Notice icon={AlertCircle} tone="red" text={t("discover.error")} />}
      {state === "capped" && (
        <Notice icon={AlertCircle} tone="amber" text={t("discover.capped")} />
      )}

      {/* Feed */}
      {state === "loading" && candidates.length === 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/60 overflow-hidden">
              <div className="aspect-[16/10] bg-muted animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 bg-muted rounded animate-pulse" />
                <div className="h-2.5 w-2/3 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : ranked.length === 0 && state === "idle" ? (
        <div className="rounded-2xl border-2 border-dashed border-border/60 p-12 text-center">
          <Compass className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-semibold text-sm">{t("discover.emptyTitle")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("discover.emptySub")}</p>
        </div>
      ) : (
        <div ref={containerRef} className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {ranked.map((s) => (
            <PlaceCard
              key={s.place.placeId}
              scored={s}
              center={center}
              saved={saved.has(s.place.placeId)}
              added={added.has(s.place.placeId)}
              onOpen={onOpen}
              onSave={onSave}
            />
          ))}
          {state === "loading" && (
            <div className="col-span-full flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

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

function Notice({
  icon: Icon,
  tone,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "amber" | "red";
  text: string;
}) {
  const cls =
    tone === "amber"
      ? "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300"
      : "border-red-500/30 bg-red-500/8 text-red-700 dark:text-red-300";
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${cls}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}
