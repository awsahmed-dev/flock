"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/locale-provider";
import mapboxgl, { type Map as MapboxMap, type Marker as MapboxMarker, type Popup as MapboxPopup } from "mapbox-gl";

// B7c-fix: Mapbox CSS now ships via a server-rendered `<link>` in
// src/app/layout.tsx. Runtime injection ran too late — Mapbox's init
// pass checked for CSS before our async injection landed, then rendered
// a styleless canvas that never recovered.

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
  /** Draw road-following route polylines between a day's pins (default true).
   *  Discover sets this false — its pins are unconnected places, not a route,
   *  so we skip both the lines and the Directions API calls. */
  showRoutes?: boolean;
  /** Override pin color (e.g. Discover uses one accent for all). Default = the
   *  per-day palette. */
  pinColor?: string;
  /** Show the sequence number inside each pin (default true). Discover sets
   *  false → plain place pins, not numbered itinerary stops. */
  numbered?: boolean;
  /** Mapbox style id (e.g. "dark-v11" for the NOW cockpit). Default streets-v12. */
  mapStyle?: string;
  /** Padding (px) applied when fitting the route into view. The NOW cockpit
   *  passes the resting bottom-sheet height as `bottom` so today's route sits
   *  in the visible strip above the sheet instead of hiding behind it. */
  fitPadding?: { top: number; bottom: number; left: number; right: number };
  /** Show the top-right zoom control. Off in the immersive NOW cockpit, where
   *  it would collide with the floating top-bar buttons (pinch-zoom works). */
  showNav?: boolean;
}

// Visual-fix FIX 5: the shared 10-color day palette (lib/day-colors) so
// route lines, pins and day-rail chips all agree on each day's color.
import { getDayColor } from "@/lib/day-colors";

function colorForDay(day: string, dayIndex: Map<string, number>): string {
  return getDayColor(dayIndex.get(day) ?? 0);
}

