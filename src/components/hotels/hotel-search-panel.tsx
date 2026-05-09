"use client";

import { useState, useTransition, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Hotel,
  Star,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  MessageSquarePlus,
  CheckSquare,
  Square,
  Vote,
  Building2,
  Tent,
  Home,
  Palmtree,
  Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidePanel } from "@/components/ui/side-panel";
import { toast } from "sonner";
import { suggestHotel, suggestMultipleHotels } from "@/lib/actions/hotels";
import type { HotelResult, StayType } from "@/app/api/hotels/search/route";

interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  destination: string;
}

const STAY_TYPES: { value: StayType; label: string; icon: React.ReactNode }[] = [
  { value: "hotel", label: "Hotel", icon: <Building2 className="w-3.5 h-3.5" /> },
  { value: "hostel", label: "Hostel", icon: <Tent className="w-3.5 h-3.5" /> },
  { value: "apartment", label: "Apartment", icon: <Home className="w-3.5 h-3.5" /> },
  { value: "resort", label: "Resort", icon: <Palmtree className="w-3.5 h-3.5" /> },
  { value: "b&b", label: "B&B", icon: <Coffee className="w-3.5 h-3.5" /> },
];

const BUDGET_RANGES = [
  { label: "Any", min: 0, max: 4 },
  { label: "$", min: 1, max: 1 },
  { label: "$$", min: 2, max: 2 },
  { label: "$$$", min: 3, max: 3 },
  { label: "$$$$", min: 4, max: 4 },
];

const RATING_OPTIONS = [
  { label: "Any rating", value: 0 },
  { label: "3.5+", value: 3.5 },
  { label: "4+", value: 4 },
  { label: "4.5+", value: 4.5 },
];

