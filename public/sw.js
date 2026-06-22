/*
 * Paxawa service worker (P6 offline) — hand-rolled because next-pwa is a webpack
 * plugin that generates nothing under Next 16's Turbopack build. This is the
 * spotty-signal safety net that started the v2 pivot: an itinerary you've opened
 * keeps working offline, with its map tiles and place photos.
 *
 * Strategy:
 *   - Mapbox tiles/styles, place-photo proxy, Unsplash  → cache-first (survive offline,
 *     and the photo proxy cache also avoids re-billing the Google photo call).
 *   - Same-origin pages + RSC/data GETs  → network-first, fall back to cache, then /~offline.
 *   - Static build assets (_next/static, fonts, images)  → stale-while-revalidate.
 *   - Everything else (POST, /api mutations, supabase, sentry, analytics)  → untouched.
 * Online behaviour is unchanged everywhere: network-first only uses the cache when the
 * network actually fails.
 */

const VERSION = "paxawa-sw-v1";
const C = {
  pages: "pax-pages",
  mapbox: "pax-mapbox",
  photos: "pax-photos",
  images: "pax-images",
  static: "pax-static",
};
const OFFLINE_URL = "/~offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(C.pages);
      try {
        await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      } catch (_) {
        /* offline page will still be fetched on demand */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set(Object.values(C));
      const names = await caches.keys();
      await Promise.all(
        names.map((n) => (n.startsWith("pax-") && !keep.has(n) ? caches.delete(n) : null)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }

  // Cross-origin caches we explicitly own.
  if (/^(?:api|[a-d]\.tiles)\.mapbox\.com$/i.test(url.hostname)) {
    event.respondWith(cacheFirst(req, C.mapbox));
    return;
  }
  if (url.hostname === "images.unsplash.com") {
    event.respondWith(staleWhileRevalidate(req, C.images));
    return;
  }

  // Beyond here, only touch our own origin.
  if (url.origin !== self.location.origin) return;

  // Google place-photo proxy — immutable per ref.
  if (url.pathname.startsWith("/api/discover/photo")) {
    event.respondWith(cacheFirst(req, C.photos));
    return;
  }
  // Leave all other API + monitoring traffic to the network.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/monitoring")) return;

  // Hashed build assets + fonts/images — safe to cache aggressively.
  if (
    url.pathname.startsWith("/_next/static") ||
    /\.(?:js|css|woff2?|ttf|png|jpe?g|svg|webp|gif|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(req, C.static));
    return;
  }

  // Document navigations + RSC/data GETs → network-first with offline fallback.
  event.respondWith(networkFirstPage(req));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const fallback = await cache.match(req);
    if (fallback) return fallback;
    throw err;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetching = fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fetching;
}

async function networkFirstPage(req) {
  const cache = await caches.open(C.pages);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    if (req.mode === "navigate") {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

void VERSION;
