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