const PRICE_COLOR = [
  "",
  "text-emerald-600 dark:text-emerald-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-amber-600 dark:text-amber-400",
  "text-rose-600 dark:text-rose-400",
];
const PRICE_LABEL = ["", "$", "$$", "$$$", "$$$$"];

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${
              i < full
                ? "fill-amber-400 text-amber-400"
                : i === full && half
                ? "fill-amber-200 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

export function HotelSearchPanel({ open, onClose, tripId, destination }: Props) {
  const router = useRouter();

  const [city, setCity] = useState(destination);
  const [stayType, setStayType] = useState<StayType>("hotel");
  const [budgetIdx, setBudgetIdx] = useState(0); // index into BUDGET_RANGES
  const [minRating, setMinRating] = useState(0);
  const [allHotels, setAllHotels] = useState<HotelResult[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [suggesting, setSuggesting] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll — load 5 more when sentinel is visible
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < allHotels.length) {
          setVisibleCount((v) => Math.min(v + 5, allHotels.length));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, allHotels.length]);

  const hotels = useMemo(() => allHotels.slice(0, visibleCount), [allHotels, visibleCount]);

  // Auto-search first time panel opens
  useEffect(() => {
    if (open && !searched && !loading) {
      fetchHotels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedHotels = useMemo(
    () => hotels.filter((h) => selected.has(h.hotelId)),
    [hotels, selected]
  );

  async function fetchHotels() {
    if (!city.trim()) return;
    setLoading(true);
    setError(null);
    setSelected(new Set());
    setVisibleCount(5); // reset pagination on new search
    try {
      const budget = BUDGET_RANGES[budgetIdx];
      const params = new URLSearchParams({
        destination: city.trim(),
        type: stayType,
        minPrice: String(budget.min),
        maxPrice: String(budget.max),
        minRating: String(minRating),
        limit: "25",
      });
      const res = await fetch(`/api/hotels/search?${params}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setAllHotels([]);
      } else {
        setAllHotels(data.hotels ?? []);
        setSearched(true);
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSuggestSingle(hotel: HotelResult) {
    setSuggesting(hotel.hotelId);
    startTransition(async () => {
      try {
        await suggestHotel(
          tripId,
          {
            name: hotel.name,
            address: hotel.address,
            rating: hotel.rating,
            priceLevel: hotel.priceLevel,
            photoUrl: hotel.photoUrl,
            mapsUrl: hotel.mapsUrl,
            bookingUrl: hotel.bookingUrl,
          },
          city
        );
        toast.success(`Suggested "${hotel.name}" to the group!`);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to suggest");
      } finally {
        setSuggesting(null);
      }
    });
  }

  function handleCompareSelected() {
    if (selectedHotels.length < 2) {
      toast.error("Select at least 2 hotels to compare");
      return;
    }
    setSuggesting("bulk");
    startTransition(async () => {
      try {
        await suggestMultipleHotels(
          tripId,
          selectedHotels.map((h) => ({
            name: h.name,
            address: h.address,
            rating: h.rating,
            priceLevel: h.priceLevel,
            photoUrl: h.photoUrl,
            mapsUrl: h.mapsUrl,
            bookingUrl: h.bookingUrl,
          }))
        );
        toast.success(`Started vote comparing ${selectedHotels.length} hotels!`);
        onClose();
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to compare");
      } finally {
        setSuggesting(null);
      }
    });
  }

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Find a Stay"
      subtitle={`${allHotels.length ? `${allHotels.length} options in ${city}` : `Search stays in ${destination}`}`}
      icon={<Hotel className="w-4 h-4 text-white" />}
      accentGradient="from-blue-500 to-cyan-600"
      width="md"
    >
      {/* Filter form */}
      <div className="p-4 space-y-3 border-b">
        {/* City */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            City
          </label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-xl border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchHotels();
                }}
                placeholder="e.g. Tokyo, Paris, Bali"
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Button
              size="sm"
              onClick={fetchHotels}
              disabled={loading || !city.trim()}
              className="shrink-0 bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 border-0"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
            </Button>
          </div>
        </div>

        {/* Stay type */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Type
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {STAY_TYPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStayType(s.value)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                  stayType === s.value
                    ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Budget
          </label>
          <div className="flex gap-1 rounded-xl border bg-background p-1">
            {BUDGET_RANGES.map((b, i) => (
              <button
                key={b.label}
                type="button"
                onClick={() => setBudgetIdx(i)}
                className={`flex-1 rounded-lg py-1 text-xs font-medium transition-all ${
                  budgetIdx === i
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Min rating */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Min Rating
          </label>
          <div className="flex gap-1 rounded-xl border bg-background p-1">
            {RATING_OPTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setMinRating(r.value)}
                className={`flex-1 rounded-lg py-1 text-xs font-medium transition-all ${
                  minRating === r.value
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-10 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-xs text-muted-foreground">Finding stays in {city}…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="m-4 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3 space-y-1">
          <p className="text-xs text-destructive">{error}</p>
          {(error.includes("not configured") || error.includes("not enabled")) && (
            <p className="text-xs text-muted-foreground">
              Add <code className="bg-muted px-1 rounded text-[10px]">GOOGLE_MAPS_API_KEY</code> and enable the{" "}
              <strong>Places API</strong> in Google Cloud Console.
            </p>
          )}
        </div>
      )}

      {/* Empty */}
      {searched && !loading && hotels.length === 0 && !error && (
        <div className="flex flex-col items-center py-10 text-center px-4">
          <p className="text-sm text-muted-foreground">No matches in {city}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different city, loosen filters, or expand the budget range
          </p>
        </div>
      )}

      {/* Results */}
      {hotels.length > 0 && !loading && (
        <>
          {/* Selection toolbar */}
          {selectedHotels.length > 0 && (
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur">
              <span className="text-xs text-muted-foreground">
                {selectedHotels.length} selected
              </span>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}

          <div className="px-4 pt-2 pb-1">
            <p className="text-[11px] text-muted-foreground">
              Showing {Math.min(visibleCount, allHotels.length)} of {allHotels.length} results
              {visibleCount < allHotels.length && " — scroll for more"}
            </p>
          </div>
          <div className="px-4 pb-4 space-y-3">
            {hotels.map((hotel) => {
              const isSelected = selected.has(hotel.hotelId);
              const isSuggesting = suggesting === hotel.hotelId;
              return (
                <div
                  key={hotel.hotelId}
                  className={`rounded-xl border bg-background overflow-hidden transition-colors ${
                    isSelected
                      ? "border-blue-400 shadow-sm shadow-blue-500/10"
                      : "border-border/60 hover:border-blue-200 dark:hover:border-blue-800"
                  }`}
                >
                  {hotel.photoUrl && (
                    <div className="relative h-28 w-full overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={hotel.photoUrl}
                        alt={hotel.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSelect(hotel.hotelId)}
                        className="absolute top-2 right-2 p-1 rounded-md bg-white/90 dark:bg-black/60 backdrop-blur shadow-sm hover:scale-110 transition-transform"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  )}

                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-snug">{hotel.name}</p>
                        {hotel.address && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {hotel.address}
                          </p>
                        )}
                      </div>
                      {hotel.priceLevel !== undefined && hotel.priceLevel > 0 && (
                        <span className={`shrink-0 text-sm font-bold ${PRICE_COLOR[hotel.priceLevel]}`}>
                          {PRICE_LABEL[hotel.priceLevel]}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <StarRating rating={hotel.rating} />
                      {hotel.userRatingsTotal !== undefined && hotel.userRatingsTotal > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {hotel.userRatingsTotal.toLocaleString()} reviews
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      {hotel.mapsUrl && (
                        <a
                          href={hotel.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 hover:bg-muted px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          Maps
                        </a>
                      )}
                      {hotel.bookingUrl && (
                        <a
                          href={hotel.bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 hover:bg-muted px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          Booking
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSuggestSingle(hotel)}
                        disabled={isSuggesting || suggesting !== null}
                        className="ml-auto inline-flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 px-2 py-1 text-[11px] text-blue-600 dark:text-blue-400 transition-colors disabled:opacity-50"
                      >
                        {isSuggesting ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <MessageSquarePlus className="w-2.5 h-2.5" />
                        )}
                        Suggest
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="px-4 py-2">
            {visibleCount < allHotels.length && (
              <div className="flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Bulk compare bar */}
          {selectedHotels.length >= 2 && (
            <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur p-3">
              <Button
                onClick={handleCompareSelected}
                disabled={suggesting !== null}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 border-0"
              >
                {suggesting === "bulk" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Vote className="w-4 h-4 mr-2" />
                    Compare {selectedHotels.length} in a group vote
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </SidePanel>
  );
}
