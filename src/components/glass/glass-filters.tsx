"use client";

import { useEffect, useState } from "react";
import { buildGlassDisplacementMap } from "@/lib/glass/displacement-map";

/**
 * Mounts the app-wide liquid-glass material + SVG filter.
 *
 * Pipeline (Outpace "Liquid glass for the web"):
 *   computed displacement map (blob: URL)  →  feImage  →  feDisplacementMap
 *
 * WHY THE backdrop-filter LIVES HERE, NOT IN globals.css: the Next/Tailwind v4
 * build runs styles through Lightning CSS, which STRIPS hand-authored
 * `backdrop-filter` declarations from our `.glass-*` rules — they ship as empty
 * `{}` and the glass renders flat (no blur, no refraction). Injecting the rule
 * from a runtime <style> (which the bundler never processes) is the reliable
 * way to get a real `backdrop-filter` — including the `url(#paxawa-glass)`
 * refraction — onto the elements. The fill, specular rim and a11y fallback stay
 * in globals.css; only the blur/refraction is injected here.
 *
 * Chromium runs the SVG part of backdrop-filter on the GPU, so the backdrop
 * actually bends at the rim. Safari/Firefox read the `-webkit-` line (blur +
 * saturate, no url) and keep a premium frosted material; their true cross-
 * browser bend comes from the GlassScene/GlassLens copy-lens, not from here.
 *
 * Accessibility: under prefers-reduced-transparency / prefers-reduced-motion we
 * render nothing — no map, no injected blur — so the `.glass-*` reduced-media
 * fallback in globals.css keeps its opaque, motion-free material.
 */
const GLASS_CSS = `
.glass-dark,.glass-light{backdrop-filter:blur(7px) saturate(1.5) url(#paxawa-glass);-webkit-backdrop-filter:blur(7px) saturate(1.5)}
`;

export function GlassFilters() {
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-transparency: reduce), (prefers-reduced-motion: reduce)",
    );
    if (reduce.matches) return;

    let url: string | null = null;
    try {
      url = buildGlassDisplacementMap({ gain: 1 });
    } catch {
      url = null;
    }
    if (url) setMapUrl(url);
  }, []);

  useEffect(() => {
    if (!mapUrl) return;
    return () => URL.revokeObjectURL(mapUrl);
  }, [mapUrl]);

  if (!mapUrl) return null;

  return (
    <>
      {/* Runtime <style> — bypasses Lightning CSS so backdrop-filter survives. */}
      <style dangerouslySetInnerHTML={{ __html: GLASS_CSS }} />
      <svg
        aria-hidden="true"
        focusable="false"
        style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
      >
        <defs>
          {/* Filter region == the element's bounding box, map filling it 1:1,
              so the map's rounded-rect rim lands exactly on the element's rim
              (a larger region pushes the bend ring outside and it reads flat).
              scale = the px throw at the rim; tune for taste. */}
          <filter
            id="paxawa-glass"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href={mapUrl}
              x="0%"
              y="0%"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="map"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale="20"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    </>
  );
}
