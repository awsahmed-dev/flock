"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Search, MapPin, Loader2, X, Calendar, Sparkles, ChevronDown, Clock, Tag } from "lucide-react";
import { parseISO } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { createItineraryItemFromPlace } from "@/lib/actions/itinerary";
import { searchPlaces, type GeoSuggestion } from "@/lib/mapbox-geocode";
import { useLocale, useT } from "@/components/i18n/locale-provider";

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
 * B7: "Add a place" rebuilt around tester feedback — search is a
 * *suggestion*, not a requirement.
 *
 * The free-text title input is the primary control. As the user types,
 * Mapbox geocoding suggestions appear inline. They can:
 *   - Pick a suggestion → name, address, coords prefilled.
 *   - Ignore suggestions and just type → manual entry, no coords.
 * Either way, they then pick a day, optional time/cost/notes, and Add.
 *
 * Foursquare metadata enrichment runs *after* the row exists, in the
 * background — best-effort, fails silently. Photos and ratings show up
 * the next time the page revalidates.
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
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  // Picked-from-suggestion coordinates. NULL when the user is typing
  // free-text. Set on suggestion pick, cleared on title edit.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Foursquare id of the picked suggestion, if any. Lets us short-circuit
  // the background enrichment pass — we already have category + coords.
  const [pickedFsqId, setPickedFsqId] = useState<string | null>(null);
  const [pickedFsqCategory, setPickedFsqCategory] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dayDate, setDayDate] = useState<string>(defaultDay ?? days[0] ?? "");
  const [startTime, setStartTime] = useState("");
  const [costEstimate, setCostEstimate] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // B15: pass the viewer's locale to both Foursquare (via the /api
  // route which reads cookie server-side) and Mapbox (passed directly
  // since the call is client-side).
  const { locale } = useLocale();
  const t = useT();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTitle("");
      setLocation("");
      setCoords(null);
      setPickedFsqId(null);
      setPickedFsqCategory(null);
      setSuggestions([]);
      setShowSuggestions(false);
      setDayDate(defaultDay ?? days[0] ?? "");
      setStartTime("");
      setCostEstimate("");
      setNotes("");
    }
  }, [open, days, defaultDay]);

  // Debounced place autocomplete on title typing.
  //
  // B12-followup-3: hit Foursquare *first* via /api/places/search — it's
  // a real POI database, so "KLCC Towers", "Petronas Twin Towers",
  // restaurants, museums all resolve to the actual landmark instead of
  // a same-name street. Fall back to Mapbox geocoder if Foursquare
  // returns nothing (free-form addresses, obscure locations).
  useEffect(() => {
    if (!open) return;
    const q = title.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    debounceRef.current = window.setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSearching(true);
      try {
        // ── 1. Foursquare POI search (server route — keeps API key off the
        //    client). Biased by trip center lat/lng so "ramen" in a Tokyo
        //    trip returns Tokyo ramen, not Brooklyn.
        const fsqParams = new URLSearchParams({ q });
        if (destinationCenter) {
          fsqParams.set("lng", String(destinationCenter[0]));
          fsqParams.set("lat", String(destinationCenter[1]));
        } else if (destination) {
          fsqParams.set("near", destination);
        }
        let fsqResults: GeoSuggestion[] = [];
        try {
          const res = await fetch(`/api/places/search?${fsqParams}`, {
            signal: ctrl.signal,
          });
          if (res.ok) {
            const data = (await res.json()) as {
              results?: Array<{
                fsqId: string;
                name: string;
                category: string | null;
                address: string | null;
                lat: number | null;
                lng: number | null;
              }>;
            };
            fsqResults = (data.results ?? [])
              .filter((r) => r.lat != null && r.lng != null)
              .map((r) => ({
                id: r.fsqId,
                name: r.name,
                context: r.address ?? r.category,
                lat: r.lat!,
                lng: r.lng!,
                category: r.category,
              }));
          }
        } catch {
          // Network/abort — drop to Mapbox fallback below.
        }

        // ── 2. Mapbox fallback for free-form text + addresses when FSQ
        //    came back empty. Keeps the "just type anything" promise.
        let mbResults: GeoSuggestion[] = [];
        if (fsqResults.length === 0) {
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
          if (token) {
            mbResults = await searchPlaces({
              query: q,
              proximity: destinationCenter ?? undefined,
              token,
              signal: ctrl.signal,
              limit: 6,
              language: locale,
            });
          }
        }

        setSuggestions(fsqResults.length > 0 ? fsqResults : mbResults);
        setShowSuggestions(true);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [title, destinationCenter, destination, open]);

  function handlePickSuggestion(s: GeoSuggestion) {
    setTitle(s.name);
    setLocation(s.context ?? "");
    setCoords({ lat: s.lat, lng: s.lng });
    // FSQ ids are short alphanumeric — Mapbox ids start with "poi.", etc.
    // We treat anything that isn't a Mapbox-shaped id as a Foursquare hit
    // so the server can fetch photo/rating later.
    if (!/^[a-z]+\.[a-z0-9]+/i.test(s.id)) {
      setPickedFsqId(s.id);
      setPickedFsqCategory(s.category);
    } else {
      setPickedFsqId(null);
      setPickedFsqCategory(null);
    }
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    // If user edits the title after picking a suggestion, drop the picked
    // coords — we don't want to attach Tokyo coords to a free-text entry.
    if (coords) setCoords(null);
    if (pickedFsqId) {
      setPickedFsqId(null);
      setPickedFsqCategory(null);
    }
  }

  function handleSubmit() {
    if (!title.trim() || !dayDate) {
      toast.error("Add a name and pick a day");
      return;
    }
    startTransition(async () => {
      try {
        const cost = costEstimate.trim() ? parseFloat(costEstimate.replace(",", ".")) : null;
        await createItineraryItemFromPlace({
          tripId,
          dayDate,
          title: title.trim(),
          // Pass through coords + location when we have them; server still
          // works fine with NULLs for the manual path.
          locationName: location.trim() || null,
          locationLat: coords?.lat ?? null,
          locationLng: coords?.lng ?? null,
          // B12-followup-3: when the user picked a Foursquare suggestion
          // we have the real fsq id + category — pass them through so
          // the server can skip the background re-search and go straight
          // to photo/rating enrichment.
          fsqId: pickedFsqId ?? "",
          fsqCategory: pickedFsqCategory,
          costEstimate: cost && Number.isFinite(cost) ? cost : null,
        });
        toast.success(`Added "${title.trim()}" to Day ${days.indexOf(dayDate) + 1}`);
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add place");
      }
    });
  }

  const canSubmit = title.trim().length > 0 && !!dayDate;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("itinerary.addToItinerary")}
      subtitle={t("itinerary.tripToDestination", { destination })}
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
        {/* Title — primary field, free-text with autocomplete suggestions */}
        <div className="relative">
          <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1.5 block">
            {t("itinerary.whatAreYouAdding")}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary/40">
            {searching ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
            ) : coords ? (
              <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 160)}
              placeholder={t("itinerary.typeName")}
              autoFocus
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
            />
            {title && (
              <button
                type="button"
                onClick={() => { setTitle(""); setCoords(null); setLocation(""); }}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Suggestion dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
              <p className="px-3 pt-2 pb-1 text-[9px] font-bold tracking-widest uppercase text-muted-foreground">
                {t("itinerary.suggestions")}
              </p>
              <ul className="max-h-64 overflow-y-auto">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        // Prevent blur from firing before click
                        e.preventDefault();
                        handlePickSuggestion(s);
                      }}
                      className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-accent/40 text-left transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{s.name}</p>
                        {s.context && (
                          <p className="text-[11px] text-muted-foreground truncate">{s.context}</p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hint when no suggestions yet */}
          {!showSuggestions && title.length < 2 && (
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              {t("itinerary.typeForSuggestions")}
            </p>
          )}
        </div>

        {/* Optional manual location override — shows when no suggestion picked */}
        {!coords && title.length >= 2 && (
          <div>
            <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1.5 block">
              Location <span className="opacity-60">(optional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Shibuya"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary/40"
            />
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

        {/* Optional time + cost — collapsed under a disclosure to stay clean */}
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
                placeholder="anything to remember"
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/40"
              />
            </div>
          </div>
        </details>
      </div>
    </BottomSheet>
  );
}
