"use client";

// ⚠️  This file is SSR-unsafe — always load via dynamic(() => import(...), { ssr: false })
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Itinerary item markers (teardrop, coloured by status) ──────────────────────

function makeItemIcon(
  status: string,
  type: string,
  opts: { dimmed?: boolean; highlighted?: boolean } = {},
) {
  const colors: Record<string, string> = {
    confirmed: "#22c55e",
    proposed: "#f59e0b",
    rejected: "#ef4444",
  };
  const bg = colors[status] ?? "#6366f1";

  const typeEmoji: Record<string, string> = {
    activity: "🎟",
    accommodation: "🏨",
    transport: "🚌",
    meal: "🍜",
    other: "📍",
  };
  const emoji = typeEmoji[type] ?? "📍";

  // B3-d: dimmed markers fade so the focused day reads as the foreground.
  // Highlighted markers bump 25% larger with a colored ring.
  const opacity = opts.dimmed ? 0.32 : 1;
  const size = opts.highlighted ? 46 : 36;
  const ringColor = opts.highlighted ? "#a855f7" : "white";
  const ringWidth = opts.highlighted ? 3 : 2;
  const shadow = opts.highlighted
    ? "0 4px 16px rgba(168,85,247,.6)"
    : "0 2px 8px rgba(0,0,0,.35)";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;
        background:${bg};border:${ringWidth}px solid ${ringColor};
        box-shadow:${shadow};
        transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center;
        opacity:${opacity};
        transition:opacity .2s, width .15s, height .15s;
      ">
        <span style="transform:rotate(45deg);font-size:${opts.highlighted ? 18 : 14}px;line-height:1">${emoji}</span>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size - 4],
  });
}

// ── POI recommendation markers (circle, indigo) ───────────────────────────────

const POI_EMOJI: Record<string, string> = {
  museum: "🏛️",
  viewpoint: "👁️",
  gallery: "🖼️",
  theme_park: "🎢",
  zoo: "🦁",
  aquarium: "🐟",
  attraction: "⭐",
  monument: "🗿",
  castle: "🏯",
  ruins: "🏚️",
  memorial: "🕊️",
  park: "🌳",
  place_of_worship: "⛩️",
  artwork: "🎨",
};

