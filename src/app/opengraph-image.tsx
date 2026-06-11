import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Paxawa — Plan group trips, vote together, split expenses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * B26: dynamically generated default OG image for the marketing surface.
 * Next.js auto-discovers this file (one of the metadata file conventions)
 * and injects og:image / og:image:width / og:image:height meta tags into
 * the <head> for the root segment. All child routes that don't override
 * inherit this image. We removed the static /og-default.png reference
 * from layout metadata because the file convention takes precedence and
 * keeping both produced duplicate <meta> tags.
 *
 * Pure black background to match the landing's brand identity, with a
 * warm gradient blob bottom-right echoing the aurora used on the hero +
 * closing CTA so social-shared links visually tie back to the site.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Aurora glow — softer warm blob bottom-right */}
        <div
          style={{
            position: "absolute",
            right: -200,
            bottom: -200,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background:
              "radial-gradient(closest-side, rgba(244, 114, 182, 0.55), rgba(99, 102, 241, 0.35), transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        {/* Top — small wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: -0.5,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background:
                "linear-gradient(135deg, #818cf8, #c084fc 50%, #fda4af)",
              display: "flex",
            }}
          />
          paxawa
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: -3,
              lineHeight: 1.05,
              maxWidth: 1000,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span>Plan the trip.</span>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>
              Not the group chat.
            </span>
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.65)",
              maxWidth: 880,
              lineHeight: 1.4,
            }}
          >
            Shared itinerary · group voting · multi-currency expenses · packing.
          </div>
        </div>

        {/* Bottom — URL pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            alignSelf: "flex-start",
            padding: "10px 18px",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 9999,
            background: "rgba(255,255,255,0.04)",
            fontSize: 22,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 9999,
              background: "#34d399",
              display: "flex",
            }}
          />
          paxawa.com
        </div>
      </div>
    ),
    { ...size },
  );
}
