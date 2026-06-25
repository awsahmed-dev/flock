"use client";

import { useEffect, useState } from "react";
import { buildGlassDisplacementMap } from "@/lib/glass/displacement-map";

/**
 * Mounts the app-wide liquid-glass SVG filter and arms the refraction.
 *
 * Pipeline (Outpace "Liquid glass for the web"):
 *   computed displacement map (blob: URL)  →  feImage  →  feDisplacementMap
 *
 * The `.glass-*` materials in globals.css reference `url(#paxawa-glass)` inside
 * `backdrop-filter`, but ONLY under `html.glass-ready`. We add that class only
 * after the filter is in the DOM, so:
 *   - there's never a frame where the CSS points at a filter id that doesn't
 *     exist yet (which Chromium would render as a dropped backdrop-filter), and
 *   - SSR/first paint shows the plain blur+specular material, then the bend
 *     switches on cleanly once the map is generated.
 *
 * Chromium runs the SVG part of backdrop-filter on the GPU, so the backdrop
 * actually bends. Safari and Firefox accept `backdrop-filter` but silently drop
 * its `url()` part — they keep the blur + the CSS specular rim, which is still
 * a premium material (true cross-browser bend on the photo surfaces comes from
 * the GlassScene/GlassLens copy-lens, not from here).
 *
 * Accessibility: with prefers-reduced-transparency / prefers-reduced-motion we
 * never generate the map or arm `glass-ready`, so the `.glass-*` reduced media
 * query keeps its opaque, motion-free fallback.
 */
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
    if (!url) return;
    setMapUrl(url);
  }, []);

  // Arm the refraction the frame after the filter element is committed to the
  // DOM, then disarm + revoke the blob on unmount.
  useEffect(() => {
    if (!mapUrl) return;
    const id = requestAnimationFrame(() =>
      document.documentElement.classList.add("glass-ready"),
    );
    return () => {
      cancelAnimationFrame(id);
      document.documentElement.classList.remove("glass-ready");
      URL.revokeObjectURL(mapUrl);
    };
  }, [mapUrl]);

  if (!mapUrl) return null;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
    >
      <defs>
        <filter
          id="paxawa-glass"
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={mapUrl}
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale="26"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