function makePoiIcon(category: string) {
  const emoji = POI_EMOJI[category] ?? "📌";
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:32px;height:32px;border-radius:50%;
        background:#6366f1;border:2.5px solid white;
        box-shadow:0 2px 8px rgba(99,102,241,.5);
        display:flex;align-items:center;justify-content:center;
        position:relative;
      ">
        <span style="font-size:13px;line-height:1">${emoji}</span>
      </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

// ── Auto-fit bounds when markers change ────────────────────────────────────────

function FitBounds({
  positions,
  center,
  /** When set, take precedence — fit to this subset only (e.g. a single
   *  day's items). Lets the parent "focus" the map on day-click without
   *  re-rendering the marker layer. */
  focusPositions,
}: {
  positions: [number, number][];
  center: [number, number];
  focusPositions?: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    const target = focusPositions && focusPositions.length > 0 ? focusPositions : positions;
    if (target.length === 0) {
      map.setView(center, 13);
    } else if (target.length === 1) {
      map.setView(target[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(target), { padding: [60, 60], maxZoom: 16 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(target_or(positions, focusPositions))]);
  return null;
}

// Tiny helper so FitBounds' dep array can serialise the "effective target"
// without a useMemo. Keeps re-renders predictable.
function target_or(positions: [number, number][], focusPositions?: [number, number][]) {
  return focusPositions && focusPositions.length > 0 ? focusPositions : positions;
}

// ── Public types ───────────────────────────────────────────────────────────────

export interface MapItem {
  id: string;
  title: string;
  type: string;
  status: string;
  dayDate: string;
  startTime: string | null;
  costEstimate: number | null;
  bookingUrl: string | null;
  locationName: string | null;
  lat: number;
  lng: number;
}

export interface PoiItem {
  id: string;
  name: string;
  category: string;      // e.g. "museum", "attraction", "castle"
  categoryLabel: string; // human-readable
  lat: number;
  lng: number;
  tags?: Record<string, string>;
}

interface Props {
  items: MapItem[];
  pois?: PoiItem[];
  center: [number, number];
  onAddPoi?: (poi: PoiItem) => void;
  /** B3-d: when set, the map fits to only this day's items and dims
   *  markers from other days so the focused day reads clearly. */
  focusedDay?: string | null;
  /** B3-d: a single item id to emphasise — bumped z-index + larger icon. */
  highlightedItemId?: string | null;
  /** B3-d: bubble up marker clicks so the parent can scroll the day list
   *  to the corresponding card. */
  onItemClick?: (itemId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MapInner({
  items,
  pois = [],
  center,
  onAddPoi,
  focusedDay = null,
  highlightedItemId = null,
  onItemClick,
}: Props) {
  const itemPositions = items.map((i) => [i.lat, i.lng] as [number, number]);
  const fitPositions = itemPositions.length > 0 ? itemPositions : [];

  // B3-d: when a day is focused, narrow the fit-bounds target and dim
  // markers from other days so the focused day reads clearly.
  const focusedPositions = focusedDay
    ? items.filter((i) => i.dayDate === focusedDay).map((i) => [i.lat, i.lng] as [number, number])
    : undefined;

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <FitBounds positions={fitPositions} center={center} focusPositions={focusedPositions} />

      {/* Itinerary item markers */}
      {items.map((item) => {
        const dimmed = focusedDay !== null && item.dayDate !== focusedDay;
        const highlighted = highlightedItemId === item.id;
        return (
        <Marker
          key={item.id}
          position={[item.lat, item.lng]}
          icon={makeItemIcon(item.status, item.type, { dimmed, highlighted })}
          zIndexOffset={highlighted ? 1000 : dimmed ? 10 : 100}
          eventHandlers={
            onItemClick
              ? { click: () => onItemClick(item.id) }
              : undefined
          }
        >
          <Popup>
            <div className="min-w-[180px] space-y-1 text-sm">
              <p className="font-semibold leading-tight">{item.title}</p>
              {item.locationName && (
                <p className="text-xs text-gray-500">{item.locationName}</p>
              )}
              <div className="flex items-center gap-2 text-xs">
                <span
                  className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-medium"
                  style={{
                    background:
                      item.status === "confirmed" ? "#22c55e"
                      : item.status === "proposed" ? "#f59e0b"
                      : "#ef4444",
                  }}
                >
                  {item.status}
                </span>
                <span className="text-gray-500">{item.dayDate}</span>
              </div>
              {item.startTime && (
                <p className="text-xs text-gray-500">🕐 {item.startTime}</p>
              )}
              {item.costEstimate != null && (
                <p className="text-xs font-medium">💰 ${item.costEstimate.toFixed(0)}</p>
              )}
              {item.bookingUrl && (
                <a
                  href={item.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline"
                >
                  View booking →
                </a>
              )}
            </div>
          </Popup>
        </Marker>
        );
      })}

      {/* POI recommendation markers */}
      {pois.map((poi) => (
        <Marker
          key={poi.id}
          position={[poi.lat, poi.lng]}
          icon={makePoiIcon(poi.category)}
          zIndexOffset={0}
        >
          <Popup>
            <div className="min-w-[180px] space-y-2 text-sm">
              <div>
                <p className="font-semibold leading-tight">{poi.name}</p>
                <p className="text-[11px] text-indigo-600 font-medium mt-0.5">{poi.categoryLabel}</p>
              </div>
              {onAddPoi && (
                <button
                  type="button"
                  onClick={() => onAddPoi(poi)}
                  className="w-full rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-1.5 px-3 transition-colors"
                >
                  + Add to itinerary
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
