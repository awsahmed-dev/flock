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

function makeItemIcon(status: string, type: string) {
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

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:36px;height:36px;border-radius:50% 50% 50% 0;
        background:${bg};border:2px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,.35);
        transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:14px;line-height:1">${emoji}</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -40],
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

function FitBounds({ positions, center }: { positions: [number, number][]; center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) {
      map.setView(center, 13);
    } else if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [48, 48] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(positions)]);
  return null;
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
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MapInner({ items, pois = [], center, onAddPoi }: Props) {
  const itemPositions = items.map((i) => [i.lat, i.lng] as [number, number]);
  // Fit to itinerary items if any; otherwise just center on destination
  const fitPositions = itemPositions.length > 0 ? itemPositions : [];

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
      <FitBounds positions={fitPositions} center={center} />

      {/* Itinerary item markers */}
      {items.map((item) => (
        <Marker
          key={item.id}
          position={[item.lat, item.lng]}
          icon={makeItemIcon(item.status, item.type)}
          zIndexOffset={100}
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
      ))}

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
