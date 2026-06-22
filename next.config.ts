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

  // NOTE: `@ducanh2912/next-pwa` is a webpack plugin and generates nothing under
  // Next 16's Turbopack build (verified: /sw.js was 404, zero SWs registered).
  // Offline is delivered instead by a hand-rolled static worker at
  // `public/sw.js`, registered by <RegisterSW/> — Turbopack-proof and fully
  // under our control (runtime caching for Mapbox tiles + the place-photo proxy
  // + Unsplash, network-first pages, /~offline fallback).

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