export function MapboxPlanMap({
  items,
  destinationCenter,
  focusedDay,
  highlightedItemId,
  onItemClick,
  days,
  showRoutes = true,
  pinColor,
  numbered = true,
  mapStyle = "streets-v12",
  fitPadding,
  showNav = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);
  const popupRef = useRef<MapboxPopup | null>(null);
  const t = useT();
  const [ready, setReady] = useState(false);
  // B7c: Mapbox Directions route cache. Key = "{day}|{lng,lat;lng,lat;…}"
  // so a re-render with the same items doesn't refetch. Value = the
  // route's GeoJSON LineString coordinates following actual roads.
  const routeCacheRef = useRef<Map<string, [number, number][]>>(new Map());
  // Bumped whenever a new route lands, to force the marker-and-line sync
  // effect to redraw with the road geometry.
  const [routeVersion, setRouteVersion] = useState(0);

  // Build day → index lookup (stable per day order so day 1 is always blue).
  const dayIndex = new Map<string, number>();
  days.forEach((d, i) => dayIndex.set(d, i));

  const [tokenMissing, setTokenMissing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Init Mapbox once ───────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn("[mapbox] NEXT_PUBLIC_MAPBOX_TOKEN missing — map not rendered");
      setTokenMissing(true);
      return;
    }
    mapboxgl.accessToken = token;

    const initialCenter: [number, number] =
      destinationCenter ?? [items[0]?.lng ?? 0, items[0]?.lat ?? 0];

    let map: MapboxMap;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        // B7c-fix5: direct HTTPS style URL with token in the query.
        // The `mapbox://styles/...` scheme is supposed to resolve via
        // RequestManager but in this build the resolver never kicks
        // off a TileJSON request, leaving the map stuck on its base
        // land color forever. Direct URL bypasses the broken resolver
        // and lets Mapbox process the style JSON normally.
        style: `https://api.mapbox.com/styles/v1/mapbox/${mapStyle}?access_token=${token}`,
        center: initialCenter,
        zoom: 12,
        attributionControl: true,
        accessToken: token,
        // B7c-fix4: bulletproof token injection. Mapbox v3.24 bundled by
        // Next.js 16 wasn't picking up either the `mapboxgl.accessToken`
        // module global OR the `accessToken` constructor option — the
        // RequestManager ended up with `_accessToken: undefined`, so it
        // produced TileJSON URLs without `?access_token=…` and got
        // silently 401'd, leaving the map stuck on its land base color
        // with zero vector tiles ever loaded. transformRequest fires
        // for every URL the map fetches; append the token to any
        // api.mapbox.com URL that doesn't already have it.
        transformRequest: (url) => {
          if (
            url.startsWith("https://api.mapbox.com/") &&
            !url.includes("access_token=")
          ) {
            const sep = url.includes("?") ? "&" : "?";
            return { url: url + sep + "access_token=" + token };
          }
          return { url };
        },
      });
    } catch (err) {
      console.error("[mapbox] init failed", err);
      setErrorMsg(err instanceof Error ? err.message : "Map init failed");
      return;
    }
    mapRef.current = map;
    // B7c debug: expose for in-browser diagnostics. Remove once map's
    // reliably rendering.
    (window as any).__mb = map;

    if (showNav) {
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    }

    // B15: localize on-map labels. The streets-v12 style ships a
    // text-field expression that falls back to the local name; we
    // override it to prefer the user's locale (ar / en) so a Saudi
    // user browsing Tokyo sees "طوكيو" instead of "Tokyo". The HTML
    // `lang` attribute is the source of truth — set by the root
    // layout, read here so we don't have to thread props through.
    map.on("style.load", () => {
      try {
        const lang =
          typeof document !== "undefined" && document.documentElement.lang
            ? document.documentElement.lang.split("-")[0]
            : "en";
        const expr: any = [
          "coalesce",
          ["get", `name_${lang}`],
          ["get", "name"],
        ];
        for (const layer of map.getStyle()?.layers ?? []) {
          if (
            layer.type === "symbol" &&
            (layer.layout as any)?.["text-field"]
          ) {
            map.setLayoutProperty(layer.id, "text-field", expr);
          }
        }
      } catch (err) {
        console.warn("[mapbox] label localization skipped:", err);
      }
    });

    // QA BUG-5: gate EVERY addSource/addLayer on style.load, not load.
    // "load" waits for tiles and can fire around an in-flight setStyle
    // (theme resolution swaps the basemap right after mount) — layers added
    // in that window throw "Style is not done loading" and the whole
    // marker/line sync dies, leaving a blank basemap. style.load fires for
    // the initial style AND every setStyle, and bumping routeVersion here
    // re-runs the sync effect after each one.
    map.on("style.load", () => {
      setReady(true);
      setRouteVersion((v) => v + 1);
    });
    map.on("error", (e) => {
      // Mapbox emits an error event for token issues, tile failures, etc.
      // Surface it so we stop guessing why the canvas is blank.
      const m = e?.error?.message ?? "Map error";
      console.error("[mapbox]", m, e);
      setErrorMsg(m);
    });

    // B7c: container can be 0×0 on first paint if the parent is still
    // settling height. A one-shot resize catches the immediate post-
    // layout dimensions; a ResizeObserver catches every subsequent
    // resize (sheet expand, viewport resize, etc.) so the canvas always
    // matches the available space instead of locking to first-paint.
    const t = setTimeout(() => map.resize(), 80);
    const ro = new ResizeObserver(() => map.resize());
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      clearTimeout(t);
      ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── §10.1 Theme Schism: swap the basemap when the app theme flips ──
  // The map inits once with the initial style; when the mapStyle prop
  // changes (dark-v11 ↔ light-v11 on theme toggle) we setStyle in place.
  // setStyle wipes all sources/layers, so bump routeVersion on the next
  // style.load to force the marker/line sync effect to redraw.
  const appliedStyleRef = useRef(mapStyle);
  useEffect(() => {
    const map = mapRef.current;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!map || !token || appliedStyleRef.current === mapStyle) return;
    appliedStyleRef.current = mapStyle;
    map.setStyle(`https://api.mapbox.com/styles/v1/mapbox/${mapStyle}?access_token=${token}`);
    // Redraw is triggered by the persistent style.load handler (QA BUG-5).
  }, [mapStyle]);

  // ── Center on destination once we know it ─────────────────────────
  useEffect(() => {
    if (!destinationCenter || !mapRef.current || items.length > 0) return;
    mapRef.current.flyTo({ center: destinationCenter, zoom: 12, duration: 800 });
  }, [destinationCenter, items.length]);

  // ── Fetch Mapbox Directions for a day's route (cached) ────────────
  // Async + best-effort. Falls back to straight lines if the API trips.
  // Up to 25 coords per request; we trim if a day somehow exceeds that.
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !showRoutes) return; // Discover: no routes → no Directions calls

    const byDay = new Map<string, PlanMapItem[]>();
    for (const it of items) {
      if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) continue;
      const arr = byDay.get(it.dayDate) ?? [];
      arr.push(it);
      byDay.set(it.dayDate, arr);
    }

    let cancelled = false;
    (async () => {
      for (const [day, dayItems] of byDay) {
        if (dayItems.length < 2) continue;
        const key = routeKey(day, dayItems);
        if (routeCacheRef.current.has(key)) continue;

        const coords = dayItems
          .slice(0, 25)
          .map((i) => `${i.lng},${i.lat}`)
          .join(";");
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${token}`;
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = (await res.json()) as {
            routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
          };
          const geom = data.routes?.[0]?.geometry?.coordinates;
          if (geom && geom.length > 1) {
            routeCacheRef.current.set(key, geom);
          }
        } catch {
          // Network / quota error — leave un-cached so next render retries.
        }
      }
      if (!cancelled && routeCacheRef.current.size > 0) {
        setRouteVersion((v) => v + 1);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  // ── Sync markers + lines whenever items / focus changes ───────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // B7c: when a day is focused, only render THAT day's stuff.
    const visibleItems = focusedDay
      ? items.filter((it) => it.dayDate === focusedDay)
      : items;

    // Group items by day, preserving sort order (already incoming sorted by sortOrder).
    const byDay = new Map<string, PlanMapItem[]>();
    for (const it of visibleItems) {
      if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) continue;
      const arr = byDay.get(it.dayDate) ?? [];
      arr.push(it);
      byDay.set(it.dayDate, arr);
    }

    // ── Polylines: one feature per day, using road-following route
    //    from Directions when available, else straight line as fallback.
    //    Discover (showRoutes=false) draws none — its pins aren't a route.
    //    Fix 5: EVERY day's route renders (multi-colored per the day palette,
    //    never collapsed to one accent) with the focused day emphasized (4px,
    //    full opacity) and the rest dimmed context (2px, 30%). Markers below
    //    still show only the focused day, so the map stays uncluttered.
    const lineByDay = new Map<string, PlanMapItem[]>();
    for (const it of items) {
      if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) continue;
      const arr = lineByDay.get(it.dayDate) ?? [];
      arr.push(it);
      lineByDay.set(it.dayDate, arr);
    }
    const features = (showRoutes ? [...lineByDay.entries()] : [])
      .filter(([, dayItems]) => dayItems.length >= 2)
      .map(([day, dayItems]) => {
        const cached = routeCacheRef.current.get(routeKey(day, dayItems));
        const coordinates = cached ?? dayItems.map((i) => [i.lng, i.lat] as [number, number]);
        return {
          type: "Feature" as const,
          properties: {
            day,
            // §4: when a single pin colour is supplied (the Full Map passes the
            // accent purple), the route lines match it; otherwise fall back to
            // the per-day palette hue.
            color: pinColor ?? colorForDay(day, dayIndex),
            focused: !focusedDay || day === focusedDay,
          },
          geometry: { type: "LineString" as const, coordinates },
        };
      })
      // Focused day last → its line paints on top of the dimmed ones.
      .sort((a, b) => Number(a.properties.focused) - Number(b.properties.focused));

    const collection = { type: "FeatureCollection" as const, features };

    // QA BUG-5: layer surgery only on a fully-loaded style; if a setStyle is
    // in flight, defer to the next style.load (routeVersion bump re-runs this
    // effect) and never let a layer throw kill the DOM markers below.
    const SRC = "plan-day-lines";
    const LAYER = "plan-day-lines-layer";
    if (map.isStyleLoaded()) {
      try {
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
            "line-width": ["case", ["get", "focused"], 4, 2],
            "line-opacity": ["case", ["get", "focused"], 1.0, 0.3],
          },
        });
      } catch (err) {
        console.warn("[mapbox] route layer deferred:", err);
        map.once("style.load", () => setRouteVersion((v) => v + 1));
      }
    } else {
      map.once("style.load", () => setRouteVersion((v) => v + 1));
    }

    // ── Markers ───────────────────────────────────────────────────
    for (const [day, dayItems] of byDay) {
      const color = pinColor ?? colorForDay(day, dayIndex);
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
        el.style.opacity = "1";
        el.style.padding = "0";
        el.textContent = numbered ? String(idx + 1) : "";

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
    const pad = fitPadding ?? { top: 80, right: 60, bottom: 240, left: 60 };
    if (fitTargets.length === 1) {
      map.flyTo({ center: fitTargets[0], zoom: 15, duration: 700, padding: pad });
    } else if (fitTargets.length > 1) {
      const bounds = new mapboxgl.LngLatBounds(fitTargets[0], fitTargets[0]);
      for (const c of fitTargets) bounds.extend(c);
      map.fitBounds(bounds, { padding: pad, maxZoom: 16, duration: 700 });
    }
  }, [items, focusedDay, highlightedItemId, ready, routeVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* B7c-fix: wrapped container.
          Mapbox GL JS injects `.mapboxgl-map { position: relative }`
          into the head, which wins the cascade vs Tailwind's `absolute`
          utility (same specificity, loaded later). My old container
          had `absolute inset-0`, which Mapbox flipped to relative —
          and a relative div with no explicit height collapses to 0.
          Canvas rendered at 300px but was clipped to a 0-tall parent,
          and Mapbox's transform stayed tiny so tile fetches never
          fired. The wrapper now gives us a positioned parent; the
          ref'd div is `w-full h-full` which works under any position
          mode Mapbox chooses for us. */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="w-full h-full bg-muted/30" />
      </div>
      {/* Sprint 9 FIX-6: opaque skeleton until the basemap style loads —
          the split view never shows a half-rendered black canvas. */}
      {!ready && !tokenMissing && !errorMsg && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 border-t-muted-foreground animate-spin" />
            {t("itinerary.loadingMap")}
          </div>
        </div>
      )}
      {(tokenMissing || errorMsg) && (
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-xs text-amber-700 dark:text-amber-300 max-w-xs space-y-1">
            <p className="font-bold">Map didn't load</p>
            <p className="opacity-90">
              {tokenMissing
                ? "Mapbox token missing in this deployment."
                : errorMsg}
            </p>
            <p className="opacity-70">The page still works for adding items.</p>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Stable cache key for a day's Directions route — combines day date with
 * its ordered coords (rounded to ~10m precision) so adding / removing /
 * reordering items invalidates the cached route but trivial re-renders
 * don't.
 */
function routeKey(day: string, items: PlanMapItem[]): string {
  return (
    day +
    "|" +
    items
      .map((i) => `${i.lng.toFixed(4)},${i.lat.toFixed(4)}`)
      .join(";")
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
