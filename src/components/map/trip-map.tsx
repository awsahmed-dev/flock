"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { MapPin, CircleNotch as Loader2, Compass } from "@phosphor-icons/react/dist/ssr";
import { saveItemCoordinates } from "@/lib/actions/geocode-items";
import type { MapItem, PoiItem } from "./map-inner";

// Dynamic import — Leaflet requires window and cannot run on the server
const MapInner = dynamic(
  () => import("./map-inner").then((m) => m.MapInner),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <p className="text-sm">Loading map…</p>
        </div>
      </div>
    ),
  }
);

interface RawItem {
  id: string;
  title: string;
  type: string;
  status: string;
  dayDate: string;
  startTime?: string | null;
  costEstimate?: number | null;
  bookingUrl?: string | null;
  locationName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
}

interface Props {
  items: RawItem[];
  destination: string;
  tripId: string;
  onAddPoi?: (name: string, locationName: string) => void;
  /** B3-d: focus map bounds to a specific day's items + dim the others. */
  focusedDay?: string | null;
  /** B3-d: emphasise one marker (synced from list hover). */
  highlightedItemId?: string | null;
  /** B3-d: marker click bubbles up so the list can scroll/highlight. */
  onItemClick?: (itemId: string) => void;
}

// ── Nominatim geocode (client-side, rate-limit friendly) ──────────────────────

