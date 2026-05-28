"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { type Map as MapboxMap, type Marker as MapboxMarker, type Popup as MapboxPopup } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * B5: Mapbox-powered Plan-page map.
 *
 * Roamy-style behavior:
 *   - Day-coloured numbered markers (each day gets a distinct hue; pins
 *     are numbered 1..N within the day).
 *   - Polylines connecting that day's items in itinerary order.
 *   - focusedDay subset → map flies to those bounds, other days fade.
 *   - Pin click bubbles an itemId for the parent to scroll the bottom
 *     sheet.
 *   - Tap a marker → popup with name + "Open in Google Maps" deep link.
 *
 * Bias-toward-stable: we re-use the same Mapbox instance across renders
 * (stored in a ref) and just push diffs to it. Markers/lines are
 * recreated each items-change because Mapbox sources are cheap to swap.
 */

export interface PlanMapItem {
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
  photoUrl?: string | null;
  rating?: number | null;
  fsqCategory?: string | null;
}

interface Props {
  items: PlanMapItem[];
  /** Destination text — used only as a fallback if items have no coords yet. */
  destinationCenter: [number, number] | null;
  focusedDay: string | null;
  highlightedItemId: string | null;
  onItemClick?: (itemId: string) => void;
  /** Ordered list of dayDates so colour assignment is stable across renders. */
  days: string[];
}

// Roamy uses ROY G BIV-ish palette per day. We replicate with 8 hues so
// most realistic trips don't repeat colors.
const DAY_PALETTE = [
  "#3b82f6", // blue   — day 1
  "#f97316", // orange — day 2
  "#eab308", // amber  — day 3 (Roamy day 3 sample)
  "#22c55e", // green
  "#a855f7", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
];

function colorForDay(day: string, dayIndex: Map<string, number>): string {
  const idx = dayIndex.get(day) ?? 0;
  return DAY_PALETTE[idx % DAY_PALETTE.length];
}

