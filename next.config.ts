import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js 16 we're aware of the webpack/turbopack coexistence
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // ── Security headers ────────────────────────────────────────────────────
  // Applied to every route. CSP is intentionally NOT here yet — locking it
  // down properly needs an inventory of every inline script + supabase /
  // sentry / google maps origin we connect to. Doing it without testing is
  // a great way to break the entire site, so it's tracked as a follow-up.
  async headers() {
    const security = [
      // Block this site from being framed (clickjacking defense).
      { key: "X-Frame-Options", value: "DENY" },
      // Don't let browsers MIME-sniff a response away from its declared type.
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Send only the origin (not full path/query) on cross-origin nav.
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Disable APIs we don't use. Keeps third-party iframes / scripts from
      // poking at geolocation, cameras, mics, payments, etc.
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(self), interest-cohort=(), browsing-topics=(), payment=()",
      },
      // Tell browsers to keep us on HTTPS for the next year (incl. subdomains).
      // Vercel terminates TLS, so this is safe; preload only once we move to
      // a custom domain so we don't lock in flock-pi-six.vercel.app.
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      },
      // Cross-Origin-Opener-Policy: protects against window.opener attacks
      // and enables SharedArrayBuffer if we ever need it.
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];

    return [
      {
        source: "/:path*",
        headers: security,
      },
    ];
  },
};

// Only wrap with PWA in production (Turbopack handles dev fine without it)
async function buildConfig() {
  let cfg: NextConfig = nextConfig;

  if (process.env.NODE_ENV === "production") {
    const withPWAInit = (await import("@ducanh2912/next-pwa")).default;
    const withPWA = withPWAInit({
      dest: "public",
      cacheOnFrontEndNav: true,
      aggressiveFrontEndNavCaching: true,
      reloadOnOnline: true,
      // P6 offline: serve a branded fallback when navigating to an uncached
      // route while offline. Pages already opened (trips, dashboard) are cached
      // by the SW and render from cache.
      fallbacks: { document: "/~offline" },
      // Keep next-pwa's solid defaults (static assets, fonts, RSC, same-origin
      // images) AND add the cross-origin sources an added itinerary needs to
      // render offline: Mapbox tiles/styles + the Google place-photo proxy.
      extendDefaultRuntimeCaching: true,
      workboxOptions: {
        disableDevLogs: true,
        runtimeCaching: [
          {
            // Mapbox styles, fonts, sprites + vector/raster tiles.
            urlPattern: /^https:\/\/(?:api|[a-d]\.tiles)\.mapbox\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "mapbox",
              expiration: { maxEntries: 800, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Our same-origin Google place-photo proxy — immutable per ref, so
            // CacheFirst both makes itinerary photos work offline AND avoids
            // re-billing the Google photo call on repeat views.
            urlPattern: /\/api\/discover\/photo/i,
            handler: "CacheFirst",
            options: {
              cacheName: "place-photos",
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Unsplash destination/hero imagery.
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "unsplash",
              expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    });
    cfg = withPWA(nextConfig) as NextConfig;
  }

  // Sentry source-map upload at build time so production stack traces are
  // readable. Skipped automatically when SENTRY_AUTH_TOKEN is unset (local
  // dev, preview builds without secrets) — no error, just no upload.
  if (process.env.SENTRY_AUTH_TOKEN) {
    const { withSentryConfig } = await import("@sentry/nextjs");
    cfg = withSentryConfig(cfg, {
      org: "paxawa",
      project: "javascript-nextjs",
      silent: !process.env.CI,
      // Upload a larger set of source maps for better stack traces.
      widenClientFileUpload: true,
      // Tunnel Sentry traffic through our own domain to dodge ad blockers
      // (small chance, but it's free).
      tunnelRoute: "/monitoring",
      // Strip source map comments from the client bundle once upload is
      // done — Sentry has them, browsers don't need them.
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      disableLogger: true,
      // Tag the release so Sentry groups errors by deploy.
      release: {
        name: process.env.VERCEL_GIT_COMMIT_SHA,
      },
    });
  }

  return cfg;
}

export default buildConfig();