async function nominatim(q: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=0`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Paxawa-TravelApp/1.0", "Accept-Language": "en" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// ── Overpass: fetch tourist attractions around a point ─────────────────────────

const POI_LABEL: Record<string, string> = {
  museum: "Museum",
  viewpoint: "Viewpoint",
  gallery: "Gallery",
  theme_park: "Theme Park",
  zoo: "Zoo",
  aquarium: "Aquarium",
  attraction: "Attraction",
  monument: "Monument",
  castle: "Castle",
  ruins: "Historic Ruins",
  memorial: "Memorial",
  park: "Park",
  place_of_worship: "Temple / Shrine",
  artwork: "Artwork",
};

async function fetchOverpassPois(lat: number, lng: number): Promise<PoiItem[]> {
  const radius = 10000; // 10 km
  const query = `[out:json][timeout:12];(node["tourism"]["name"](around:${radius},${lat},${lng});node["historic"]["name"](around:${radius},${lat},${lng}););out 30;`;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12_000);
    // Use POST to avoid URL length/encoding issues
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    const seen = new Set<string>();
    const pois: PoiItem[] = [];
    for (const el of data.elements ?? []) {
      const name: string = el.tags?.name;
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      // prefer English name if available
      const displayName: string = el.tags?.["name:en"] ?? name;
      const category = el.tags?.tourism ?? el.tags?.historic ?? "attraction";
      pois.push({
        id: String(el.id),
        name: displayName,
        category,
        categoryLabel: POI_LABEL[category] ?? "Point of Interest",
        lat: el.lat,
        lng: el.lon,
        tags: el.tags,
      });
      if (pois.length >= 25) break;
    }
    return pois;
  } catch {
    return [];
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type GeoMap = Record<string, { lat: number; lng: number }>;

export function TripMap({ items, destination, tripId, onAddPoi, focusedDay = null, highlightedItemId = null, onItemClick }: Props) {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [pois, setPois] = useState<PoiItem[]>([]);
  const [poisLoading, setPoisLoading] = useState(false);
  const [extraCoords, setExtraCoords] = useState<GeoMap>({});
  const [geocodingCount, setGeocodingCount] = useState(0);
  const [geocodingTotal, setGeocodingTotal] = useState(0);
  const bootstrapped = useRef(false);

  // Step 1: geocode destination to get map center
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      const coords = await nominatim(destination);
      if (!coords) return;
      setCenter([coords.lat, coords.lng]);

      // Step 2: fetch POIs around destination
      setPoisLoading(true);
      const fetched = await fetchOverpassPois(coords.lat, coords.lng);
      setPois(fetched);
      setPoisLoading(false);

      // Step 3: geocode itinerary items that lack coordinates
      const toGeocode = items.filter(
        (i) =>
          i.status !== "rejected" &&
          i.locationName &&
          i.locationLat == null &&
          i.locationLng == null
      );
      if (toGeocode.length === 0) return;

      const limit = Math.min(toGeocode.length, 10);
      setGeocodingTotal(limit);
      setGeocodingCount(0);

      for (let i = 0; i < limit; i++) {
        const item = toGeocode[i];
        if (i > 0) await new Promise((r) => setTimeout(r, 1100));
        const geo = await nominatim(`${item.locationName}, ${destination}`);
        if (geo) {
          setExtraCoords((prev) => ({ ...prev, [item.id]: geo }));
          saveItemCoordinates(tripId, item.id, geo.lat, geo.lng).catch(() => null);
        }
        setGeocodingCount(i + 1);
      }

      setGeocodingTotal(0);
      setGeocodingCount(0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Merge DB coords + client-geocoded coords
  const mapItems = useMemo<MapItem[]>(() => {
    return items
      .filter((i) => i.status !== "rejected")
      .flatMap((i) => {
        const lat = i.locationLat ?? extraCoords[i.id]?.lat ?? null;
        const lng = i.locationLng ?? extraCoords[i.id]?.lng ?? null;
        if (lat == null || lng == null) return [];
        return [
          {
            id: i.id,
            title: i.title,
            type: i.type,
            status: i.status,
            dayDate: i.dayDate,
            startTime: i.startTime ?? null,
            costEstimate: i.costEstimate ?? null,
            bookingUrl: i.bookingUrl ?? null,
            locationName: i.locationName ?? null,
            lat,
            lng,
          } satisfies MapItem,
        ];
      });
  }, [items, extraCoords]);

  const isGeocoding = geocodingTotal > 0;
  const unmappedCount = items.filter(
    (i) =>
      i.status !== "rejected" &&
      i.locationName &&
      i.locationLat == null &&
      i.locationLng == null &&
      !extraCoords[i.id]
  ).length - (isGeocoding ? geocodingTotal - geocodingCount : 0);

  const handleAddPoi = useCallback(
    (poi: PoiItem) => {
      onAddPoi?.(poi.name, poi.name);
    },
    [onAddPoi]
  );

  // Status bar
  const statusBar = (
    <div className="flex items-center gap-4 px-4 py-2 border-b bg-card text-xs text-muted-foreground flex-wrap shrink-0">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Confirmed
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Proposed
      </span>
      {pois.length > 0 && (
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Recommendations
        </span>
      )}
      <span className="ms-auto flex items-center gap-3 font-medium text-foreground">
        {mapItems.length > 0 && (
          <span>{mapItems.length} planned</span>
        )}
        {poisLoading && (
          <span className="flex items-center gap-1 text-indigo-500 font-normal">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading places…
          </span>
        )}
        {!poisLoading && pois.length > 0 && (
          <span className="text-indigo-500">{pois.length} places nearby</span>
        )}
        {isGeocoding && (
          <span className="flex items-center gap-1 text-primary font-normal">
            <Loader2 className="w-3 h-3 animate-spin" />
            Locating {geocodingCount}/{geocodingTotal}
          </span>
        )}
      </span>
    </div>
  );

  if (!center) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
        {statusBar}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }} className="bg-muted/10">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Compass className="w-5 h-5 animate-pulse" />
            <p className="text-sm">Locating {destination}…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {statusBar}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <MapInner
          items={mapItems}
          pois={pois}
          center={center}
          onAddPoi={handleAddPoi}
          focusedDay={focusedDay}
          highlightedItemId={highlightedItemId}
          onItemClick={onItemClick}
        />
      </div>
    </div>
  );
}