export function MapboxPlanMap({
  items,
  destinationCenter,
  focusedDay,
  highlightedItemId,
  onItemClick,
  days,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);
  const popupRef = useRef<MapboxPopup | null>(null);
  const [ready, setReady] = useState(false);

  // Build day → index lookup (stable per day order so day 1 is always blue).
  const dayIndex = new Map<string, number>();
  days.forEach((d, i) => dayIndex.set(d, i));

  // ── Init Mapbox once ───────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn("[mapbox] NEXT_PUBLIC_MAPBOX_TOKEN missing — map not rendered");
      return;
    }
    mapboxgl.accessToken = token;

    const initialCenter: [number, number] =
      destinationCenter ?? [items[0]?.lng ?? 0, items[0]?.lat ?? 0];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: initialCenter,
      zoom: 12,
      attributionControl: true,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => setReady(true));

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Center on destination once we know it ─────────────────────────
  useEffect(() => {
    if (!destinationCenter || !mapRef.current || items.length > 0) return;
    mapRef.current.flyTo({ center: destinationCenter, zoom: 12, duration: 800 });
  }, [destinationCenter, items.length]);

  // ── Sync markers + lines whenever items / focus changes ───────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Group items by day, preserving sort order (already incoming sorted by sortOrder).
    const byDay = new Map<string, PlanMapItem[]>();
    for (const it of items) {
      if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) continue;
      const arr = byDay.get(it.dayDate) ?? [];
      arr.push(it);
      byDay.set(it.dayDate, arr);
    }

    // ── Polylines: one feature per day connecting that day's items ─
    const features = [...byDay.entries()].map(([day, dayItems]) => ({
      type: "Feature" as const,
      properties: {
        day,
        dimmed: focusedDay !== null && focusedDay !== day,
        color: colorForDay(day, dayIndex),
      },
      geometry: {
        type: "LineString" as const,
        coordinates: dayItems.map((i) => [i.lng, i.lat]),
      },
    }));

    const collection = { type: "FeatureCollection" as const, features };

    const SRC = "plan-day-lines";
    const LAYER = "plan-day-lines-layer";
    if (map.getLayer(LAYER)) map.removeLayer(LAYER);
    if (map.getSource(SRC)) map.removeSource(SRC);
    map.addSource(SRC, { type: "geojson", data: collection });
    map.addLayer({
      id: LAYER,
      type: "line",
      source: SRC,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": 4,
        "line-opacity": [
          "case",
          ["get", "dimmed"], 0.25,
          0.9,
        ],
      },
    });

    // ── Markers ───────────────────────────────────────────────────
    for (const [day, dayItems] of byDay) {
      const color = colorForDay(day, dayIndex);
      const dimmed = focusedDay !== null && focusedDay !== day;
      dayItems.forEach((item, idx) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "mapbox-pin";
        el.style.width = highlightedItemId === item.id ? "36px" : "30px";
        el.style.height = highlightedItemId === item.id ? "36px" : "30px";
        el.style.borderRadius = "50%";
        el.style.background = color;
        el.style.color = "white";
        el.style.border = "2px solid white";
        el.style.boxShadow = highlightedItemId === item.id
          ? "0 4px 14px rgba(0,0,0,.5)"
          : "0 2px 6px rgba(0,0,0,.3)";
        el.style.fontWeight = "800";
        el.style.fontSize = highlightedItemId === item.id ? "14px" : "12px";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.cursor = "pointer";
        el.style.transition = "all .15s";
        el.style.opacity = dimmed ? "0.4" : "1";
        el.style.padding = "0";
        el.textContent = String(idx + 1);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onItemClick?.(item.id);
          // Open a lightweight popup with directions link.
          popupRef.current?.remove();
          const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}${item.locationName ? `&destination_place_id=${encodeURIComponent(item.locationName)}` : ""}`;
          const popupHtml = `
            <div style="min-width:200px;font-family:system-ui,sans-serif">
              ${item.photoUrl ? `<img src="${item.photoUrl}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:8px 8px 0 0;margin:-10px -10px 8px;display:block"/>` : ""}
              <div style="font-weight:700;font-size:13px;line-height:1.2;margin-bottom:4px">${escapeHtml(item.title)}</div>
              ${item.locationName ? `<div style="color:#6b7280;font-size:11px;margin-bottom:6px">${escapeHtml(item.locationName)}</div>` : ""}
              ${item.rating ? `<div style="color:#f59e0b;font-size:11px;font-weight:600;margin-bottom:6px">★ ${item.rating.toFixed(1)}</div>` : ""}
              <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;background:#3b82f6;color:white;padding:6px 10px;border-radius:8px;text-decoration:none;font-weight:700;font-size:11px">
                <span>↗</span> Open in Google Maps
              </a>
            </div>
          `;
          popupRef.current = new mapboxgl.Popup({ closeButton: true, offset: 18, maxWidth: "240px" })
            .setLngLat([item.lng, item.lat])
            .setHTML(popupHtml)
            .addTo(map);
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([item.lng, item.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // ── Fit bounds ─────────────────────────────────────────────────
    let fitTargets: [number, number][] = [];
    if (focusedDay && byDay.has(focusedDay)) {
      fitTargets = byDay.get(focusedDay)!.map((i) => [i.lng, i.lat]);
    } else {
      fitTargets = items.filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng))
        .map((i) => [i.lng, i.lat]);
    }
    if (fitTargets.length === 1) {
      map.flyTo({ center: fitTargets[0], zoom: 15, duration: 700 });
    } else if (fitTargets.length > 1) {
      const bounds = new mapboxgl.LngLatBounds(fitTargets[0], fitTargets[0]);
      for (const c of fitTargets) bounds.extend(c);
      map.fitBounds(bounds, { padding: { top: 80, right: 60, bottom: 240, left: 60 }, maxZoom: 16, duration: 700 });
    }
  }, [items, focusedDay, highlightedItemId, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="absolute inset-0" />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
