"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Loader2, X, Calendar, Sparkles, ChevronDown, Clock, Tag, PencilLine } from "lucide-react";
import { parseISO } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  createItineraryItemFromGooglePlace,
  createItineraryItemFromPlace,
} from "@/lib/actions/itinerary";
import type { Place, PlacePrediction } from "@/lib/places/types";
import { RatingPill, PriceLevel, PoweredByGoogle } from "@/components/discover/primitives";
import { useT } from "@/components/i18n/locale-provider";

interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  destination: string;
  destinationCenter: [number, number] | null;
  days: string[];
  /** Defaults to first day; can be set when the user opens this sheet
   *  from a specific day. */
  defaultDay?: string | null;
}

/**
 * S1.3 — "Add a place" rebuilt on **Google Autocomplete** (planning §4).
 *
 * Type → real Google predictions (session-tokened, trip-biased). Pick one → we
 * resolve full Place details and the item lands on the map with its pin, photo,
 * and rating already attached. The dead-text bug — a place you found but the
 * old search couldn't pin — becomes structurally impossible.
 *
 * Free-text still survives as a deliberate **"add manually"** fallback for the
 * rare place Google misses (planning §2/§4).
 */
export function AddPlaceSearch({
  open,
  onClose,
  tripId,
  destination,
  destinationCenter,
  days,
  defaultDay,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // The resolved place after the user picks a prediction. null = manual/empty.
  const [picked, setPicked] = useState<Place | null>(null);
  const [resolving, setResolving] = useState(false);

  const [dayDate, setDayDate] = useState<string>(defaultDay ?? days[0] ?? "");
  const [startTime, setStartTime] = useState("");
  const [costEstimate, setCostEstimate] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // One Google autocomplete session token per search session — keystrokes + the
  // following detail fetch bill as one (cost lever, planning §5.1).
  const sessionRef = useRef<string>("");
  function newSession() {
    sessionRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  }

  // Reset the form when the sheet closes; start a fresh autocomplete session
  // when it opens. Intentional prop→state sync on the open toggle.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- deliberate form reset on open/close */
    if (!open) {
      setQuery("");
      setPredictions([]);
      setShowSuggestions(false);
      setPicked(null);
      setResolving(false);
      setDayDate(defaultDay ?? days[0] ?? "");
      setStartTime("");
      setCostEstimate("");
      setNotes("");
    } else {
      newSession();
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, days, defaultDay]);

  // Debounced Google autocomplete on typing (min 2 chars, ~300ms; planning §5.4).
  useEffect(() => {
    if (!open || picked) return;
    const q = query.trim();
    if (q.length < 2) return; // predictions cleared in onChange (no setState-in-effect)
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    debounceRef.current = window.setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSearching(true);
      try {
        const params = new URLSearchParams({ q, session: sessionRef.current });
        if (destinationCenter) {
          params.set("lng", String(destinationCenter[0]));
          params.set("lat", String(destinationCenter[1]));
        }
        const res = await fetch(`/api/discover/autocomplete?${params}`, { signal: ctrl.signal });
        const data = (await res.json().catch(() => ({}))) as { predictions?: PlacePrediction[] };
        setPredictions(data.predictions ?? []);
        setShowSuggestions(true);
      } catch {
        /* aborted or network — keep the manual fallback available */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, destinationCenter, open, picked]);

  async function handlePick(pred: PlacePrediction) {
    setShowSuggestions(false);
    setPredictions([]);
    setQuery(pred.primary);
    setResolving(true);
    try {
      const res = await fetch(
        `/api/discover/details?id=${encodeURIComponent(pred.placeId)}&session=${sessionRef.current}`,
      );
      const data = (await res.json().catch(() => ({}))) as { place?: Place };
      if (data.place) setPicked(data.place);
      else toast.error(t("itinerary.placeUnavailable"));
    } catch {
      toast.error(t("itinerary.placeUnavailable"));
    } finally {
      setResolving(false);
      newSession(); // the autocomplete session ended with the detail fetch
    }
  }

  function clearPicked() {
    setPicked(null);
    setQuery("");
    setPredictions([]);
  }

  function handleSubmit() {
    if (!dayDate) {
      toast.error(t("itinerary.pickADay"));
      return;
    }
    const cost = costEstimate.trim() ? parseFloat(costEstimate.replace(",", ".")) : null;
    const costVal = cost != null && Number.isFinite(cost) ? cost : null;

    startTransition(async () => {
      try {
        if (picked) {
          await createItineraryItemFromGooglePlace({
            tripId,
            dayDate,
            place: {
              placeId: picked.placeId,
              name: picked.name,
              category: picked.category,
              placeTypes: picked.placeTypes,
              rating: picked.rating,
              userRatingsTotal: picked.userRatingsTotal,
              priceLevel: picked.priceLevel,
              coords: picked.coords,
              address: picked.address,
              photoRef: picked.photoRef,
              hoursSummary: picked.hoursSummary,
              topTip: picked.topTip,
            },
            startTime: startTime || null,
            costEstimate: costVal,
            notes: notes.trim() || null,
          });
          toast.success(t("itinerary.addedToDayN", { name: picked.name, n: days.indexOf(dayDate) + 1 }));
        } else {
          const title = query.trim();
          if (!title) {
            toast.error(t("itinerary.addNameAndDay"));
            return;
          }
          await createItineraryItemFromPlace({
            tripId,
            dayDate,
            title,
            costEstimate: costVal,
          });
          toast.success(t("itinerary.addedToDayN", { name: title, n: days.indexOf(dayDate) + 1 }));
        }
        router.refresh(); // re-fetch the route so the new item shows without a reload
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("itinerary.failedToAdd"));
      }
    });
  }

  const canSubmit = (!!picked || query.trim().length > 0) && !!dayDate && !resolving;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("itinerary.addToItinerary")}
      subtitle={destination}
      size="md"
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-border bg-card hover:bg-accent/40 px-3 py-2.5 text-sm font-bold transition-colors disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
            className="flex-1 rounded-xl bg-gradient-to-r from-primary to-violet-600 text-white py-2.5 text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {t("itinerary.addToItinerary")}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Picked place — resolved, pin-ready */}
        {picked ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-snug">{picked.name}</p>
                {picked.address && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{picked.address}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <RatingPill rating={picked.rating} reviews={picked.userRatingsTotal} />
                  <PriceLevel level={picked.priceLevel} className="text-xs" />
                </div>
              </div>
              <button
                type="button"
                onClick={clearPicked}
                aria-label={t("common.clear")}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Search field with Google predictions */
          <div className="relative">
            <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1.5 block">
              {t("itinerary.whatAreYouAdding")}
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary/40">
              {searching || resolving ? (
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
              ) : (
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  const v = e.target.value;
                  setQuery(v);
                  if (v.trim().length < 2) setPredictions([]);
                }}
                onFocus={() => predictions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 160)}
                placeholder={t("itinerary.typeName")}
                autoFocus
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setPredictions([]); }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Prediction dropdown */}
            {showSuggestions && (predictions.length > 0 || query.trim().length >= 2) && (
              <div className="absolute z-30 inset-x-0 mt-1 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
                {predictions.length > 0 && (
                  <ul className="max-h-64 overflow-y-auto">
                    {predictions.map((p) => (
                      <li key={p.placeId}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            void handlePick(p);
                          }}
                          className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-accent/40 text-start transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{p.primary}</p>
                            {p.secondary && (
                              <p className="text-[11px] text-muted-foreground truncate">{p.secondary}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {/* Manual fallback — for the rare place Google misses */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowSuggestions(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 border-t border-border/60 hover:bg-accent/40 text-start transition-colors"
                >
                  <PencilLine className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {t("itinerary.addManuallyNamed", { name: query.trim() })}
                  </span>
                </button>
                <div className="px-3 py-1.5 border-t border-border/60 flex justify-end">
                  <PoweredByGoogle />
                </div>
              </div>
            )}

            {query.trim().length < 2 && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {t("itinerary.typeForSuggestions")}
              </p>
            )}
          </div>
        )}

        {/* Day picker */}
        <div>
          <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1.5 block inline-flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> {t("itinerary.addToDay")}
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {days.map((d, idx) => {
              const active = d === dayDate;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDayDate(d)}
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

        {/* Optional time + cost + notes */}
        <details className="rounded-xl border border-border bg-card/40">
          <summary className="cursor-pointer px-3 py-2 text-[11px] font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 list-none">
            <ChevronDown className="w-3 h-3" /> {t("itinerary.moreDetails")}
          </summary>
          <div className="px-3 pb-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1 block inline-flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> {t("itinerary.time")}
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/40"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1 block inline-flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" /> {t("itinerary.cost")}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={costEstimate}
                onChange={(e) => setCostEstimate(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/40"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1 block">
                {t("expenses.notes")}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("itinerary.notesPlaceholder")}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/40"
              />
            </div>
          </div>
        </details>
      </div>
    </BottomSheet>
  );
}
