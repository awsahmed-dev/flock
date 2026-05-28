"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Search, MapPin, Star, Loader2, X, Calendar, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { createItineraryItemFromPlace } from "@/lib/actions/itinerary";

interface FsqHit {
  fsqId: string;
  name: string;
  category: string | null;
  categoryIcon: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  distance: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  /** Trip destination — biases the FSQ search location. */
  destination: string;
  /** Center bias (lng,lat) when known — overrides the `near` string. */
  destinationCenter: [number, number] | null;
  /** All trip days, "yyyy-MM-dd" — user picks which day this place lands on. */
  days: string[];
}

/**
 * B5: Foursquare-backed place search. User types a name; we hit
 * /api/places/search with the trip as bias. On select, we pull details
 * (photo, hours, rating, tip), then write straight to the itinerary.
 *
 * Two-stage UX: (1) search + select place, (2) day picker, then create.
 */
export function AddPlaceSearch({
  open,
  onClose,
  tripId,
  destination,
  destinationCenter,
  days,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FsqHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<FsqHit | null>(null);
  const [dayDate, setDayDate] = useState<string>(days[0] ?? "");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<number | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setChosen(null);
      setDayDate(days[0] ?? "");
    }
  }, [open, days]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("q", query.trim());
        if (destinationCenter) {
          params.set("lng", String(destinationCenter[0]));
          params.set("lat", String(destinationCenter[1]));
        } else {
          params.set("near", destination);
        }
        const res = await fetch(`/api/places/search?${params.toString()}`);
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as { results: FsqHit[] };
        setResults(data.results ?? []);
      } catch (err) {
        toast.error("Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, destinationCenter, destination, open]);

  async function handlePick(hit: FsqHit) {
    if (!hit.lat || !hit.lng) {
      toast.error("This place has no coordinates");
      return;
    }
    setChosen(hit);
  }

  function handleConfirm() {
    if (!chosen || !dayDate) return;
    startTransition(async () => {
      try {
        // Pull rich details before persisting — gives us photo + tip + hours.
        const detailsRes = await fetch(`/api/places/details?id=${encodeURIComponent(chosen.fsqId)}`);
        const details = detailsRes.ok ? await detailsRes.json() : null;

        await createItineraryItemFromPlace({
          tripId,
          dayDate,
          title: chosen.name,
          fsqId: chosen.fsqId,
          fsqCategory: chosen.category,
          locationName: chosen.address,
          locationLat: chosen.lat,
          locationLng: chosen.lng,
          photoUrl: details?.photoUrl ?? null,
          rating: details?.rating ?? null,
          priceLevel: details?.priceLevel ?? null,
          hoursSummary: details?.hoursSummary ?? null,
          topTip: details?.topTip ?? null,
        });
        toast.success(`Added ${chosen.name} to Day ${days.indexOf(dayDate) + 1}`);
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add place");
      }
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={chosen ? "Add to itinerary" : "Add a place"}
      subtitle={chosen ? chosen.name : `Search places in ${destination}`}
      size="md"
      footer={
        chosen ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setChosen(null)}
              disabled={isPending}
              className="rounded-xl border border-border bg-card hover:bg-accent/40 px-3 py-2.5 text-sm font-bold transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending || !dayDate}
              className="flex-1 rounded-xl bg-gradient-to-r from-primary to-violet-600 text-white py-2.5 text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Add to itinerary
            </button>
          </div>
        ) : null
      }
    >
      {/* Stage 1: search + result list */}
      {!chosen && (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 mb-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try 'ramen', 'sagrada familia', 'best coffee'…"
              autoFocus
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>

          {query.length < 2 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Type at least 2 characters to search Foursquare's place database.
            </p>
          ) : results.length === 0 && !loading ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No matches. Try a broader term.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {results.map((hit) => (
                <li key={hit.fsqId}>
                  <button
                    type="button"
                    onClick={() => handlePick(hit)}
                    className="w-full flex items-start gap-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent/30 transition-colors p-2.5 text-left"
                  >
                    {hit.categoryIcon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={hit.categoryIcon} alt="" className="w-8 h-8 rounded-lg bg-muted/40 p-1 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{hit.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {hit.category ?? "Place"}
                        {hit.address ? ` · ${hit.address}` : ""}
                      </p>
                    </div>
                    {hit.distance != null && (
                      <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                        {Math.round(hit.distance / 100) / 10} km
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Stage 2: day picker */}
      {chosen && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-start gap-2.5">
              {chosen.categoryIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={chosen.categoryIcon} alt="" className="w-9 h-9 rounded-lg bg-card p-1 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{chosen.name}</p>
                <p className="text-[11px] text-muted-foreground">{chosen.category ?? "Place"}</p>
                {chosen.address && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{chosen.address}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground inline-flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Add to day
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
                    <p className="text-[9px] font-bold tracking-widest uppercase">Day {idx + 1}</p>
                    <p className="text-xs font-bold mt-0.5">{format(parseISO(d), "MMM d")}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
