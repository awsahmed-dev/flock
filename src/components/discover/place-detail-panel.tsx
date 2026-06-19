"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  X, Star, MapPin, Clock, Quote, Plus, Check, ExternalLink, Loader2, Sparkles, Heart,
} from "lucide-react";
import { parseISO } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { toast } from "sonner";
import type { Place } from "@/lib/places/types";
import type { ScoredPlace } from "@/lib/discovery/score";
import { distanceKm } from "@/lib/discovery/score";
import { createItineraryItemFromGooglePlace } from "@/lib/actions/itinerary";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Paxawa v2 — the place detail panel (PhB-4).
 *
 * Tapping a Discover card opens this: a richer view (hero photo, rating,
 * reviews, hours, a real review snippet, address) plus the decisive action —
 * pick a day and drop the place straight onto the map. Bottom sheet on mobile,
 * right slide-over on desktop, matching the rest of the app's panels.
 *
 * It opens instantly with the data we already have, then enriches in place when
 * the cached /details call returns (hours + top tip + full address).
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

export function PlaceDetailPanel({
  scored,
  open,
  tripId,
  days,
  center,
  saved,
  onClose,
  onSave,
  onAdded,
}: {
  scored: ScoredPlace | null;
  open: boolean;
  tripId: string;
  days: string[];
  center: [number, number] | null;
  saved: boolean;
  onClose: () => void;
  onSave: () => void;
  onAdded: (placeId: string) => void;
}) {
  const t = useT();
  const base = scored?.place ?? null;
  // Enrichment (hours, top tip, full address) fetched lazily; merged over the
  // base only while it belongs to the place currently open.
  const [enriched, setEnriched] = useState<Place | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(days[0] ?? "");
  // Which place+day we just added, so the action bar can flip to "Added". Keyed
  // by placeId so opening a different card clears it without a sync effect.
  const [addedInfo, setAddedInfo] = useState<{ placeId: string; day: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fetchedFor = useRef<string | null>(null);

  // Enrich from the cache-backed details endpoint. Setting state from an async
  // callback (not synchronously during the effect) is the intended pattern.
  useEffect(() => {
    if (!open || !base) return;
    const id = base.placeId;
    if (fetchedFor.current === id) return;
    fetchedFor.current = id;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/discover/details?id=${encodeURIComponent(id)}&profile=detail`);
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (alive && data?.place) setEnriched({ ...base, ...data.place });
      } catch {
        /* keep the list-mask data we already have */
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, base]);

  // Escape + body scroll lock while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if ((!scored || !base) && !open) return null;

  // Merge enrichment only when it belongs to the place currently open.
  const p: Place | null = base
    ? enriched && enriched.placeId === base.placeId
      ? enriched
      : base
    : null;
  const photo = p?.photoRef
    ? `/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=900`
    : null;
  const dist = p && center ? distanceKm(p.coords, center) : null;
  const price = p?.priceLevel != null && p.priceLevel > 0 ? "$".repeat(p.priceLevel) : null;
  const effectiveDay = days.includes(selectedDay) ? selectedDay : days[0] ?? "";
  const dayIndex = days.indexOf(effectiveDay);
  const dayLabel = dayIndex >= 0 ? t("itinerary.dayN", { n: dayIndex + 1 }) : "";
  const addedDay = addedInfo && p && addedInfo.placeId === p.placeId ? addedInfo.day : null;
  const mapsUrl = p
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.placeId}`
    : "#";

  function handleAdd() {
    if (!p || !effectiveDay) return;
    startTransition(async () => {
      try {
        await createItineraryItemFromGooglePlace({
          tripId,
          dayDate: effectiveDay,
          place: {
            placeId: p.placeId,
            name: p.name,
            category: p.category,
            placeTypes: p.placeTypes,
            rating: p.rating,
            userRatingsTotal: p.userRatingsTotal,
            priceLevel: p.priceLevel,
            coords: p.coords,
            address: p.address,
            photoRef: p.photoRef,
            hoursSummary: p.hoursSummary,
            topTip: p.topTip,
          },
        });
        setAddedInfo({ placeId: p.placeId, day: effectiveDay });
        onAdded(p.placeId);
        toast.success(t("discover.addedToast", { name: p.name, day: dayLabel }));
      } catch {
        toast.error(t("discover.addError"));
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, end slide-over on desktop */}
      <aside
        className={`fixed z-50 bg-background flex flex-col shadow-2xl transition-transform duration-300 ease-out
          inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl
          sm:inset-y-0 sm:end-0 sm:inset-x-auto sm:w-[440px] sm:max-h-none sm:rounded-none sm:border-s
          ${
            open
              ? "translate-y-0 sm:translate-x-0"
              : "translate-y-full sm:translate-y-0 sm:translate-x-full sm:rtl:-translate-x-full"
          }`}
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Hero */}
          <div className="relative aspect-[16/10] bg-muted">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={p?.name ?? ""} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center text-5xl font-bold text-primary/40">
                {p?.name.charAt(0)}
              </div>
            )}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent pointer-events-none" />

            {/* Tags */}
            <div className="absolute top-3 start-3 flex flex-wrap gap-1.5">
              {scored?.tags.includes("ai_pick") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-violet-600 text-white px-2.5 py-1 text-[11px] font-bold shadow">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t("discover.tagAiPick")}
                </span>
              )}
              {scored?.tags.includes("hidden_gem") && (
                <span className="rounded-full bg-amber-500/90 backdrop-blur text-white px-2.5 py-1 text-[11px] font-bold">
                  {t("discover.tagHiddenGem")}
                </span>
              )}
              {scored?.tags.includes("crew_favorite") && (
                <span className="rounded-full bg-cyan-500/90 backdrop-blur text-white px-2.5 py-1 text-[11px] font-bold">
                  {t("discover.tagCrewFav")}
                </span>
              )}
            </div>

            {/* Save + Close */}
            <div className="absolute top-3 end-3 flex items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                aria-label={t("discover.save")}
                className="w-9 h-9 rounded-full bg-black/35 backdrop-blur flex items-center justify-center text-white hover:bg-black/55 transition-colors"
              >
                <Heart className={`w-4.5 h-4.5 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                className="w-9 h-9 rounded-full bg-black/35 backdrop-blur flex items-center justify-center text-white hover:bg-black/55 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-lg font-extrabold leading-tight">{p?.name}</h2>
              <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap mt-1.5 text-xs text-muted-foreground">
                {p?.rating != null && (
                  <span className="inline-flex items-center gap-1 font-bold text-foreground">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {p.rating.toFixed(1)}
                  </span>
                )}
                {p?.userRatingsTotal != null && (
                  <span className="tabular-nums">{t("discover.reviewsCount", { count: compact(p.userRatingsTotal) })}</span>
                )}
                <span className="font-medium">· {t(CAT_KEY[p?.category ?? "other"] ?? CAT_KEY.other)}</span>
                {price && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">· {price}</span>
                )}
                {dist != null && (
                  <span className="inline-flex items-center gap-0.5 tabular-nums">
                    · <MapPin className="w-3 h-3" />
                    {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                  </span>
                )}
              </div>
            </div>

            {p?.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{p.address}</span>
              </div>
            )}

            {p?.hoursSummary && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{p.hoursSummary}</span>
              </div>
            )}

            {p?.topTip && (
              <div className="rounded-xl bg-muted/50 p-3 flex items-start gap-2">
                <Quote className="w-4 h-4 shrink-0 mt-0.5 text-primary/60" />
                <p className="text-sm leading-relaxed text-foreground/80 italic">{p.topTip}</p>
              </div>
            )}

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t("discover.openMaps")}
            </a>

            {/* Day picker */}
            <div className="pt-1">
              <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1.5 block">
                {t("itinerary.addToDay")}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {days.map((d, idx) => {
                  const active = d === effectiveDay;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDay(d)}
                      className={`rounded-xl border px-2 py-2 text-center transition-all ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card hover:border-foreground/20"
                      }`}
                    >
                      <p className="text-[9px] font-bold tracking-widest uppercase">{t("itinerary.dayN", { n: idx + 1 })}</p>
                      <p className="text-xs font-bold mt-0.5">{format(parseISO(d), "MMM d")}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="shrink-0 border-t bg-background/95 backdrop-blur p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
          {addedDay ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold py-3 text-sm"
            >
              <Check className="w-4.5 h-4.5" />
              {t("discover.addedToDay", {
                day: days.indexOf(addedDay) >= 0 ? t("itinerary.dayN", { n: days.indexOf(addedDay) + 1 }) : "",
              })}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending || !effectiveDay}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-600 text-white font-bold py-3 text-sm shadow-lg shadow-primary/20 disabled:opacity-60 transition-opacity"
            >
              {isPending ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <Plus className="w-4.5 h-4.5" />
              )}
              {t("discover.addTo", { day: dayLabel })}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
