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
  if (process.env.NODE_ENV === "production") {
    const withPWAInit = (await import("@ducanh2912/next-pwa")).default;
    const withPWA = withPWAInit({
      dest: "public",
      cacheOnFrontEndNav: true,
      aggressiveFrontEndNavCaching: true,
      reloadOnOnline: true,
      workboxOptions: { disableDevLogs: true },
    });
    return withPWA(nextConfig);
  }
  return nextConfig;
}

export default buildConfig();
